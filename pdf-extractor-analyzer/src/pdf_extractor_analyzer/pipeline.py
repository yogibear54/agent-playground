from __future__ import annotations

import asyncio
import json
import logging
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, AsyncIterator

from pydantic import BaseModel, ValidationError

from .analyzer import VisionAnalyzer
from .cache import CacheManager, CacheMetadata, compute_content_hash
from .config import CacheMode, ExtractorConfig
from .converter import PDFConverter
from .exceptions import SchemaValidationError, ValidationError
from .provider_factory import create_llm_provider
from .schemas import BatchExtractionItem, BatchItemStatus, ExtractionMode, ExtractionResult

# Module logger
logger = logging.getLogger(__name__)


class AsyncRateLimiter:
    """Simple per-document async rate limiter."""

    def __init__(self, requests_per_second: float):
        self._min_interval = 1.0 / requests_per_second
        self._lock = asyncio.Lock()
        self._next_allowed = 0.0

    async def acquire(self) -> None:
        async with self._lock:
            loop = asyncio.get_running_loop()
            now = loop.time()
            wait_for = self._next_allowed - now
            if wait_for > 0:
                await asyncio.sleep(wait_for)
                now = loop.time()
            self._next_allowed = now + self._min_interval


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
        self.analyzer = VisionAnalyzer(self.config, provider=create_llm_provider(self.config))

    def cleanup_persistent_cache(self) -> int:
        return self.cache.cleanup_expired()

    def _cache_metadata(self, **kwargs: Any) -> CacheMetadata:
        metadata = CacheMetadata(**kwargs)
        metadata.image_max_long_edge = self.config.image_max_long_edge
        return metadata

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

    def _make_worker(self) -> PDFExtractor:
        """Create an isolated worker sharing analyzer but with independent cache manager."""
        worker = PDFExtractor.__new__(PDFExtractor)
        worker.config = self.config
        worker.analyzer = self.analyzer
        worker.converter = PDFConverter()
        worker.cache = CacheManager(
            base_cache_dir=self.config.cache_dir,
            mode=self.config.cache_mode,
            ttl_days=self.config.cache_ttl_days,
        )
        return worker

    def _run_single_batch_item(
        self,
        path: Path,
        mode: ExtractionMode,
        schema: type[BaseModel] | None,
    ) -> ExtractionResult:
        worker = self._make_worker()
        return worker.extract(path, mode=mode, schema=schema)

    async def _run_single_batch_item_async(
        self,
        path: Path,
        mode: ExtractionMode,
        schema: type[BaseModel] | None,
    ) -> ExtractionResult:
        worker = self._make_worker()
        return await worker.extract_async(path, mode=mode, schema=schema)

    async def extract_many_async(
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
        semaphore = asyncio.Semaphore(max_workers)

        async def process(idx: int, path: Path) -> tuple[int, BatchExtractionItem]:
            async with semaphore:
                try:
                    result = await self._run_single_batch_item_async(path, mode, schema)
                    item = BatchExtractionItem(
                        pdf_path=str(path),
                        status=BatchItemStatus.SUCCESS,
                        result=result,
                    )
                except Exception as exc:
                    if not continue_on_error:
                        raise
                    item = BatchExtractionItem(
                        pdf_path=str(path),
                        status=BatchItemStatus.ERROR,
                        error=str(exc),
                    )
                return idx, item

        tasks = [asyncio.create_task(process(idx, path)) for idx, path in enumerate(normalized_paths)]

        if continue_on_error:
            completed = await asyncio.gather(*tasks)
        else:
            completed = await asyncio.gather(*tasks)

        ordered = [item for _, item in sorted(completed, key=lambda entry: entry[0])]
        return ordered

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
            "provider": self.config.provider,
            "model": self.config.model,
            "max_pages": self.config.max_pages,
            "generation": {
                "max_completion_tokens": self.config.max_completion_tokens,
                "temperature": self.config.temperature,
                "top_p": self.config.top_p,
                "presence_penalty": self.config.presence_penalty,
                "frequency_penalty": self.config.frequency_penalty,
            },
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
                            "provider": self.config.provider,
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
                    "provider": self.config.provider,
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

                # Additionally save markdown file for markdown mode
                if mode == ExtractionMode.MARKDOWN and isinstance(content, str):
                    md_path = self.cache.content_md_path(work_dir)
                    md_path.write_text(content, encoding="utf-8")
                    logger.info(
                        "Saved markdown file",
                        extra={
                            "pdf_path": str(path),
                            "source_hash": source_hash,
                            "markdown_path": str(md_path),
                        },
                    )

            return result
        finally:
            self.cache.cleanup()

    async def extract_async(
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

        if (
            self.config.cache_mode == CacheMode.PERSISTENT
            and work_dir is not None
            and not self.config.force_conversion
        ):
            cached_content = self.cache.read_content(work_dir)
            if cached_content is not None and cached_content.get("extraction_params", {}) == extraction_params:
                return ExtractionResult(
                    extraction_mode=mode,
                    content=cached_content["content"],
                    metadata={
                        "source_hash": source_hash,
                        "page_count": cached_content.get("page_count", 0),
                        "provider": self.config.provider,
                        "model": self.config.model,
                        "cache_mode": self.config.cache_mode.value,
                        "generated_at": cached_content.get("cached_at"),
                        "from_cache": True,
                    },
                )

        correlation_id = str(uuid.uuid4())[:8]

        try:
            pages = self._prepare_pages(path=path, source_hash=source_hash, work_dir=work_dir)
            semaphore = asyncio.Semaphore(self.config.max_concurrent_pages)
            rate_limiter = AsyncRateLimiter(self.config.async_requests_per_second)

            async def process_page(page_index: int, image_bytes: bytes) -> tuple[int, str | dict[str, Any] | None, str | None]:
                async with semaphore:
                    try:
                        output = await self.analyzer.analyze_page_async(
                            image_bytes=image_bytes,
                            mode=mode,
                            structured_schema=schema_json,
                            correlation_id=correlation_id,
                            page_number=page_index,
                            rate_limit_coro=rate_limiter.acquire,
                        )
                        return page_index, output, None
                    except Exception as exc:
                        return page_index, None, str(exc)

            tasks = [
                asyncio.create_task(process_page(page.page_number, page.image_bytes))
                for page in pages
            ]
            completed = await asyncio.gather(*tasks)
            completed.sort(key=lambda entry: entry[0])

            page_numbers: list[int] = []
            page_outputs: list[str | dict[str, Any]] = []
            page_errors: list[dict[str, Any]] = []
            for page_number, output, error in completed:
                if error is not None:
                    page_errors.append({"page": page_number, "error": error})
                    continue
                if output is not None:
                    page_numbers.append(page_number)
                    page_outputs.append(output)

            schema_validation_error: str | None = None
            try:
                content = await self._aggregate_outputs_async(
                    outputs=page_outputs,
                    mode=mode,
                    schema=schema,
                    schema_json=schema_json,
                    page_numbers=page_numbers,
                )
            except SchemaValidationError as exc:
                if mode != ExtractionMode.STRUCTURED:
                    raise
                schema_validation_error = str(exc)
                content = self._merge_dicts([value for value in page_outputs if isinstance(value, dict)])

            metadata: dict[str, Any] = {
                "source_hash": source_hash,
                "page_count": len(pages),
                "successful_pages": len(page_outputs),
                "provider": self.config.provider,
                "model": self.config.model,
                "cache_mode": self.config.cache_mode.value,
                "generated_at": datetime.now(UTC).isoformat(),
                "correlation_id": correlation_id,
            }
            if page_errors:
                metadata["partial_failure"] = True
                metadata["page_errors"] = page_errors
            if schema_validation_error is not None:
                metadata["schema_validation_error"] = schema_validation_error

            result = ExtractionResult(
                extraction_mode=mode,
                content=content,
                metadata=metadata,
            )

            if (
                self.config.cache_mode == CacheMode.PERSISTENT
                and work_dir is not None
                and not page_errors
            ):
                self.cache.write_content(
                    work_dir,
                    content if isinstance(content, (str, dict)) else json.loads(json.dumps(content)),
                    extraction_params,
                )
                if mode == ExtractionMode.MARKDOWN and isinstance(content, str):
                    self.cache.content_md_path(work_dir).write_text(content, encoding="utf-8")

            return result
        finally:
            self.cache.cleanup()

    async def extract_streaming(
        self,
        pdf_path: str | Path,
        *,
        mode: ExtractionMode,
        schema: type[BaseModel] | None = None,
    ) -> AsyncIterator[tuple[int, str | dict[str, Any] | None, str | None]]:
        path = Path(pdf_path).expanduser().resolve()
        self._validate_pdf_path(path)

        if mode == ExtractionMode.STRUCTURED and schema is None:
            raise ValueError("Structured mode requires a Pydantic schema class")

        source_hash = compute_content_hash(path)
        schema_json = schema.model_json_schema() if schema is not None else None
        work_dir = self.cache.resolve_work_dir(source_hash)
        correlation_id = str(uuid.uuid4())[:8]

        try:
            pages = self._prepare_pages(path=path, source_hash=source_hash, work_dir=work_dir)
            semaphore = asyncio.Semaphore(self.config.max_concurrent_pages)
            rate_limiter = AsyncRateLimiter(self.config.async_requests_per_second)

            async def process_page(page_index: int, image_bytes: bytes) -> tuple[int, str | dict[str, Any] | None, str | None]:
                async with semaphore:
                    try:
                        output = await self.analyzer.analyze_page_async(
                            image_bytes=image_bytes,
                            mode=mode,
                            structured_schema=schema_json,
                            correlation_id=correlation_id,
                            page_number=page_index,
                            rate_limit_coro=rate_limiter.acquire,
                        )
                        return page_index, output, None
                    except Exception as exc:
                        return page_index, None, str(exc)

            tasks = [
                asyncio.create_task(process_page(page.page_number, page.image_bytes))
                for page in pages
            ]

            pending: dict[int, tuple[str | dict[str, Any] | None, str | None]] = {}
            next_page = 1

            for task in asyncio.as_completed(tasks):
                page_number, output, error = await task
                pending[page_number] = (output, error)

                while next_page in pending:
                    next_output, next_error = pending.pop(next_page)
                    yield next_page, next_output, next_error
                    next_page += 1
        finally:
            self.cache.cleanup()

    def _prepare_pages(self, *, path: Path, source_hash: str, work_dir: Path | None):
        if self.config.cache_mode == CacheMode.PERSISTENT and work_dir is not None:
            if not self.config.force_conversion and self.cache.is_cache_hit(
                work_dir,
                source_hash,
                self.config.dpi,
                self.config.max_pages,
                self.config.image_max_long_edge,
            ):
                return self.converter.load_from_dir(work_dir)

            pages = self.converter.convert(
                path,
                self.config.dpi,
                work_dir,
                self.config.max_pages,
                self.config.image_max_long_edge,
                self.config.max_image_width,
                self.config.max_image_height,
            )
            self.cache.write_metadata(
                work_dir,
                self._cache_metadata(
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
            self.config.dpi,
            work_dir,
            self.config.max_pages,
            self.config.image_max_long_edge,
            self.config.max_image_width,
            self.config.max_image_height,
        )

    def _aggregate_outputs(
        self,
        *,
        outputs: list[str | dict[str, Any]],
        mode: ExtractionMode,
        schema: type[BaseModel] | None,
        schema_json: dict[str, Any] | None,
        page_numbers: list[int] | None = None,
    ) -> str | dict[str, Any]:
        numbers = page_numbers or list(range(1, len(outputs) + 1))

        if mode == ExtractionMode.FULL_TEXT:
            chunks = [f"[Page {numbers[idx]}]\n{value}" for idx, value in enumerate(outputs)]
            return "\n\n".join(chunks)

        if mode == ExtractionMode.SUMMARY:
            chunks = [f"Page {numbers[idx]}: {value}" for idx, value in enumerate(outputs)]
            return "\n".join(chunks)

        if mode == ExtractionMode.MARKDOWN:
            chunks = [f"## Page {numbers[idx]}\n\n{value}" for idx, value in enumerate(outputs)]
            return "\n\n---\n\n".join(chunks)

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

    async def _aggregate_outputs_async(
        self,
        *,
        outputs: list[str | dict[str, Any]],
        mode: ExtractionMode,
        schema: type[BaseModel] | None,
        schema_json: dict[str, Any] | None,
        page_numbers: list[int] | None = None,
    ) -> str | dict[str, Any]:
        numbers = page_numbers or list(range(1, len(outputs) + 1))

        if mode == ExtractionMode.FULL_TEXT:
            chunks = [f"[Page {numbers[idx]}]\n{value}" for idx, value in enumerate(outputs)]
            return "\n\n".join(chunks)

        if mode == ExtractionMode.SUMMARY:
            chunks = [f"Page {numbers[idx]}: {value}" for idx, value in enumerate(outputs)]
            return "\n".join(chunks)

        if mode == ExtractionMode.MARKDOWN:
            chunks = [f"## Page {numbers[idx]}\n\n{value}" for idx, value in enumerate(outputs)]
            return "\n\n---\n\n".join(chunks)

        structured_outputs = [value for value in outputs if isinstance(value, dict)]
        merged = self._merge_dicts(structured_outputs)

        if schema is None:
            return merged

        try:
            validated = schema.model_validate(merged)
            return validated.model_dump()
        except ValidationError as exc:
            repaired = await self.analyzer.repair_structured_output_async(
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
                # Use repr() for O(1) lookup and to avoid type coercion issues
                # (e.g., comparing 1 with "1" should not match)
                seen_reprs = set(repr(v) for v in left_value)
                merged[key] = left_value + [v for v in value if repr(v) not in seen_reprs]
            elif left_value in (None, "", [], {}):
                merged[key] = value
        return merged
