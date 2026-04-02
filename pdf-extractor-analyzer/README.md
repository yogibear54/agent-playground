# PDF Extractor Analyzer

Image-first PDF extraction and analysis for mixed or unknown PDF formats.

## Features

- PDF -> page images via PyMuPDF
- Vision analysis via Replicate-hosted models (default `openai/gpt-4o`)
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
pip install -e .
```

For development/tests:

```bash
pip install -e ".[dev]"
```

## Replicate API Token

Set token with environment variable (recommended):

```bash
export REPLICATE_API_TOKEN=your_token
```

Or pass directly in code:

```python
from pdf_extractor_analyzer import ExtractorConfig

config = ExtractorConfig(replicate_api_token="your_token")
```

## CLI Usage

Show help:

```bash
pdf-extractor --help
```

Full text extraction:

```bash
pdf-extractor ./sample-pdfs/sample.pdf --mode full_text --pretty
```

Summary extraction with disabled cache:

```bash
pdf-extractor ./sample-pdfs/sample.pdf --mode summary --cache-mode disabled --pretty
```

Structured extraction with Pydantic schema import:

```bash
pdf-extractor ./sample-pdfs/invoice.pdf --mode structured --schema-import my_schemas:InvoiceSchema --pretty
```

Batch processing (parallel workers):

```bash
pdf-extractor ./sample-pdfs/a.pdf ./sample-pdfs/b.pdf --mode summary --max-workers 2 --pretty
```

Markdown extraction (saves `content.json` and `content.md`):

```bash
pdf-extractor ./sample-pdfs/sample.pdf --mode markdown --cache-mode persistent --pretty
```

Control rendered page image size:

```bash
# Render at 150dpi, but cap the longest edge (width/height) to 2048px.
pdf-extractor ./sample-pdfs/sample.pdf --mode markdown --dpi 150 --image-max-long-edge 2048 --pretty
```

Fail fast on first batch error:

```bash
pdf-extractor ./sample-pdfs/a.pdf ./sample-pdfs/b.pdf --mode summary --stop-on-error
```

## Python Usage

```python
from pydantic import BaseModel

from pdf_extractor_analyzer import CacheMode, ExtractionMode, ExtractorConfig, PDFExtractor


class InvoiceSchema(BaseModel):
    vendor_name: str | None = None
    invoice_number: str | None = None
    total_amount: float | None = None


config = ExtractorConfig(cache_mode=CacheMode.PERSISTENT)
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

- `persistent`: writes/reads cache under `cache_dir` using PDF content hash
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

```
cache/
└── <hash>/
    ├── content.json   # Always created
    ├── content.md     # Only for markdown mode
    ├── metadata.json
    └── page_*.png     # Rendered page images
```

## Current Scope

- Vision-driven extraction pipeline for text/scanned/mixed PDFs
- Structured mode uses Pydantic schema classes only
- `extract_many` supports concurrent processing of multiple PDFs

## Testing

Run default test suite:

```bash
pytest -q
```

Run optional live Replicate integration test:

```bash
PDF_EXTRACTOR_LIVE_TEST=1 REPLICATE_API_TOKEN=your_token pytest -m live_replicate -q
```

Optional model override for live test:

```bash
PDF_EXTRACTOR_LIVE_TEST=1 REPLICATE_API_TOKEN=your_token PDF_EXTRACTOR_LIVE_MODEL=openai/gpt-4o-mini pytest -m live_replicate -q
```
