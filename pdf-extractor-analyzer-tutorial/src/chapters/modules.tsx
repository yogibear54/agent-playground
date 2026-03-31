import type { ChapterData } from './types';

export const modulesContent: ChapterData = {
  id: 'modules',
  title: 'Key Modules Deep Dive',
  description: 'Explore each module in detail and understand their responsibilities and interfaces.',
  files: [
    'src/pdf_extractor_analyzer/converter.py',
    'src/pdf_extractor_analyzer/cache.py',
    'src/pdf_extractor_analyzer/analyzer.py',
    'src/pdf_extractor_analyzer/pipeline.py',
  ],
  content: (
    <>
      <h2>Module Overview</h2>
      <p>
        Each module in the PDF Extractor Analyzer has a specific responsibility. Understanding these modules is key to working with and extending the codebase.
      </p>

      <h2>1. Converter Module</h2>
      <p>
        <strong>File:</strong> <code>converter.py</code>
      </p>
      <p>
        The converter module handles PDF to image conversion using PyMuPDF (fitz). It's responsible for:
      </p>
      <ul>
        <li>Opening and reading PDF files</li>
        <li>Rendering pages as images at specified DPI</li>
        <li>Saving images to cache or returning as bytes</li>
        <li>Loading previously cached page images</li>
      </ul>

      <h3>Key Class: <code>PDFConverter</code></h3>
      <table className="data-table">
        <thead>
          <tr>
            <th>Method</th>
            <th>Purpose</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>convert()</code></td>
            <td>Convert PDF pages to PNG images with DPI and page limit options</td>
          </tr>
          <tr>
            <td><code>load_from_dir()</code></td>
            <td>Load previously cached page images from a directory</td>
          </tr>
        </tbody>
      </table>

      <h3>Data Class: <code>PageImage</code></h3>
      <p>Each converted page returns a dataclass with:</p>
      <ul>
        <li><code>page_number</code> - 1-indexed page number</li>
        <li><code>width</code> / <code>height</code> - Image dimensions in pixels</li>
        <li><code>image_bytes</code> - Raw PNG bytes for API calls</li>
        <li><code>image_path</code> - Path to saved file (if caching enabled)</li>
      </ul>

      <h2>2. Cache Module</h2>
      <p>
        <strong>File:</strong> <code>cache.py</code>
      </p>
      <p>
        The cache module manages hash-based caching for PDF pages and extraction results. It provides:
      </p>
      <ul>
        <li>SHA-256 content hashing for unique identification</li>
        <li>Persistent and ephemeral cache modes</li>
        <li>TTL-based cache cleanup</li>
        <li>Cache hit validation with metadata comparison</li>
      </ul>

      <h3>Key Functions</h3>
      <table className="data-table">
        <thead>
          <tr>
            <th>Function</th>
            <th>Purpose</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>compute_content_hash()</code></td>
            <td>Generate SHA-256 hash of PDF file content</td>
          </tr>
        </tbody>
      </table>

      <h3>Key Class: <code>CacheManager</code></h3>
      <table className="data-table">
        <thead>
          <tr>
            <th>Method</th>
            <th>Purpose</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>resolve_work_dir()</code></td>
            <td>Create or retrieve cache directory for a PDF</td>
          </tr>
          <tr>
            <td><code>is_cache_hit()</code></td>
            <td>Check if valid cached version exists</td>
          </tr>
          <tr>
            <td><code>read_metadata()</code></td>
            <td>Load cache metadata (page count, DPI, etc.)</td>
          </tr>
          <tr>
            <td><code>write_metadata()</code></td>
            <td>Save metadata after conversion</td>
          </tr>
          <tr>
            <td><code>cleanup_expired()</code></td>
            <td>Remove caches older than TTL</td>
          </tr>
        </tbody>
      </table>

      <h3>Cache Data Structures</h3>
      <p>
        The <code>CacheMetadata</code> dataclass stores comprehensive conversion information:
      </p>
      <ul>
        <li><code>page_count</code> - Number of converted pages</li>
        <li><code>dpi</code> - Resolution used for conversion</li>
        <li><code>created_at</code> - ISO timestamp of cache creation</li>
        <li><code>source_hash</code> - Content hash of source PDF</li>
        <li><code>max_pages</code> - Optional page limit during conversion</li>
        <li><code>converter_version</code> - Version marker for invalidation</li>
      </ul>

      <h2>3. Analyzer Module</h2>
      <p>
        <strong>File:</strong> <code>analyzer.py</code>
      </p>
      <p>
        The analyzer module interfaces with Replicate's API to analyze page images using vision models. Features include:
      </p>
      <ul>
        <li>Configurable model selection (GPT-4o default)</li>
        <li>Fallback model support</li>
        <li>Automatic retry with exponential backoff</li>
        <li>Multiple extraction modes (full_text, summary, structured, markdown)</li>
        <li>Structured output repair on validation failures</li>
      </ul>

      <h3>Key Class: <code>ReplicateVisionAnalyzer</code></h3>
      <table className="data-table">
        <thead>
          <tr>
            <th>Method</th>
            <th>Purpose</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>analyze_page()</code></td>
            <td>Analyze a single page image with retry logic</td>
          </tr>
          <tr>
            <td><code>repair_structured_output()</code></td>
            <td>Attempt to repair invalid JSON output</td>
          </tr>
          <tr>
            <td><code>_build_prompt()</code></td>
            <td>Generate appropriate prompt for extraction mode</td>
          </tr>
          <tr>
            <td><code>_run_with_retries()</code></td>
            <td>Execute API call with exponential backoff</td>
          </tr>
        </tbody>
      </table>

      <h2>4. Pipeline Module</h2>
      <p>
        <strong>File:</strong> <code>pipeline.py</code>
      </p>
      <p>
        The pipeline module is the heart of the extraction system, orchestrating all components to process PDFs end-to-end.
      </p>
      <h3>Key Class: <code>PDFExtractor</code></h3>
      <table className="data-table">
        <thead>
          <tr>
            <th>Method</th>
            <th>Purpose</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>__init__()</code></td>
            <td>Initialize with config and create component instances</td>
          </tr>
          <tr>
            <td><code>extract()</code></td>
            <td>Extract content from a single PDF</td>
          </tr>
          <tr>
            <td><code>extract_many()</code></td>
            <td>Process multiple PDFs with parallel workers</td>
          </tr>
          <tr>
            <td><code>_prepare_pages()</code></td>
            <td>Convert PDF to images or load from cache</td>
          </tr>
          <tr>
            <td><code>_aggregate_outputs()</code></td>
            <td>Combine per-page results into final output</td>
          </tr>
          <tr>
            <td><code>_merge_dicts()</code></td>
            <td>Merge structured outputs from multiple pages</td>
          </tr>
          <tr>
            <td><code>_validate_pdf_path()</code></td>
            <td>Security and format validation for input paths</td>
          </tr>
        </tbody>
      </table>

      <div className="info-box warning">
        <div className="info-box-title">⚠️ Thread Safety</div>
        <p>
          The <code>extract_many()</code> method uses a <code>ThreadPoolExecutor</code> for parallel processing. Each worker gets its own <code>PDFConverter</code> and <code>CacheManager</code> instances, but shares the <code>ReplicateVisionAnalyzer</code> for efficiency.
        </p>
      </div>

      <h2>Module Interaction Flow</h2>
      <p>
        When <code>extract()</code> is called:
      </p>
      <ol>
        <li><strong>Validate</strong> - Check path security and PDF format</li>
        <li><strong>Hash</strong> - Compute SHA-256 of PDF content</li>
        <li><strong>Check Cache</strong> - Look for existing conversion</li>
        <li><strong>Convert</strong> - If cache miss, convert PDF to images</li>
        <li><strong>Analyze</strong> - Send images to vision API</li>
        <li><strong>Aggregate</strong> - Combine results across pages</li>
        <li><strong>Cache</strong> - Store results if persistent mode</li>
        <li><strong>Return</strong> - Return ExtractionResult</li>
      </ol>
    </>
  ),
  diagram: 'data-flow',
  quiz: [
    {
      question: 'What is the primary responsibility of the Converter module?',
      options: [
        'Analyzing images with vision models',
        'Converting PDF pages to PNG images',
        'Managing cache storage',
        'Orchestrating the extraction pipeline',
      ],
      correctIndex: 1,
      explanation: 'The Converter module (converter.py) handles PDF to image conversion using PyMuPDF, rendering pages at specified DPI and returning PageImage dataclasses.',
    },
    {
      question: 'How does the CacheManager identify PDFs uniquely?',
      options: [
        'Using the filename',
        'Using file modification time',
        'Using SHA-256 content hash',
        'Using sequential numbering',
      ],
      correctIndex: 2,
      explanation: 'The CacheManager uses SHA-256 content hashes to uniquely identify PDFs. This ensures the same PDF content always maps to the same cache, regardless of filename.',
    },
    {
      question: 'Which method in PDFExtractor handles parallel processing of multiple PDFs?',
      options: [
        'extract()',
        'extract_many()',
        'process_batch()',
        'parallel_extract()',
      ],
      correctIndex: 1,
      explanation: 'The extract_many() method uses ThreadPoolExecutor to process multiple PDFs concurrently, with configurable max_workers parameter.',
    },
    {
      question: 'What happens when the ReplicateVisionAnalyzer receives invalid JSON from structured mode?',
      options: [
        'Raises an error immediately',
        'Returns the raw text as-is',
        'Attempts to repair the output with another LLM call',
        'Falls back to summary mode',
      ],
      correctIndex: 2,
      explanation: 'The repair_structured_output() method attempts to fix invalid JSON by sending the candidate and validation error back to the LLM with instructions to repair it.',
    },
  ],
};

export default modulesContent;