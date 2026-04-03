# PDF Extractor Analyzer

Image-first PDF extraction and analysis for mixed or unknown PDF formats.

## Features

- PDF -> page images via PyMuPDF
- Vision analysis via pluggable LLM provider adapters (default provider: `replicate`)
- Modes: `full_text`, `summary`, `structured`, `markdown`
- Structured mode with user-provided Pydantic schema classes
- Markdown mode outputs both `content.json` and `content.md` with LLM-generated Markdown
- Cache modes: `persistent`, `ephemeral`, `disabled`
- Single-document API (`extract`) and multi-document API (`extract_many`)
- CLI and Python library support

## Installation

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
```

Install with Replicate provider support:

```bash
pip install -e ".[replicate]"
```

For development/tests:

```bash
pip install -e ".[dev,replicate]"
```

## Provider Authentication

### Replicate
Set token with environment variable (recommended):

```bash
export REPLICATE_API_TOKEN=your_token
```

Or pass directly in code:

```python
from pdf_extractor_analyzer import ExtractorConfig, ReplicateProviderConfig

config = ExtractorConfig(
    provider="replicate",
    replicate=ReplicateProviderConfig(api_token="your_token"),
)
```

Legacy compatibility is preserved:

```python
config = ExtractorConfig(replicate_api_token="your_token")
```

### OpenRouter
Set API key with environment variable:

```bash
export OPENROUTER_API_KEY=your_key
```

Or pass directly in code:

```python
from pdf_extractor_analyzer import ExtractorConfig, OpenRouterProviderConfig

config = ExtractorConfig(
    provider="openrouter",
    openrouter=OpenRouterProviderConfig(api_key="your_key"),
)
```

## Model selection

Model availability depends on the provider and your account. **Some models are region-locked** (or otherwise restricted), so a model that appears in documentation or the provider’s catalog may still reject requests from your region or billing setup. This tool does not detect region restrictions ahead of time; **if the provider returns an error** (for example access denied or model unavailable), **that error is raised to the caller**—try another model or provider if you hit a restriction.

## CLI Usage

Show help:

```bash
pdf-extractor --help
```

Full text extraction:

```bash
pdf-extractor ./sample-pdfs/sample.pdf --provider replicate --mode full_text --pretty
```

Summary extraction with disabled cache:

```bash
pdf-extractor ./sample-pdfs/sample.pdf --provider replicate --mode summary --cache-mode disabled --pretty
```

Structured extraction with Pydantic schema import:

```bash
pdf-extractor ./sample-pdfs/invoice.pdf --provider replicate --mode structured --schema-import my_schemas:InvoiceSchema --pretty
```

Batch processing (parallel workers):

```bash
pdf-extractor ./sample-pdfs/a.pdf ./sample-pdfs/b.pdf --mode summary --max-workers 2 --pretty
```

Batch processing (async pipeline):

```bash
# Use async for faster concurrent page processing
pdf-extractor ./sample-pdfs/*.pdf --async --mode summary --max-workers 4 --pretty
```

Markdown extraction (saves `content.json` and `content.md`):

```bash
pdf-extractor ./sample-pdfs/sample.pdf --provider replicate --mode markdown --cache-mode persistent --pretty
```

Control rendered page image size:

```bash
# Render at 150dpi, but cap the longest edge (width/height) to 2048px.
pdf-extractor ./sample-pdfs/sample.pdf --provider replicate --mode markdown --dpi 150 --image-max-long-edge 2048 --pretty
```

Fail fast on first batch error:

```bash
pdf-extractor ./sample-pdfs/a.pdf ./sample-pdfs/b.pdf --mode summary --stop-on-error
```

### Provider-Specific Examples

#### OpenRouter with custom model:

```bash
pdf-extractor ./sample-pdfs/sample.pdf \
  --provider openrouter \
  --model openrouter/auto \
  --openrouter-api-key your_key \
  --mode summary --pretty
```

#### Replicate with concurrency control:

```bash
pdf-extractor ./large-document.pdf \
  --provider replicate \
  --replicate-max-concurrent-calls 5 \
  --mode full_text --pretty
```

#### High-throughput batch (async):

```bash
pdf-extractor ./docs/*.pdf \
  --async \
  --max-workers 6 \
  --max-concurrent-pages 10 \
  --async-rps 12.0 \
  --mode summary --pretty
```

## Python Usage

```python
from pydantic import BaseModel

from pdf_extractor_analyzer import (
    CacheMode,
    ExtractionMode,
    ExtractorConfig,
    OpenRouterProviderConfig,
    PDFExtractor,
    ReplicateProviderConfig,
)


class InvoiceSchema(BaseModel):
    vendor_name: str | None = None
    invoice_number: str | None = None
    total_amount: float | None = None


config = ExtractorConfig(
    provider="replicate",
    cache_mode=CacheMode.PERSISTENT,
    replicate=ReplicateProviderConfig(api_token="your_replicate_token"),
)
extractor = PDFExtractor(config)

single = extractor.extract(
    "invoice.pdf",
    mode=ExtractionMode.STRUCTURED,
    schema=InvoiceSchema,
)
print(single.model_dump())

batch = extractor.extract_many(
    ["invoice.pdf", "receipt.pdf"],
    mode=ExtractionMode.SUMMARY,
    max_workers=2,
    continue_on_error=True,
)
for item in batch:
    print(item.model_dump())

# Markdown extraction (outputs both content.json and content.md)
md_result = extractor.extract("document.pdf", mode=ExtractionMode.MARKDOWN)
print(md_result.model_dump())

# Async extraction (faster for multi-page documents)
import asyncio

async def extract_async_example():
    extractor = PDFExtractor(config)
    result = await extractor.extract_async("document.pdf", mode=ExtractionMode.SUMMARY)
    print(result.model_dump())

asyncio.run(extract_async_example())

# Async batch extraction
async def extract_batch_async():
    extractor = PDFExtractor(config)
    results = await extractor.extract_many_async(
        ["invoice.pdf", "receipt.pdf"],
        mode=ExtractionMode.SUMMARY,
        max_workers=4,
        continue_on_error=True,
    )
    for item in results:
        print(item.model_dump())

asyncio.run(extract_batch_async())
```

## Output Shape

Single extraction returns:

```json
{
  "extraction_mode": "summary",
  "content": "...",
  "metadata": {
    "source_hash": "...",
    "page_count": 2,
    "model": "openai/gpt-4o",
    "cache_mode": "persistent",
    "generated_at": "..."
  }
}
```

`metadata.source_hash` is the full SHA-256 hex digest of the PDF (64 characters). When `cache_mode` is `persistent`, files are stored under `cache_dir` in a subdirectory named after the **first 32 characters** of that hash (not the full 64).

Batch extraction returns a list of items:

```json
[
  {
    "pdf_path": "/abs/path/a.pdf",
    "status": "success",
    "result": {"extraction_mode": "summary", "content": "...", "metadata": {}},
    "error": null
  },
  {
    "pdf_path": "/abs/path/b.pdf",
    "status": "error",
    "result": null,
    "error": "..."
  }
]
```

## Cache Modes

- `persistent`: writes/reads cache under `cache_dir`; each PDF’s cache folder is named `source_hash[:32]` (first 32 hex chars of the full 64-char SHA-256 `source_hash`)
- `ephemeral`: temporary per-run cache cleaned automatically
- `disabled`: no cache reads/writes

## Extraction Modes

| Mode | Output | Description |
|------|--------|-------------|
| `full_text` | String | Transcribes all text with layout preservation |
| `summary` | String | 3-5 sentence summary with key details |
| `structured` | JSON dict | Extracts data matching a Pydantic schema |
| `markdown` | String (Markdown) | Converts page to Markdown with proper formatting |

### Markdown Mode

The `markdown` mode instructs the LLM to:
- Use `#` and `##` for headings
- Use `**bold**` for emphasis
- Use bullet points (`-`) and numbered lists
- Use code blocks (` ``` `) for technical content
- Convert tables to Markdown table format
- Preserve document structure and hierarchy

Output is aggregated across pages with `---` separators and page headers (`## Page N`).

## Cached Output Files

When using `cache_mode=persistent`, extraction results are saved to the cache directory:

- `content.json`: Contains the extraction result with `content`, `extraction_params`, and `cached_at` fields
- `content.md`: Created additionally when using `markdown` mode, containing the same content in Markdown format with page separators

The subdirectory name is `source_hash[:32]`—the first 32 hex characters of the full 64-character `source_hash` in metadata (SHA-256 of the PDF bytes).

```
cache/
└── <first 32 chars of source_hash>/
    ├── content.json   # Always created
    ├── content.md     # Only for markdown mode
    ├── metadata.json
    └── page_*.png     # Rendered page images
```

## Provider Architecture

The LLM layer follows a port-and-adapters design:

- Port contract: `src/pdf_extractor_analyzer/ports/llm_provider.py`
- Replicate adapter: `src/pdf_extractor_analyzer/adapters/llm/replicate_adapter.py`
- OpenRouter adapter: `src/pdf_extractor_analyzer/adapters/llm/openrouter_adapter.py`
- Provider factory: `src/pdf_extractor_analyzer/provider_factory.py`

To add a new provider adapter:
1. Implement `LLMProviderPort`
2. Register a provider builder in `provider_factory.py` (or via `register_provider_builder`)
3. Add provider-specific config and CLI flags
4. Add provider-specific tests (unit + optional live integration marker)

## Concurrency Model

The application uses a two-level concurrency model:

### Level 1: Document Concurrency (`--max-workers`)
Controls how many **PDF files** to process in parallel.

```bash
# Process 10 PDFs, 2 at a time (applies to all providers)
pdf-extractor ./docs/*.pdf --mode summary --max-workers 2
```

### Level 2: Page Concurrency (`--max-concurrent-pages`, provider-specific settings)
Controls how many **pages within a document** are processed concurrently.

```bash
# Process 6 pages concurrently (applies to all providers)
pdf-extractor ./doc.pdf --mode full_text --max-concurrent-pages 6
```

### Provider-Specific Concurrency

Different providers handle concurrent API calls differently:

#### Replicate Provider

Replicate uses an internal semaphore controlled by `--replicate-max-concurrent-calls`:

```bash
# Allow 3 parallel Replicate API calls
pdf-extractor ./doc.pdf \
  --provider replicate \
  --replicate-max-concurrent-calls 3 \
  --mode full_text
```

**How it works:**
- The Replicate adapter creates an internal semaphore with this limit
- When async client falls back to sync execution, this semaphore prevents API overload
- Does NOT affect `--max-concurrent-pages` (they work together)

```python
# In ReplicateLLMAdapter
self._sync_replicate_semaphore = asyncio.Semaphore(
    config.get_replicate_max_concurrent_calls()
)
```

#### OpenRouter Provider

OpenRouter uses general concurrency settings via `--max-concurrent-pages` and `--async-rps`:

```bash
# OpenRouter: uses general settings (no Replicate-specific flag)
pdf-extractor ./doc.pdf \
  --provider openrouter \
  --max-concurrent-pages 6 \
  --async-rps 10.0 \
  --mode full_text
```

**How it works:**
- OpenRouter does NOT have an internal semaphore
- Relies on pipeline-level `--max-concurrent-pages` semaphore for concurrency control
- Uses `--async-rps` (AsyncRateLimiter) for request rate limiting
- **`--replicate-max-concurrent-calls` flag is ignored when using OpenRouter**

### Combined Example: Full Concurrency Stack

```bash
# Maximum throughput configuration
pdf-extractor ./docs/*.pdf \
  --provider replicate \
  --mode full_text \
  --max-workers 4 \              # 4 PDFs at once
  --max-concurrent-pages 8 \       # 8 pages per doc
  --replicate-max-concurrent-calls 3 \  # 3 parallel API calls (Replicate)
  --async-rps 12.0               # 12 requests/second rate limit
```

This would process:
- **4 PDFs simultaneously**
- Within each PDF, **8 pages concurrently**
- The Replicate adapter makes **up to 3 API calls in parallel**
- Respects a **12 requests/second** rate limit

### Concurrency Settings Summary

| Setting | Scope | Default | Replicate | OpenRouter |
|---------|--------|---------|------------|------------|
| `--max-workers` | Multiple PDFs | `4` | ✅ | ✅ |
| `--max-concurrent-pages` | Pages per document | `4` | ✅ | ✅ |
| `--async-rps` | Request rate limit | `8.0` | ✅ | ✅ |
| `--replicate-max-concurrent-calls` | Replicate API calls | `1` | ✅ | ❌ **Ignored** |

### Examples by Provider

#### Replicate Provider
```bash
# Standard setup
pdf-extractor ./doc.pdf --provider replicate --mode summary

# High throughput (multi-page PDF)
pdf-extractor ./large.pdf \
  --provider replicate \
  --mode full_text \
  --max-concurrent-pages 10 \
  --replicate-max-concurrent-calls 5

# Batch with concurrent API calls
pdf-extractor ./docs/*.pdf \
  --provider replicate \
  --mode summary \
  --max-workers 4 \
  --replicate-max-concurrent-calls 3
```

#### OpenRouter Provider
```bash
# Standard setup
pdf-extractor ./doc.pdf --provider openrouter --mode summary

# High throughput (multi-page PDF)
pdf-extractor ./large.pdf \
  --provider openrouter \
  --mode full_text \
  --max-concurrent-pages 10 \
  --async-rps 10.0
# Batch with rate limiting
pdf-extractor ./docs/*.pdf \
  --provider openrouter \
  --mode summary \
  --max-workers 4 \
  --async-rps 8.0
```

**Key difference:** OpenRouter uses `--max-concurrent-pages` and `--async-rps` for all concurrency control, while Replicate has the additional `--replicate-max-concurrent-calls` for internal API call limiting.

## Current Scope
- Vision-driven extraction pipeline for text/scanned/mixed PDFs
- Structured mode uses Pydantic schema classes only
- `extract_many` supports concurrent processing of multiple PDFs
- `extract_many_async` supports async batch processing
- Replicate adapter implemented
- OpenRouter adapter implemented
- Asynchronous extraction (`extract_async`, `extract_many_async`)

## Testing

Run default test suite:

```bash
pytest -q
```

Run optional live Replicate integration test:

```bash
PDF_EXTRACTOR_LIVE_TEST=1 REPLICATE_API_TOKEN=your_token pytest -m live_replicate -q
```

Run optional live OpenRouter integration test:

```bash
PDF_EXTRACTOR_LIVE_TEST=1 OPENROUTER_API_KEY=your_key pytest -m live_openrouter -q
```

Optional model override for live tests:

```bash
PDF_EXTRACTOR_LIVE_TEST=1 REPLICATE_API_TOKEN=your_token PDF_EXTRACTOR_LIVE_MODEL=openai/gpt-4o-mini pytest -m live_replicate -q
PDF_EXTRACTOR_LIVE_TEST=1 OPENROUTER_API_KEY=your_key PDF_EXTRACTOR_LIVE_MODEL=openai/gpt-4o-mini pytest -m live_openrouter -q
```
