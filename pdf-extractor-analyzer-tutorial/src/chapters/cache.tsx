import type { ChapterData } from './types';
import Pre from '../components/Pre';

export const cacheContent: ChapterData = {
  id: 'cache',
  title: 'Cache Management',
  description: 'Understand the hash-based caching system for PDF conversions and extractions.',
  files: ['src/pdf_extractor_analyzer/cache.py'],
  content: (
    <>
      <h2>Cache Philosophy</h2>
      <p>
        The cache system is designed to avoid redundant PDF conversions and LLM API calls. By using content hashes, the same PDF always maps to the same cache, regardless of its location or filename.
      </p>

      <h2>Content Hashing</h2>
      <p>
        The <code>compute_content_hash()</code> function generates a SHA-256 hash of the PDF file content:
      </p>
      <Pre>{`def compute_content_hash(file_path: Path) -> str:
    """Compute SHA-256 hash of file content."""
    sha256 = hashlib.sha256()
    with file_path.open("rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            sha256.update(chunk)
    return sha256.hexdigest()`}</Pre>

      <h3>Why SHA-256?</h3>
      <ul>
        <li><strong>Collision resistance</strong> - Virtually impossible for two PDFs to share a hash</li>
        <li><strong>Deterministic</strong> - Same content always produces the same hash</li>
        <li><strong>Fast</strong> - Efficient chunked reading for large files</li>
      </ul>

      <h2>Cache Directory Structure</h2>
      <Pre>{`cache/
├── 006e5150ea001c8c/    # Hash prefix (32 chars)
│   ├── metadata.json    # Conversion metadata
│   ├── content.json     # Extraction result
│   ├── content.md       # Markdown output (if mode=markdown)
│   ├── page_001.png     # Page images
│   └── page_002.png
├── 8ed544d2dd9a8b29/
│   └── ...
└── a6648d29b77b0027/
    └── ...`}</Pre>

      <h2>CacheMetadata Dataclass</h2>
      <p>
        Stores conversion parameters for cache validation:
      </p>
      <Pre>{`@dataclass(slots=True)
class CacheMetadata:
    page_count: int           # Number of pages converted
    dpi: int                  # Resolution used
    created_at: str           # ISO timestamp
    source_hash: str          # Content hash
    max_pages: int | None     # Page limit if set
    converter_version: str    # Version marker`}</Pre>

      <h2>CacheManager Class</h2>

      <h3>Cache Resolution</h3>
      <p>
        The <code>resolve_work_dir()</code> method determines cache location:
      </p>
      <ul>
        <li><strong>PERSISTENT</strong> - Creates directory under base_cache_dir</li>
        <li><strong>EPHEMERAL</strong> - Creates temp directory with prefix</li>
        <li><strong>DISABLED</strong> - Returns None (no caching)</li>
      </ul>

      <h3>Cache Hit Validation</h3>
      <p>
        The <code>is_cache_hit()</code> method validates multiple factors:
      </p>
      <ol>
        <li>Directory exists</li>
        <li>Metadata file is valid JSON</li>
        <li>Source hash matches</li>
        <li>DPI matches</li>
        <li>Page limit matches</li>
        <li>All expected page images exist</li>
      </ol>

      <h3>Content Cache</h3>
      <p>
        For extraction results, separate methods handle content caching:
      </p>
      <ul>
        <li><code>write_content()</code> - Save extraction result with parameters</li>
        <li><code>read_content()</code> - Load cached extraction</li>
        <li><code>content_path()</code> / <code>content_md_path()</code> - File paths</li>
      </ul>

      <h2>TTL Cleanup</h2>
      <p>
        The <code>cleanup_expired()</code> method removes stale cache entries:
      </p>
      <Pre>{`def cleanup_expired(self) -> int:
    """Remove caches older than TTL."""
    cutoff = datetime.now(UTC) - timedelta(days=self.ttl_days)
    for entry in base_cache_dir.iterdir():
        metadata = read_metadata(entry)
        if created_at < cutoff:
            rmtree(entry)
            removed += 1
    return removed`}</Pre>

      <div className="info-box tip">
        <div className="info-box-title">💡 Cache Invalidation</div>
        <p>
          Cache entries are invalidated when: source hash changes, DPI changes, max_pages changes, or converter_version updates. The <code>force_conversion</code> config flag bypasses cache entirely.
        </p>
      </div>

      <h2>Thread Safety</h2>
      <p>
        Each worker thread in <code>extract_many()</code> gets its own <code>CacheManager</code> instance with a separate list of ephemeral directories to track and clean up.
      </p>

      <h2>Usage Examples</h2>
      <Pre>{`from pdf_extractor_analyzer.cache import CacheManager, CacheMode
from pathlib import Path

# Persistent cache
cache = CacheManager(
    base_cache_dir=Path("./cache"),
    mode=CacheMode.PERSISTENT,
    ttl_days=7
)

# Get cache directory for PDF
work_dir = cache.resolve_work_dir(content_hash)

# Check if valid cache exists
if cache.is_cache_hit(work_dir, source_hash=hash, dpi=150, max_pages=None):
    # Load from cache
    metadata = cache.read_metadata(work_dir)
    pages = converter.load_from_dir(work_dir)

# Clean old caches
removed = cache.cleanup_expired()`}</Pre>
    </>
  ),
  quiz: [
    {
      question: 'Why does the cache use SHA-256 content hashes instead of filenames?',
      options: [
        'Filenames can be arbitrary; same content should hit same cache',
        'SHA-256 is faster than filename lookup',
        'Filenames are too short for cache keys',
        'It helps with compression'
      ],
      correctIndex: 0,
      explanation: 'Content hashes ensure that the same PDF content always maps to the same cache, regardless of where the file is stored or what its name is.',
    },
    {
      question: 'What data is stored in metadata.json?',
      options: [
        'Only the page count',
        'Page count, DPI, timestamp, source hash, and converter version',
        'Only the file path',
        'The extracted text content'
      ],
      correctIndex: 1,
      explanation: 'Metadata stores page_count, dpi, created_at timestamp, source_hash, max_pages, and converter_version for cache validation.',
    },
    {
      question: 'What does resolve_work_dir() return when CacheMode is DISABLED?',
      options: [
        'The default cache directory', 'A temp directory', 'None', 'An error'],
      correctIndex: 2,
      explanation: 'When caching is disabled, resolve_work_dir() returns None, indicating no cache storage should be used.',
    },
    {
      question: 'How does EPHEMERAL cache mode differ from PERSISTENT?',
      options: [
        'EPHEMERAL stores in memory',
        'EPHEMERAL uses temp directories cleaned after extraction',
        'EPHEMERAL is faster',
        'EPHEMERAL stores smaller files'
      ],
      correctIndex: 1,
      explanation: 'EPHEMERAL mode creates temporary directories that are automatically cleaned up after processing, while PERSISTENT stores in a fixed location.',
    },
  ],
};

export default cacheContent;