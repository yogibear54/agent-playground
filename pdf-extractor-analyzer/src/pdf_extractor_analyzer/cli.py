from __future__ import annotations

import argparse
import asyncio
import importlib
import json
import sys
import warnings
from pathlib import Path

from pydantic import BaseModel

from .config import (
    CacheMode,
    ExtractorConfig,
    OpenRouterProviderConfig,
    ReplicateProviderConfig,
)
from .pipeline import PDFExtractor
from .schemas import ExtractionMode


def _schema_from_import(path: str) -> type[BaseModel]:
    if ":" not in path:
        raise ValueError("Schema import must be in format 'module.submodule:ClassName'")
    module_name, class_name = path.split(":", maxsplit=1)
    module = importlib.import_module(module_name)
    schema_class = getattr(module, class_name, None)
    if schema_class is None:
        raise ValueError(f"Schema class '{class_name}' not found in module '{module_name}'")
    if not isinstance(schema_class, type) or not issubclass(schema_class, BaseModel):
        raise ValueError("Schema class must inherit from pydantic.BaseModel")
    return schema_class


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Extract and analyze PDFs with vision models")
    parser.add_argument("pdf_paths", nargs="+", help="One or more PDF file paths")
    parser.add_argument(
        "--mode",
        default=ExtractionMode.FULL_TEXT.value,
        choices=[m.value for m in ExtractionMode],
        help="Extraction mode",
    )
    parser.add_argument(
        "--provider",
        default="replicate",
        help="LLM provider (e.g. replicate, openrouter)",
    )
    parser.add_argument(
        "--model",
        default=None,
        help=(
            "Primary model (default: openai/gpt-4o for replicate, "
            f"{ExtractorConfig.OPENROUTER_DEFAULT_MODEL} for openrouter)"
        ),
    )
    parser.add_argument(
        "--fallback-model",
        default=None,
        help=(
            "Fallback model (default: openai/gpt-4o-mini for replicate; "
            "openrouter uses config default when omitted)"
        ),
    )
    parser.add_argument("--dpi", type=int, default=150, help="DPI for PDF image conversion")
    parser.add_argument(
        "--image-max-long-edge",
        type=int,
        default=None,
        help="Optional cap on rendered page image size (max of width/height in pixels)",
    )
    parser.add_argument(
        "--cache-mode",
        default=CacheMode.PERSISTENT.value,
        choices=[m.value for m in CacheMode],
        help="Cache behavior",
    )
    parser.add_argument("--cache-dir", default="./cache", help="Cache directory path")
    parser.add_argument("--cache-ttl-days", type=int, default=7, help="Persistent cache TTL")
    parser.add_argument("--schema-import", help="Pydantic schema import path: module:ClassName")
    parser.add_argument("--max-pages", type=int, default=None, help="Optional page limit")
    parser.add_argument("--max-workers", type=int, default=4, help="Parallel workers for multiple PDFs")
    parser.add_argument(
        "--max-concurrent-pages",
        type=int,
        default=4,
        help="Per-document async page concurrency limit",
    )
    parser.add_argument(
        "--max-concurrent-replicate-calls",
        type=int,
        default=None,
        help="[Deprecated] Max concurrent Replicate submissions when using sync run",
    )
    parser.add_argument(
        "--replicate-max-concurrent-calls",
        type=int,
        default=None,
        help="Replicate max concurrent submissions when sync fallback is used",
    )
    parser.add_argument(
        "--replicate-api-token",
        default=None,
        help="Replicate API token (overrides REPLICATE_API_TOKEN)",
    )
    parser.add_argument(
        "--openrouter-api-key",
        default=None,
        help="OpenRouter API key (overrides OPENROUTER_API_KEY)",
    )
    parser.add_argument(
        "--openrouter-base-url",
        default="https://openrouter.ai/api/v1",
        help="OpenRouter API base URL",
    )
    parser.add_argument(
        "--async-rps",
        type=float,
        default=8.0,
        help="Per-document async request rate limit (requests/second)",
    )
    parser.add_argument(
        "--stop-on-error",
        action="store_true",
        help="Stop batch processing on first error",
    )
    parser.add_argument("--output", help="Output file path for result JSON")
    parser.add_argument(
        "--pretty",
        action="store_true",
        help="Print indented JSON output",
    )
    parser.add_argument(
        "--async",
        dest="use_async",
        action="store_true",
        help="Use async extraction pipeline",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    try:
        mode = ExtractionMode(args.mode)
        schema_class: type[BaseModel] | None = None
        if mode == ExtractionMode.STRUCTURED:
            if not args.schema_import:
                parser.error("Structured mode requires --schema-import module:ClassName")
            schema_class = _schema_from_import(args.schema_import)

        if args.max_concurrent_replicate_calls is not None:
            warnings.warn(
                "--max-concurrent-replicate-calls is deprecated; "
                "use --replicate-max-concurrent-calls instead",
                DeprecationWarning,
                stacklevel=2,
            )

        replicate_max_calls = (
            args.replicate_max_concurrent_calls
            if args.replicate_max_concurrent_calls is not None
            else args.max_concurrent_replicate_calls
        )
        if replicate_max_calls is None:
            replicate_max_calls = 1

        provider_key = args.provider.strip().lower()
        # When --model is omitted, use values that let ExtractorConfig pick provider defaults:
        # - replicate: historical CLI default was openai/gpt-4o
        # - openrouter: LEGACY_DEFAULT_MODEL so get_primary_model() returns OPENROUTER_DEFAULT_MODEL
        if args.model is None:
            resolved_model = (
                ExtractorConfig.LEGACY_DEFAULT_MODEL
                if provider_key == "openrouter"
                else "openai/gpt-4o"
            )
        else:
            resolved_model = args.model

        resolved_fallback = (
            ExtractorConfig.LEGACY_DEFAULT_FALLBACK_MODEL
            if args.fallback_model is None
            else args.fallback_model
        )

        config = ExtractorConfig(
            dpi=args.dpi,
            image_max_long_edge=args.image_max_long_edge,
            cache_mode=CacheMode(args.cache_mode),
            cache_dir=Path(args.cache_dir),
            cache_ttl_days=args.cache_ttl_days,
            provider=args.provider,
            model=resolved_model,
            fallback_model=resolved_fallback,
            max_pages=args.max_pages,
            max_concurrent_pages=args.max_concurrent_pages,
            max_concurrent_replicate_calls=replicate_max_calls,
            replicate_api_token=args.replicate_api_token,
            replicate=ReplicateProviderConfig(
                api_token=args.replicate_api_token,
                max_concurrent_calls=replicate_max_calls,
            ),
            openrouter=OpenRouterProviderConfig(
                api_key=args.openrouter_api_key,
                base_url=args.openrouter_base_url,
            ),
            async_requests_per_second=args.async_rps,
        )

        extractor = PDFExtractor(config)
        if args.use_async:
            if len(args.pdf_paths) == 1:
                result = asyncio.run(
                    extractor.extract_async(args.pdf_paths[0], mode=mode, schema=schema_class)
                )
                payload = result.model_dump()
            else:
                results = asyncio.run(
                    extractor.extract_many_async(
                        args.pdf_paths,
                        mode=mode,
                        schema=schema_class,
                        max_workers=args.max_workers,
                        continue_on_error=not args.stop_on_error,
                    )
                )
                payload = [item.model_dump() for item in results]
        else:
            if len(args.pdf_paths) == 1:
                result = extractor.extract(args.pdf_paths[0], mode=mode, schema=schema_class)
                payload = result.model_dump()
            else:
                results = extractor.extract_many(
                    args.pdf_paths,
                    mode=mode,
                    schema=schema_class,
                    max_workers=args.max_workers,
                    continue_on_error=not args.stop_on_error,
                )
                payload = [item.model_dump() for item in results]

        text = json.dumps(payload, indent=2 if args.pretty else None)
        if args.output:
            Path(args.output).write_text(text, encoding="utf-8")
        else:
            sys.stdout.write(text)
            if not text.endswith("\n"):
                sys.stdout.write("\n")

        return 0

    except KeyboardInterrupt:
        return 130  # 128 + SIGINT(2) - standard convention for SIGINT
    except (ValueError, TypeError) as exc:
        # Argument/validation errors - print to stderr
        sys.stderr.write(f"Error: {exc}\n")
        return 2
    except Exception as exc:
        # Unexpected errors - print to stderr with full traceback
        import traceback
        sys.stderr.write(f"Error: {exc}\n")
        sys.stderr.write(traceback.format_exc())
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
