import type { ChapterData } from './types';
import Pre from '../components/Pre';

export const converterContent: ChapterData = {
  id: 'converter',
  title: 'PDF Converter Module',
  description: 'Learn how PDFs are converted to images using PyMuPDF.',
  files: ['src/pdf_extractor_analyzer/converter.py'],
  content: (
    <>
      <h2>Module Purpose</h2>
      <p>
        The converter module bridges the gap between PDF documents and vision-capable LLMs. By rendering PDF pages as images, it enables any vision model to process documents regardless of their underlying text encoding.
      </p>

      <h2>Dependencies</h2>
      <ul>
        <li><strong>PyMuPDF (fitz)</strong> - Fast PDF rendering library</li>
        <li><strong>Pillow (PIL)</strong> - Image manipulation utilities</li>
      </ul>

      <h2>PageImage Dataclass</h2>
      <p>
        The module defines a frozen dataclass for page data:
      </p>
      <Pre>{`@dataclass(slots=True)
class PageImage:
    page_number: int      # 1-indexed
    width: int            # Pixels
    height: int           # Pixels
    image_bytes: bytes    # Raw PNG data
    image_path: Path | None  # File path (if cached)`}</Pre>

      <h2>PDFConverter Class</h2>

      <h3>convert() Method</h3>
      <p>
        The main conversion method handles the full PDF processing pipeline.
      </p>

      <h4>Parameters</h4>
      <ul>
        <li><code>pdf_path</code> - Path to the PDF file</li>
        <li><code>dpi</code> - Resolution for rendering (default 150)</li>
        <li><code>output_dir</code> - Optional directory to save images</li>
        <li><code>max_pages</code> - Optional page limit</li>
        <li><code>max_image_width/height</code> - Size validation limits</li>
      </ul>

      <h4>Processing Steps</h4>
      <ol>
        <li><strong>Open PDF</strong> - Uses fitz.open() to load the document</li>
        <li><strong>Validate</strong> - Check for encryption and empty documents</li>
        <li><strong>Render pages</strong> - Create pixmap at specified DPI</li>
        <li><strong>Validate dimensions</strong> - Ensure images don't exceed size limits</li>
        <li><strong>Save/Return</strong> - Optionally save to disk, always return bytes</li>
      </ol>

      <h3>load_from_dir() Method</h3>
      <p>
        Loads previously cached page images from a directory. This is used when cache hits occur.
      </p>
      <Pre>{`def load_from_dir(self, cache_dir: Path) -> list[PageImage]:
    """Load images from cache directory.
    
    Expects files named page_001.png, page_002.png, etc.
    Returns list of PageImage dataclasses with bytes.
    """`}</Pre>

      <h2>Error Handling</h2>
      <p>
        The module defines custom exceptions:
      </p>
      <ul>
        <li><code>ConversionError</code> - Raised when PDF processing fails</li>
        <li><code>ValidationError</code> - Raised for image dimension violations</li>
      </ul>

      <div className="info-box warning">
        <div className="info-box-title">⚠️ Encrypted PDFs</div>
        <p>
          Encrypted PDFs are not supported. The converter checks <code>doc.needs_pass</code> and raises a <code>ConversionError</code> if encryption is detected.
        </p>
      </div>

      <h2>DPI Considerations</h2>
      <p>
        The DPI setting directly affects image size and quality:
      </p>
      <table className="data-table">
        <thead><tr><th>DPI</th><th>Use Case</th><th>Trade-off</th></tr></thead>
        <tbody>
          <tr><td>72</td><td>Quick previews</td><td>Low quality, small files</td></tr>
          <tr><td>150</td><td>Standard documents</td><td>Balanced (default)</td></tr>
          <tr><td>300</td><td>High-quality OCR</td><td>Large files, better accuracy</td></tr>
          <tr><td>600</td><td>Archival quality</td><td>Very large files, highest accuracy</td></tr>
        </tbody>
      </table>

      <h2>Thread Safety</h2>
      <p>
        The <code>PDFConverter</code> class creates new instances for each thread in batch processing. This ensures thread safety when using <code>extract_many()</code>.
      </p>

      <h2>Example Usage</h2>
      <Pre>{`from pdf_extractor_analyzer.converter import PDFConverter
from pathlib import Path

converter = PDFConverter()
pages = converter.convert(
    Path("document.pdf"),
    dpi=300,
    max_pages=5
)

for page in pages:
    print(f"Page {page.page_number}: {page.width}x{page.height}")
    # page.image_bytes contains PNG data`}</Pre>
    </>
  ),
  diagram: 'cache-flow',
  quiz: [
    {
      question: 'Which library does the converter use to render PDF pages?',
      options: ['pdfminer', 'pypdf2', 'pymupdf (fitz)', 'reportlab'],
      correctIndex: 2,
      explanation: 'The converter uses PyMuPDF (imported as fitz) for fast PDF rendering with no external dependencies like poppler.',
    },
    {
      question: 'What happens when an encrypted PDF is passed to the converter?',
      options: ['It prompts for password', 'It raises ConversionError', 'It skips decryption', 'It returns empty pages'],
      correctIndex: 1,
      explanation: 'The converter checks doc.needs_pass and raises ConversionError with message "Encrypted PDFs are not supported without a password".',
    },
    {
      question: 'Why does PageImage store both image_bytes and image_path?',
      options: ['For redundancy', 'To support both API calls and caching', 'For compression', 'For debugging only'],
      correctIndex: 1,
      explanation: 'image_bytes is used for direct API calls while image_path references the cached file when persistent caching is enabled.',
    },
    {
      question: 'What is the recommended DPI for standard document processing?',
      options: ['72 DPI', '150 DPI', '300 DPI', '600 DPI'],
      correctIndex: 1,
      explanation: '150 DPI is the default and recommended for standard documents, providing a good balance between quality and file size.',
    },
  ],
};

export default converterContent;