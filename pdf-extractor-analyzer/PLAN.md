# PDF Extractor & Analyzer - Implementation Plan

## Overview
Build a durable PDF extraction and analysis system that handles any PDF format (text-based, scanned images, mixed content) by converting pages to images and using vision LLMs for analysis.

## Requirements (Confirmed)
- **Extraction Type**: Flexible/Configurable (support multiple extraction modes)
- **Document Types**: Mixed/Unknown (need flexibility)
- **Scale**: Low volume, on-demand (no strict latency requirements)
- **LLM Provider**: Replicate (replicate.com) with GPT-4o or similar vision models
- **Caching**: Unique folder per PDF based on content hash, skip re-conversion if cached
- **Output Format**: JSON document with `extraction_mode` and `content` fields

---

## Architecture Decision: Image-First Pipeline

### Chosen Approach: PDF → Images (Cached) → Vision LLM (via Replicate)
Convert all PDF pages to images, cache them in unique folders, then analyze with vision models.

**Rationale:**
- **Uniformity**: Same pipeline regardless of PDF type
- **Layout preservation**: Visual context retained (tables, columns, forms)
- **Robustness**: Handles text, handwriting, signatures, diagrams, tables uniformly
- **Deduplication**: Same PDF = same hash = same cache, no re-conversion

**Trade-offs Accepted:**
- Higher token cost per page (vs text extraction)
- Slower processing
- Lose native text metadata/searchability
- Disk space for cached images

---

## Technical Stack

| Component | Library | Rationale |
|-----------|---------|-----------|
| PDF → Image | PyMuPDF (`fitz`) | Fast, native Python, no external poppler dependency |
| Image Handling | Pillow | Standard image manipulation |
| Content Hashing | hashlib (stdlib) | SHA-256 for unique file identification |
| LLM Provider | Replicate API | Hosts GPT-4o, Claude, LLaVA, Qwen-VL |
| Structured Output | Pydantic | Define extraction schemas, type-safe output |
| API Client | `replicate` Python SDK | Official client, simple interface |

### Model Options on Replicate
| Model | Use Case | Cost/Speed |
|-------|----------|------------|
| `openai/gpt-4o` | Best overall vision capability | Higher cost, best quality |
| `openai/gpt-4o-mini` | Fast, affordable | Lower cost, good quality |
| `anthropic/claude-3.7-sonnet` | Complex reasoning | Medium cost, strong reasoning |
| `yorickvp/llava-13b` | Open-source alternative | Lower cost, good for documents |
| `lucataco/qwen2-vl-7b-instruct` | Document extraction specialist | Low cost, strong on documents |

**Recommended Default**: `openai/gpt-4o` for best quality, with fallback options.

---

## Module Structure

```
pdf-extractor-analyzer/
├── src/
│   ├── __init__.py
│   ├── converter.py      # PDF to image conversion (PyMuPDF)
│   ├── cache.py          # Cache management (hashing, storage, lookup)
│   ├── analyzer.py       # Vision LLM analysis (Replicate)
│   ├── schemas.py        # Pydantic models for structured output
│   ├── pipeline.py       # End-to-end orchestration
│   └── config.py         # Configuration (model, DPI, cache settings)
├── cache/                # Default cache directory (gitignored)
├── tests/
├── examples/
│   └── sample_pdfs/
├── pyproject.toml
└── README.md
```

---

## Cache Structure

```
cache/
├── a1b2c3d4e5f6.../      # SHA-256 hash of PDF content (first 16 chars)
│   ├── metadata.json      # Page count, DPI, created timestamp
│   ├── page_001.png       # Page images
│   ├── page_002.png
│   └── ...
├── f7e8d9c0b1a2.../
│   └── ...
```

---

## Output JSON Schema

All extraction results return a consistent JSON structure:

```json
{
  "extraction_mode": "full_text" | "structured" | "summary",
  "content": <string | object>
}
```

### Full Text Mode Output
```json
{
  "extraction_mode": "full_text",
  "content": "All the extracted text from the document..."
}
```

### Structured Mode Output
```json
{
  "extraction_mode": "structured",
  "content": {
    "vendor_name": "Acme Corp",
    "invoice_number": "INV-12345",
    "date": "2024-01-15",
    "total_amount": 1250.00,
    "line_items": [...]
  }
}
```

### Summary Mode Output
```json
{
  "extraction_mode": "summary",
  "content": "This document is an invoice from Acme Corp for $1,250.00..."
}
```

---

## Implementation Phases

### Phase 1: Cache Management
**File**: `src/cache.py`

Features:
- SHA-256 hash of PDF content for unique identification
- Create unique folder per PDF: `cache/<hash_prefix>/`
- Store converted images as `page_001.png`, `page_002.png`, etc.
- Metadata file: page count, DPI, created timestamp
- Check cache before conversion (skip if exists)
- Configurable cache directory and TTL

### Phase 2: Core Conversion Module
**File**: `src/converter.py`

Features:
- PDF to image conversion using PyMuPDF
- Multi-page handling
- Configurable DPI (default: 150)
- **Cache-aware**: Check cache first, save to cache after conversion
- Error handling for corrupted/encrypted PDFs

### Phase 3: Vision Analysis Module
**File**: `src/analyzer.py`

Features:
- Replicate API integration
- Support multiple vision models (configurable)
- Load images from cache or pass bytes
- Configurable prompts for different extraction modes
- Retry logic with exponential backoff

### Phase 4: Schema System
**File**: `src/schemas.py`

Features:
- Pydantic models for output JSON schema
- Support for custom structured schemas
- Validation of LLM output

### Phase 5: Pipeline Orchestration
**File**: `src/pipeline.py`

Features:
- End-to-end extraction pipeline
- Configurable extraction mode (text, structured, summary)
- Result aggregation across pages
- Output as JSON document

---

## Key Implementation Details

### 1. Content Hashing & Cache Lookup
```python
import hashlib
from pathlib import Path
import json

def compute_content_hash(file_path: str) -> str:
    """Compute SHA-256 hash of file content."""
    sha256 = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            sha256.update(chunk)
    return sha256.hexdigest()

def get_cache_dir(content_hash: str, base_cache_dir: Path) -> Path:
    """Get cache directory for a PDF (first 16 chars of hash)."""
    return base_cache_dir / content_hash[:16]

def is_cached(cache_dir: Path, expected_pages: int) -> bool:
    """Check if PDF is already cached with all pages."""
    if not cache_dir.exists():
        return False
    for i in range(1, expected_pages + 1):
        if not (cache_dir / f"page_{i:03d}.png").exists():
            return False
    return True
```

### 2. PDF to Image Conversion (Cache-Aware)
```python
import fitz
from dataclasses import dataclass
from pathlib import Path
import json
from datetime import datetime

@dataclass
class PageImage:
    page_number: int
    image_path: Path
    image_bytes: bytes
    width: int
    height: int

def convert_pdf_to_images(
    pdf_path: str, 
    cache_dir: Path, 
    dpi: int = 150,
    force: bool = False
) -> list[PageImage]:
    """Convert PDF to images, using cache if available."""
    doc = fitz.open(pdf_path)
    total_pages = len(doc)
    
    if not force and is_cached(cache_dir, total_pages):
        return load_from_cache(cache_dir, total_pages)
    
    cache_dir.mkdir(parents=True, exist_ok=True)
    mat = fitz.Matrix(dpi / 72, dpi / 72)
    pages = []
    
    for page_num in range(total_pages):
        page = doc[page_num]
        pix = page.get_pixmap(matrix=mat)
        image_path = cache_dir / f"page_{page_num + 1:03d}.png"
        pix.save(str(image_path))
        pages.append(PageImage(
            page_number=page_num + 1,
            image_path=image_path,
            image_bytes=pix.tobytes("png"),
            width=pix.width,
            height=pix.height
        ))
    
    metadata = {"page_count": total_pages, "dpi": dpi, "created": datetime.now().isoformat()}
    with open(cache_dir / "metadata.json", "w") as f:
        json.dump(metadata, f)
    
    return pages
```

### 3. Output Schema (Pydantic)
```python
from pydantic import BaseModel
from typing import Union, Any
from enum import Enum

class ExtractionMode(str, Enum):
    FULL_TEXT = "full_text"
    STRUCTURED = "structured"
    SUMMARY = "summary"

class ExtractionResult(BaseModel):
    extraction_mode: ExtractionMode
    content: Union[str, dict[str, Any]]
```

### 4. Extraction Prompts
```python
PROMPTS = {
    ExtractionMode.FULL_TEXT: "Transcribe all text from this document page. Preserve structure.",
    ExtractionMode.STRUCTURED: "Extract structured data as JSON.",
    ExtractionMode.SUMMARY: "Summarize the content of this page."
}
```

---

## Configuration

```python
from dataclasses import dataclass
from pathlib import Path

@dataclass
class ExtractorConfig:
    # PDF Conversion
    dpi: int = 150
    
    # Cache Settings
    cache_dir: Path = Path("./cache")
    cache_ttl_days: int = 7
    force_conversion: bool = False
    
    # LLM Settings
    model: str = "openai/gpt-4o"
    fallback_model: str = "openai/gpt-4o-mini"
    max_retries: int = 3
    timeout: int = 60
```

---

## Dependencies

```toml
[project]
name = "pdf-extractor-analyzer"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
    "pymupdf>=1.24.0",
    "pillow>=10.0.0",
    "replicate>=0.25.0",
    "pydantic>=2.0.0",
]

[project.optional-dependencies]
dev = ["pytest>=8.0.0"]
```

---

## Usage Examples

### Full Text Extraction
```python
from pdf_extractor import PDFExtractor, ExtractionMode

extractor = PDFExtractor()
result = extractor.extract("document.pdf", mode=ExtractionMode.FULL_TEXT)
# Returns: {"extraction_mode": "full_text", "content": "..."}
```

### Structured Data Extraction
```python
from pydantic import BaseModel

class InvoiceSchema(BaseModel):
    vendor_name: str
    invoice_number: str
    date: str
    total_amount: float

result = extractor.extract("invoice.pdf", mode=ExtractionMode.STRUCTURED, schema=InvoiceSchema)
# Returns: {"extraction_mode": "structured", "content": {"vendor_name": "...", ...}}
```

---

## Verification Plan
1. Unit tests for each module
2. Integration tests with sample PDFs (text, scanned, mixed)
3. Cache tests: verify hash uniqueness, TTL cleanup
4. Output schema validation tests
5. Edge case tests: encrypted PDFs, corrupted files, large documents
