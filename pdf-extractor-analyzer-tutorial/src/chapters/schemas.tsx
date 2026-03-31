import type { ChapterData } from './types';
import Pre from '../components/Pre';

export const schemasContent: ChapterData = {
  id: 'schemas',
  title: 'Data Schemas',
  description: 'Learn about Pydantic models that define data structures.',
  files: ['src/pdf_extractor_analyzer/schemas.py'],
  content: (
    <>
      <h2>Schema Module Overview</h2>
      <p>
        The schemas module defines all data structures using Pydantic models, providing type safety, validation, and serialization.
      </p>

      <h2>ExtractionMode Enum</h2>
      <p>
        Defines the available extraction modes:
      </p>
      <Pre>{`class ExtractionMode(str, Enum):
    FULL_TEXT = "full_text"
    STRUCTURED = "structured"
    SUMMARY = "summary"
    MARKDOWN = "markdown"`}</Pre>

      <h3>Mode Descriptions</h3>
      <table className="data-table">
        <thead><tr><th>Mode</th><th>Output Type</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>full_text</code></td><td>str</td><td>Transcribes all visible text with layout preservation</td></tr>
          <tr><td><code>summary</code></td><td>str</td><td>3-5 sentence summary with key details</td></tr>
          <tr><td><code>markdown</code></td><td>str</td><td>Converts to Markdown with proper formatting</td></tr>
          <tr><td><code>structured</code></td><td>dict</td><td>Extracts data matching a Pydantic schema</td></tr>
        </tbody>
      </table>

      <h2>ExtractionResult Model</h2>
      <Pre>{`class ExtractionResult(BaseModel):
    extraction_mode: ExtractionMode
    content: str | dict[str, Any]
    metadata: dict[str, Any] = Field(default_factory=dict)`}</Pre>

      <h3>Metadata Fields</h3>
      <p>
        The metadata dictionary includes:
      </p>
      <ul>
        <li><code>source_hash</code> - SHA-256 hash of the PDF</li>
        <li><code>page_count</code> - Number of pages processed</li>
        <li><code>model</code> - Model used for extraction</li>
        <li><code>cache_mode</code> - Cache behavior during extraction</li>
        <li><code>generated_at</code> - ISO timestamp</li>
        <li><code>from_cache</code> - Whether result came from cache</li>
        <li><code>correlation_id</code> - Request tracking ID</li>
      </ul>

      <h2>BatchItemStatus Enum</h2>
      <Pre>{`class BatchItemStatus(str, Enum):
    SUCCESS = "success"
    ERROR = "error"`}</Pre>

      <h2>BatchExtractionItem Model</h2>
      <p>
        Represents a single result in batch processing:
      </p>
      <Pre>{`class BatchExtractionItem(BaseModel):
    pdf_path: str
    status: BatchItemStatus
    result: ExtractionResult | None = None
    error: str | None = None`}</Pre>

      <h3>Usage in extract_many()</h3>
      <Pre>{`results = extractor.extract_many(
    ["a.pdf", "b.pdf"],
    mode=ExtractionMode.SUMMARY
)

for item in results:
    if item.status == BatchItemStatus.SUCCESS:
        print(f"Success: {item.result.content}")
    else:
        print(f"Error: {item.error}")`}</Pre>

      <h2>Custom Schemas for Structured Mode</h2>
      <p>
        Users can define their own Pydantic models for structured extraction:
      </p>
      <Pre>{`from pydantic import BaseModel
from typing import List

class LineItem(BaseModel):
    description: str | None = None
    quantity: int | None = None
    unit_price: float | None = None
    total: float | None = None

class InvoiceSchema(BaseModel):
    vendor_name: str | None = None
    invoice_number: str | None = None
    invoice_date: str | None = None
    total_amount: float | None = None
    line_items: List[LineItem] = []

# Use for extraction
result = extractor.extract(
    "invoice.pdf",
    mode=ExtractionMode.STRUCTURED,
    schema=InvoiceSchema
)

# Output is validated against schema
print(result.content["vendor_name"])  # Type-safe access`}</Pre>

      <h2>Schema Validation Flow</h2>
      <ol>
        <li>LLM receives schema JSON via prompt</li>
        <li>LLM returns JSON matching (or attempting to match) schema</li>
        <li>JSON is parsed and validated with <code>schema.model_validate()</code></li>
        <li>If validation fails, <code>repair_structured_output()</code> is called</li>
        <li>Repaired JSON is validated again</li>
        <li>Final output is <code>schema.model_dump()</code></li>
      </ol>

      <div className="info-box tip">
        <div className="info-box-title">💡 Schema Design Tip</div>
        <p>
          Use <code>| None = None</code> for optional fields. LLMs often return null for missing values, which maps cleanly to None in Python.
        </p>
      </div>

      <h2>Type Safety Benefits</h2>
      <ul>
        <li><strong>IDE Support</strong> - Autocomplete for model fields</li>
        <li><strong>Runtime Validation</strong> - Pydantic validates on creation</li>
        <li><strong>JSON Schema Export</strong> - <code>model_json_schema()</code> for LLM prompts</li>
        <li><strong>Serialization</strong> - <code>model_dump()</code> for clean JSON output</li>
      </ul>

      <h2>Module Exports</h2>
      <Pre>{`# Public exports from __init__.py
from .schemas import (
    ExtractionMode,
    ExtractionResult,
    BatchItemStatus,
    BatchExtractionItem,
)`}</Pre>
    </>
  ),
  quiz: [
    {
      question: 'What type does ExtractionResult.content return for markdown mode?',
      options: ['dict[str, Any]', 'str', 'List[str]', 'bytes'],
      correctIndex: 1,
      explanation: 'Markdown mode returns a string containing the Markdown-formatted content, wrapped with page headers and separators.',
    },
    {
      question: 'What happens if structured extraction fails validation?',
      options: [
        'Returns null',
        'Raises error immediately',
        'Attempts repair with another LLM call',
        'Falls back to summary mode'
      ],
      correctIndex: 2,
      explanation: 'The pipeline attempts repair by sending the invalid JSON and error message back to the LLM for correction.',
    },
    {
      question: 'Why should schema fields use | None = None?',
      options: [
        'For performance',
        'LLMs may return null for missing values',
        'Required by Pydantic',
        'For JSON serialization only'
      ],
      correctIndex: 1,
      explanation: 'LLMs naturally return null for missing information, which maps cleanly to Python None when fields are optional.',
    },
    {
      question: 'What metadata field indicates the result came from cache?',
      options: ['cache_hit', 'from_cache', 'cached', 'is_cached'],
      correctIndex: 1,
      explanation: 'The from_cache boolean field in metadata is True when the extraction result was retrieved from cache.',
    },
  ],
};

export default schemasContent;