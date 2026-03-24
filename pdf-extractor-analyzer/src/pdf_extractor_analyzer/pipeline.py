from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from pydantic import BaseModel, ValidationError

from .analyzer import ReplicateVisionAnalyzer
from .cache import CacheManager, CacheMetadata, compute_content_hash
from .config import CacheMode, ExtractorConfig
from .converter import PDFConverter
from .exceptions import SchemaValidationError
from .schemas import BatchExtractionItem, BatchItemStatus, ExtractionMode, ExtractionResult


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

    def extract(
        self,
        pdf_path: str | Path,
        *,
        mode: ExtractionMode,
        schema: type[BaseModel] | None = None,
    ) -> ExtractionResult:
        path = Path(pdf_path).expanduser().resolve()
        if not path.exists():
            raise FileNotFoundError(f"PDF not found: {path}")

        if mode == ExtractionMode.STRUCTURED and schema is None:
            raise ValueError("Structured mode requires a Pydantic schema class")

        source_hash = compute_content_hash(path)
        schema_json = schema.model_json_schema() if schema is not None else None

        work_dir = self.cache.resolve_work_dir(source_hash)

        try:
            pages = self._prepare_pages(path=path, source_hash=source_hash, work_dir=work_dir)

            page_outputs: list[str | dict[str, Any]] = []
            for page in pages:
                page_outputs.append(
                    self.analyzer.analyze_page(
                        image_bytes=page.image_bytes,
                        mode=mode,
                        structured_schema=schema_json,
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
