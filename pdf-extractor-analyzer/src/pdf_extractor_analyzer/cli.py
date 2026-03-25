from __future__ import annotations

import argparse
import importlib
import json
import sys
from pathlib import Path

from pydantic import BaseModel

from .config import CacheMode, ExtractorConfig
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
    parser.add_argument("--model", default="openai/gpt-4o", help="Primary Replicate model")
    parser.add_argument("--fallback-model", default="openai/gpt-4o-mini", help="Fallback model")
    parser.add_argument("--dpi", type=int, default=150, help="DPI for PDF image conversion")
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

        config = ExtractorConfig(
            dpi=args.dpi,
            cache_mode=CacheMode(args.cache_mode),
            cache_dir=Path(args.cache_dir),
            cache_ttl_days=args.cache_ttl_days,
            model=args.model,
            fallback_model=args.fallback_model,
            max_pages=args.max_pages,
        )

        extractor = PDFExtractor(config)
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
