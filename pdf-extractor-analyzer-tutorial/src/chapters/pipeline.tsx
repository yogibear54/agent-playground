import type { ChapterData } from './types';
import Pre from '../components/Pre';

export const pipelineContent: ChapterData = {
  id: 'pipeline',
  title: 'Pipeline Orchestration',
  description: 'Understand how PDFExtractor orchestrates the entire extraction workflow.',
  files: ['src/pdf_extractor_analyzer/pipeline.py'],
  content: (
    <>
      <h2>PDFExtractor Class</h2>
      <p>
        The <code>PDFExtractor</code> class is the main entry point for PDF extraction. It coordinates all components: converter, cache, and analyzer via the provider factory. It supports both synchronous and asynchronous extraction modes.
      </p>

      <h2>Initialization</h2>
      <Pre>{`from pdf_extractor_analyzer.provider_factory import create_llm_provider

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
        # Provider factory creates appropriate adapter based on config.provider
        self.analyzer = VisionAnalyzer(
            self.config,
            provider=create_llm_provider(self.config)
        )`}</Pre>

      <h2>Single Extraction</h2>
      <h3>Synchronous: extract()</h3>
      <p>
        The <code>extract()</code> method processes a single PDF file synchronously:
      </p>

      <h3>Processing Steps</h3>
      <ol>
        <li><strong>Path Validation</strong> - Security checks and PDF format verification</li>
        <li><strong>Hash Computation</strong> - SHA-256 of file content for cache key</li>
        <li><strong>Cache Check</strong> - Return cached result if valid</li>
        <li><strong>Page Preparation</strong> - Convert PDF or load from cache</li>
        <li><strong>Page Analysis</strong> - Send each page to vision API</li>
        <li><strong>Output Aggregation</strong> - Combine per-page results</li>
        <li><strong>Cache Storage</strong> - Save results if persistent</li>
        <li><strong>Return Result</strong> - ExtractionResult with content and metadata</li>
      </ol>

      <h3>Path Validation</h3>
      <p>
        The <code>_validate_pdf_path()</code> method performs security checks:
      </p>
      <ul>
        <li><strong>Path traversal prevention</strong> - Ensures resolved path stays within allowed root</li>
        <li><strong>File existence</strong> - Validates file exists and is readable</li>
        <li><strong>Format verification</strong> - Checks PDF magic bytes (<code>%PDF</code>)</li>
        <li><strong>Size limits</strong> - Enforces max_pdf_file_size if configured</li>
      </ul>

      <div className="info-box warning">
        <div className="info-box-title">⚠️ Security Note</div>
        <p>
          Path validation prevents path traversal attacks. The default allowed root is the current working directory, preventing access to <code>/etc/passwd</code> or similar sensitive files.
        </p>
      </div>

      <h3>Cache Invalidation</h3>
      <p>
        Content cache is invalidated when extraction parameters change:
      </p>
      <Pre>{`extraction_params = {
    "mode": mode.value,
    "model": self.config.model,
    "max_pages": self.config.max_pages,
    "schema": schema.model_json_schema() if schema else None,
}`}</Pre>

      <h3>Asynchronous: extract_async()</h3>
      <p>
        The <code>extract_async()</code> method processes a single PDF file asynchronously with concurrent page processing:
      </p>
      <Pre>{`async def extract_async(
    self,
    pdf_path: str | Path,
    *,
    mode: ExtractionMode,
    schema: type[BaseModel] | None = None,
    prompt: str | None = None,
) -> ExtractionResult:
    # Similar to extract() but uses asyncio for concurrent pages
    semaphore = asyncio.Semaphore(self.config.max_concurrent_pages)
    rate_limiter = AsyncRateLimiter(self.config.async_requests_per_second)
    
    # Process pages concurrently with rate limiting
    tasks = [
        self.analyzer.analyze_page_async(
            image_bytes=page.image_bytes,
            mode=mode,
            rate_limit_coro=rate_limiter.acquire,
        )
        for page in pages
    ]
    results = await asyncio.gather(*tasks)
    ...`}</Pre>

      <div className="info-box tip">
        <div className="info-box-title">💡 Async vs Sync</div>
        <p>
          Use async extraction for faster processing of multi-page documents. The async mode processes pages concurrently while respecting rate limits, which can significantly reduce total processing time.
        </p>
      </div>

      <h2>Batch Extraction</h2>
      <h3>Synchronous: extract_many()</h3>
      <p>
        Process multiple PDFs concurrently with <code>extract_many()</code> using thread pools:
      </p>

      <h3>Parameters</h3>
      <ul>
        <li><code>pdf_paths</code> - List of paths to process</li>
        <li><code>mode</code> - Extraction mode for all files</li>
        <li><code>schema</code> - Optional Pydantic schema for structured mode</li>
        <li><code>max_workers</code> - Number of parallel threads (default: 4)</li>
        <li><code>continue_on_error</code> - Continue if one file fails (default: True)</li>
      </ul>

      <h3>Thread Safety</h3>
      <Pre>{`def _make_worker(self) -> PDFExtractor:
    """Create an isolated worker sharing analyzer but with independent cache manager."""
    worker = PDFExtractor.__new__(PDFExtractor)
    worker.config = self.config
    worker.analyzer = self.analyzer  # Shared (provider calls are independent)
    worker.converter = PDFConverter()  # New instance per worker
    worker.cache = CacheManager(...)  # New instance per worker
    return worker

def _run_single_batch_item(self, path, mode, schema):
    worker = self._make_worker()
    return worker.extract(path, mode=mode, schema=schema)`}</Pre>

      <h3>Asynchronous: extract_many_async()</h3>
      <p>
        Process multiple PDFs asynchronously with <code>extract_many_async()</code>:
      </p>
      <Pre>{`async def extract_many_async(
    self,
    pdf_paths: list[str | Path],
    *,
    mode: ExtractionMode,
    schema: type[BaseModel] | None = None,
    prompt: str | None = None,
    max_workers: int = 4,
    continue_on_error: bool = True,
) -> list[BatchExtractionItem]:
    # Limit concurrent document processing
    semaphore = asyncio.Semaphore(max_workers)
    
    async def process(path):
        async with semaphore:
            return await self._run_single_batch_item_async(path, mode, schema)
    
    tasks = [asyncio.create_task(process(path)) for path in pdf_paths]
    if continue_on_error:
        completed = await asyncio.gather(*tasks, return_exceptions=True)
    else:
        completed = await asyncio.gather(*tasks)
    ...`}</Pre>

      <h3>Batch Result Structure</h3>
      <p>
        Returns a list of <code>BatchExtractionItem</code>:
      </p>
      <Pre>{`[
  {
    "pdf_path": "/path/to/a.pdf",
    "status": "success",
    "result": {...},
    "error": null
  },
  {
    "pdf_path": "/path/to/b.pdf",
    "status": "error",
    "result": null,
    "error": "File not found"
  }
]`}</Pre>

      <h2>Output Aggregation</h2>
      <p>
        The <code>_aggregate_outputs()</code> method combines results across pages:
      </p>

      <h3>Mode-Specific Aggregation</h3>
      <table className="data-table">
        <thead><tr><th>Mode</th><th>Aggregation Strategy</th></tr></thead>
        <tbody>
          <tr><td><code>full_text</code></td><td><code>[Page 1]\\n\\n[Page N]\\n\\ntext...</code></td></tr>
          <tr><td><code>summary</code></td><td><code>Page 1: summary\\nPage 2: summary\\n...</code></td></tr>
          <tr><td><code>markdown</code></td><td><code>## Page 1\\n\\ncontent\\n\\n---\\n\\n## Page 2...</code></td></tr>
          <tr><td><code>structured</code></td><td>Deep merge of dicts across pages</td></tr>
          <tr><td><code>prompt</code></td><td>Custom format based on user-provided prompt</td></tr>
        </tbody>
      </table>

      <h3>Structured Mode Merging</h3>
      <p>
        The <code>_merge_dicts()</code> method recursively merges page outputs:
      </p>
      <ul>
        <li>Strings: Later value overwrites (unless empty)</li>
        <li>Lists: Concatenate with duplicate removal</li>
        <li>Dicts: Recursive merge</li>
        <li>Null/empty: Replaced with non-empty values</li>
      </ul>

      <h2>Example Usage</h2>
      <h3>Synchronous Extraction</h3>
      <Pre>{`from pdf_extractor_analyzer import PDFExtractor, ExtractorConfig, ExtractionMode

# Single file extraction
extractor = PDFExtractor()
result = extractor.extract(
    "document.pdf",
    mode=ExtractionMode.SUMMARY
)
print(result.content)
print(result.metadata.page_count)

# Batch extraction
results = extractor.extract_many(
    ["doc1.pdf", "doc2.pdf", "doc3.pdf"],
    mode=ExtractionMode.FULL_TEXT,
    max_workers=3,
    continue_on_error=True
)

for item in results:
    if item.status == "success":
        print(f"{item.pdf_path}: {len(item.result.content)} chars")
    else:
        print(f"{item.pdf_path}: ERROR - {item.error}")`}</Pre>

      <h3>Asynchronous Extraction</h3>
      <Pre>{`import asyncio
from pdf_extractor_analyzer import PDFExtractor, ExtractionMode

# Single file async extraction
async def extract_single():
    extractor = PDFExtractor()
    result = await extractor.extract_async(
        "document.pdf",
        mode=ExtractionMode.SUMMARY
    )
    print(result.content)

# Batch async extraction
async def extract_batch():
    extractor = PDFExtractor()
    results = await extractor.extract_many_async(
        ["doc1.pdf", "doc2.pdf", "doc3.pdf"],
        mode=ExtractionMode.FULL_TEXT,
        max_workers=4,
        continue_on_error=True
    )
    
    for item in results:
        if item.status == "success":
            print(f"{item.pdf_path}: {len(item.result.content)} chars")
        else:
            print(f"{item.pdf_path}: ERROR - {item.error}")

# Run async code
asyncio.run(extract_batch())`}</Pre>
    </>
  ),
  quiz: [
    {
      question: 'What security check does _validate_pdf_path() perform?',
      options: [
        'Virus scanning',
        'Path traversal prevention',
        'Password checking',
        'Network access validation'
      ],
      correctIndex: 1,
      explanation: 'The method validates that resolved paths stay within the allowed root directory, preventing /etc/passwd style path traversal attacks.',
    },
    {
      question: 'How are threads managed in extract_many()?',
      options: [
        'Each thread shares all instances',
        'Each thread gets new converter and cache instances, shares analyzer',
        'Each request is serialized',
        'All threads share one converter'
      ],
      correctIndex: 1,
      explanation: 'Each worker thread gets its own PDFConverter and CacheManager (which are stateful), but shares the ReplicateVisionAnalyzer (API calls are independent).',
    },
    {
      question: 'What happens when extraction parameters change?',
      options: [
        'Cache is ignored',
        'New cache entry is created with same key',
        'Old cache is deleted',
        'Parameters are reset to defaults'
      ],
      correctIndex: 0,
      explanation: 'The extraction_params (mode, model, schema) are stored in content.json and compared on cache check. Different parameters result in a cache miss.',
    },
    {
      question: 'How does structured mode merge data across pages?',
      options: [
        'Concatenates all values',
        'Keeps first page data only',
        'Deep merge with smart handling of types',
        'Raises error for multi-page PDFs'
      ],
      correctIndex: 2,
      explanation: 'The _merge_dicts() method recursively merges dictionaries, concatenates unique list items, and prefers non-null/empty values.',
    },
  ],
};

export default pipelineContent;