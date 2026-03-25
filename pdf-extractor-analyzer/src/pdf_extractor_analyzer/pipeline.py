from __future__ import annotations

import json
import logging
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from pydantic import BaseModel, ValidationError

from .analyzer import ReplicateVisionAnalyzer
from .cache import CacheManager, CacheMetadata, compute_content_hash
from .config import CacheMode, ExtractorConfig
from .converter import PDFConverter
from .exceptions import SchemaValidationError, ValidationError
from .schemas import BatchExtractionItem, BatchItemStatus, ExtractionMode, ExtractionResult

# Module logger
logger = logging.getLogger(__name__)


class PDFExtractor:
    def __init__(self, config: ExtractorConfig | None = None):
        self.config = config or ExtractorConfig()
        self.config.validate()

        self.converter = PDFConverter()
        self.cache = CacheManager(
            base_cache_dir=self.config.cache_dir,
            mode=self.config.cache_mode,
            ttl_days=self.config.cache_ttl_days,
        )
        self.analyzer = ReplicateVisionAnalyzer(self.config)

    def cleanup_persistent_cache(self) -> int:
        return self.cache.cleanup_expired()

    def extract_many(
        self,
        pdf_paths: list[str | Path],
        *,
        mode: ExtractionMode,
        schema: type[BaseModel] | None = None,
        max_workers: int = 4,
        continue_on_error: bool = True,
    ) -> list[BatchExtractionItem]:
        if max_workers < 1:
            raise ValueError("max_workers must be >= 1")
        if not pdf_paths:
            return []

        normalized_paths = [Path(p).expanduser().resolve() for p in pdf_paths]
        results: list[BatchExtractionItem | None] = [None] * len(normalized_paths)

        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = {
                executor.submit(self._run_single_batch_item, path, mode, schema): idx
                for idx, path in enumerate(normalized_paths)
            }

            for future in as_completed(futures):
                idx = futures[future]
                path = normalized_paths[idx]
                try:
                    result = future.result()
                    results[idx] = BatchExtractionItem(
                        pdf_path=str(path),
                        status=BatchItemStatus.SUCCESS,
                        result=result,
                    )
                except Exception as exc:
                    if not continue_on_error:
                        raise
                    results[idx] = BatchExtractionItem(
                        pdf_path=str(path),
                        status=BatchItemStatus.ERROR,
                        error=str(exc),
                    )

        return [item for item in results if item is not None]

    def _run_single_batch_item(
        self,
        path: Path,
        mode: ExtractionMode,
        schema: type[BaseModel] | None,
    ) -> ExtractionResult:
        worker = PDFExtractor(self.config)
        return worker.extract(path, mode=mode, schema=schema)

    def _validate_pdf_path(self, path: Path) -> None:
        """Validate PDF path for security and format compliance.

        Raises:
            ValidationError: If path is invalid or file is not a valid PDF.
        """
        # Check for path traversal attempts
        try:
            resolved = path.resolve()
        except (OSError, ValueError) as exc:
            raise ValidationError(
                f"Invalid path: {path}", field="pdf_path", value=str(path)
            ) from exc

        # Security check: ensure resolved path stays within the allowed root
        # (current working directory by default, preventing /etc/passwd style attacks)
        allowed_root = Path.cwd()
        try:
            resolved.relative_to(allowed_root)
        except ValueError:
            raise ValidationError(
                f"Path escapes allowed directory (path traversal detected): {path}",
                field="pdf_path",
                value=str(path),
            )

        # Check file exists and is readable
        if not path.exists():
            raise FileNotFoundError(f"PDF not found: {path}")

        if not path.is_file():
            raise ValidationError(
                f"Path is not a file: {path}", field="pdf_path", value=str(path)
            )

        # Check file size limit
        if self.config.max_pdf_file_size is not None:
            file_size = path.stat().st_size
            if file_size > self.config.max_pdf_file_size:
                raise ValidationError(
                    f"PDF file size ({file_size}) exceeds maximum allowed "
                    f"({self.config.max_pdf_file_size} bytes)",
                    field="pdf_path",
                    value=str(path),
                )

        # Verify PDF magic bytes (starts with %PDF)
        try:
            with path.open("rb") as f:
                header = f.read(4)
                if header != b"%PDF":
                    raise ValidationError(
                        f"File does not appear to be a valid PDF: {path}",
                        field="pdf_path",
                        value=str(path),
                    )
        except (OSError, IOError) as exc:
            raise ValidationError(
                f"Cannot read PDF file: {path}", field="pdf_path", value=str(path)
            ) from exc

    def _get_extraction_params(
        self,
        mode: ExtractionMode,
        schema: type[BaseModel] | None,
    ) -> dict[str, Any]:
        """Build extraction parameters dict for cache invalidation checks."""
        params: dict[str, Any] = {
            "mode": mode.value,
            "model": self.config.model,
            "max_pages": self.config.max_pages,
        }
        if schema is not None:
            params["schema"] = schema.model_json_schema()
        return params

    def extract(
        self,
        pdf_path: str | Path,
        *,
        mode: ExtractionMode,
        schema: type[BaseModel] | None = None,
    ) -> ExtractionResult:
        path = Path(pdf_path).expanduser().resolve()
        self._validate_pdf_path(path)

        if mode == ExtractionMode.STRUCTURED and schema is None:
            raise ValueError("Structured mode requires a Pydantic schema class")

        source_hash = compute_content_hash(path)
        schema_json = schema.model_json_schema() if schema is not None else None
        extraction_params = self._get_extraction_params(mode, schema)

        work_dir = self.cache.resolve_work_dir(source_hash)

        # Check content cache first (for persistent cache mode)
        if (
            self.config.cache_mode == CacheMode.PERSISTENT
            and work_dir is not None
            and not self.config.force_conversion
        ):
            cached_content = self.cache.read_content(work_dir)
            if cached_content is not None:
                cached_params = cached_content.get("extraction_params", {})
                if cached_params == extraction_params:
                    logger.info(
                        "Using cached extraction result",
                        extra={"pdf_path": str(path), "source_hash": source_hash},
                    )
                    return ExtractionResult(
                        extraction_mode=mode,
                        content=cached_content["content"],
                        metadata={
                            "source_hash": source_hash,
                            "page_count": cached_content.get("page_count", 0),
                            "model": self.config.model,
                            "cache_mode": self.config.cache_mode.value,
                            "generated_at": cached_content.get("cached_at"),
                            "from_cache": True,
                        },
                    )

        # Generate correlation ID for this extraction
        correlation_id = str(uuid.uuid4())[:8]
        logger.info(
            "Starting PDF extraction",
            extra={
                "pdf_path": str(path),
                "source_hash": source_hash,
                "correlation_id": correlation_id,
                "mode": mode.value,
            },
        )

        try:
            pages = self._prepare_pages(path=path, source_hash=source_hash, work_dir=work_dir)

            page_outputs: list[str | dict[str, Any]] = []
            for page_num, page in enumerate(pages, start=1):
                page_outputs.append(
                    self.analyzer.analyze_page(
                        image_bytes=page.image_bytes,
                        mode=mode,
                        structured_schema=schema_json,
                        correlation_id=correlation_id,
                        page_number=page_num,
                    )
                )

            content = self._aggregate_outputs(
                outputs=page_outputs,
                mode=mode,
                schema=schema,
                schema_json=schema_json,
            )

            result = ExtractionResult(
                extraction_mode=mode,
                content=content,
                metadata={
                    "source_hash": source_hash,
                    "page_count": len(pages),
                    "model": self.config.model,
                    "cache_mode": self.config.cache_mode.value,
                    "generated_at": datetime.now(UTC).isoformat(),
                    "correlation_id": correlation_id,
                },
            )

            # Save result to content.json for persistent cache
            if self.config.cache_mode == CacheMode.PERSISTENT and work_dir is not None:
                self.cache.write_content(
                    work_dir,
                    content if isinstance(content, (str, dict)) else json.loads(json.dumps(content)),
                    extraction_params,
                )
                logger.info(
                    "Saved extraction result to cache",
                    extra={
                        "pdf_path": str(path),
                        "source_hash": source_hash,
                        "correlation_id": correlation_id,
                    },
                )

            return result
        finally:
            self.cache.cleanup()

    def _prepare_pages(self, *, path: Path, source_hash: str, work_dir: Path | None):
        if self.config.cache_mode == CacheMode.PERSISTENT and work_dir is not None:
            if not self.config.force_conversion and self.cache.is_cache_hit(
                work_dir,
                source_hash=source_hash,
                dpi=self.config.dpi,
                max_pages=self.config.max_pages,
            ):
                return self.converter.load_from_dir(work_dir)

            pages = self.converter.convert(
                path,
                dpi=self.config.dpi,
                output_dir=work_dir,
                max_pages=self.config.max_pages,
                max_image_width=self.config.max_image_width,
                max_image_height=self.config.max_image_height,
            )
            self.cache.write_metadata(
                work_dir,
                CacheMetadata(
                    page_count=len(pages),
                    dpi=self.config.dpi,
                    created_at=datetime.now(UTC).isoformat(),
                    source_hash=source_hash,
                    max_pages=self.config.max_pages,
                ),
            )
            return pages

        return self.converter.convert(
            path,
            dpi=self.config.dpi,
            output_dir=work_dir,
            max_pages=self.config.max_pages,
            max_image_width=self.config.max_image_width,
            max_image_height=self.config.max_image_height,
        )

    def _aggregate_outputs(
        self,
        *,
        outputs: list[str | dict[str, Any]],
        mode: ExtractionMode,
        schema: type[BaseModel] | None,
        schema_json: dict[str, Any] | None,
    ) -> str | dict[str, Any]:
        if mode == ExtractionMode.FULL_TEXT:
            chunks = [f"[Page {idx}]\n{value}" for idx, value in enumerate(outputs, start=1)]
            return "\n\n".join(chunks)

        if mode == ExtractionMode.SUMMARY:
            chunks = [f"Page {idx}: {value}" for idx, value in enumerate(outputs, start=1)]
            return "\n".join(chunks)

        structured_outputs = [value for value in outputs if isinstance(value, dict)]
        merged = self._merge_dicts(structured_outputs)

        if schema is None:
            return merged

        try:
            validated = schema.model_validate(merged)
            return validated.model_dump()
        except ValidationError as exc:
            repaired = self.analyzer.repair_structured_output(
                candidate=merged,
                validation_error=str(exc),
                structured_schema=schema_json,
            )
            try:
                validated = schema.model_validate(repaired)
                return validated.model_dump()
            except ValidationError as second_exc:
                raise SchemaValidationError(
                    "Structured output failed schema validation after repair"
                ) from second_exc

    def _merge_dicts(self, items: list[dict[str, Any]]) -> dict[str, Any]:
        merged: dict[str, Any] = {}
        for item in items:
            merged = self._merge_two(merged, item)
        return merged

    def _merge_two(self, left: dict[str, Any], right: dict[str, Any]) -> dict[str, Any]:
        merged = dict(left)
        for key, value in right.items():
            if key not in merged:
                merged[key] = value
                continue

            left_value = merged[key]
            if isinstance(left_value, dict) and isinstance(value, dict):
                merged[key] = self._merge_two(left_value, value)
            elif isinstance(left_value, list) and isinstance(value, list):
                merged[key] = left_value + [v for v in value if v not in left_value]
            elif left_value in (None, "", [], {}):
                merged[key] = value
        return merged
