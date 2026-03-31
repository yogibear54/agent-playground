import type { ChapterData } from './types';

export const exceptionsContent: ChapterData = {
  id: 'exceptions',
  title: 'Exception Handling',
  description: 'Learn about the custom exception hierarchy and error handling strategies.',
  files: ['src/pdf_extractor_analyzer/exceptions.py'],
  content: (
    <>
      <h2>Exception Hierarchy</h2>
      <p>
        The codebase uses a custom exception hierarchy for precise error handling and clear error messages.
      </p>

      <h2>Base Exception</h2>
      <pre><code>{`class PDFExtractorError(Exception):
    """Base exception for the package."""`}</code></pre>
      <p>
        All custom exceptions inherit from <code>PDFExtractorError</code>, making it easy to catch all package-specific errors.
      </p>

      <h2>Exception Types</h2>

      <h3>CacheError</h3>
      <pre><code>{`class CacheError(PDFExtractorError):
    """Raised when cache operations fail."""`}</code></pre>
      <p>
        Thrown for cache read/write failures, invalid metadata, or TTL-related issues.
      </p>
      <h4>Common Causes</h4>
      <ul>
        <li>Corrupted metadata.json file</li>
        <li>Permission denied writing to cache directory</li>
        <li>Disk space issues</li>
      </ul>

      <h3>ConversionError</h3>
      <pre><code>{`class ConversionError(PDFExtractorError):
    """Raised when PDF conversion fails."""`}</code></pre>
      <p>
        Thrown when PDF processing fails in the converter module.
      </p>
      <h4>Common Causes</h4>
      <ul>
        <li>File is not a valid PDF</li>
        <li>PDF is encrypted without password</li>
        <li>PDF has zero pages</li>
        <li>PyMuPDF cannot open the file</li>
      </ul>

      <h3>AnalysisError</h3>
      <pre><code>{`class AnalysisError(PDFExtractorError):
    """Raised when model analysis fails."""`}</code></pre>
      <p>
        Thrown when the LLM API call fails after all retries.
      </p>
      <h4>Common Causes</h4>
      <ul>
        <li>API timeout</li>
        <li>Network errors</li>
        <li>Invalid API response</li>
        <li>All models exhausted (primary + fallback)</li>
      </ul>

      <h3>SchemaValidationError</h3>
      <pre><code>{`class SchemaValidationError(PDFExtractorError):
    """Raised when structured output cannot be validated."""`}</code></pre>
      <p>
        Thrown when structured extraction output fails validation after repair attempts.
      </p>

      <h3>ValidationError</h3>
      <pre><code>{`class ValidationError(PDFExtractorError):
    """Raised when input validation fails."""
    
    def __init__(self, message: str, *, field: str | None = None, value: object = None):
        super().__init__(message)
        self.field = field
        self.value = value`}</code></pre>
      <p>
        The most detailed exception, carrying field and value information for debugging.
      </p>
      <h4>Validation Checks</h4>
      <ul>
        <li>Path traversal attempts (security)</li>
        <li>Non-existent files</li>
        <li>Non-PDF files (magic byte check)</li>
        <li>Image dimension violations</li>
        <li>Image size violations</li>
        <li>PDF file size violations</li>
      </ul>

      <h2>Error Handling Strategies</h2>

      <h3>Path Validation</h3>
      <pre><code>{`def _validate_pdf_path(self, path: Path) -> None:
    # Path traversal check
    try:
        resolved = path.resolve()
        allowed_root = Path.cwd()
        resolved.relative_to(allowed_root)
    except ValueError:
        raise ValidationError(
            f"Path escapes allowed directory: {path}",
            field="pdf_path",
            value=str(path)
        )
    
    # Magic bytes check
    with path.open("rb") as f:
        header = f.read(4)
        if header != b"%PDF":
            raise ValidationError(
                f"File does not appear to be a valid PDF: {path}",
                field="pdf_path",
                value=str(path)
            )`}</code></pre>

      <h3>API Retry Handling</h3>
      <pre><code>{`try:
    output = self._run_with_retries(model, image_bytes)
    return self._extract_json_object(output)
except AnalysisError:
    logger.error("Page analysis failed after all retries")
    raise`}</code></pre>

      <h3>Batch Error Handling</h3>
      <pre><code>{`# In extract_many()
for future in as_completed(futures):
    try:
        result = future.result()
        results[idx] = BatchExtractionItem(
            pdf_path=str(path),
            status=BatchItemStatus.SUCCESS,
            result=result,
        )
    except Exception as exc:
        if not continue_on_error:
            raise
        results[idx] = BatchExtractionItem(
            pdf_path=str(path),
            status=BatchItemStatus.ERROR,
            error=str(exc),
        )`}</code></pre>

      <div className="info-box success">
        <div className="info-box-title">✓ Error Recovery</div>
        <p>
          The combination of individual validation, retry logic, and batch error handling provides multiple layers of robustnesswithout sacrificing user experience.
        </p>
      </div>

      <h2>Logging Errors</h2>
      <p>
        All exceptions are logged with context:
      </p>
      <pre><code>{`logger.error(
    f"All {len(candidate_models)} models failed after retries",
    extra={
        "correlation_id": cid,
        "page_number": page_number,
        "attempts": self.config.max_retries,
        "last_error": str(last_error)[:200],
    },
)`}</code></pre>

      <h2>Usage Examples</h2>
      <pre><code>{`from pdf_extractor_analyzer import PDFExtractor
from pdf_extractor_analyzer.exceptions import (
    PDFExtractorError, ValidationError, ConversionError
)

extractor = PDFExtractor()

try:
    result = extractor.extract("document.pdf", mode=ExtractionMode.SUMMARY)
except ValidationError as e:
    print(f"Invalid input: {e.field} = {e.value}")
    print(f"Message: {e}")
except ConversionError as e:
    print(f"PDF conversion failed: {e}")
except AnalysisError as e:
    print(f"LLM analysis failed: {e}")
except PDFExtractorError as e:
    print(f"General error: {e}")`}</code></pre>
    </>
  ),
  diagram: 'class-hierarchy',
  quiz: [
    {
      question: 'What is the parent class of all custom exceptions?',
      options: ['Exception', 'PDFExtractorError', 'ValueError', 'RuntimeError'],
      correctIndex: 1,
      explanation: 'All custom exceptions inherit from PDFExtractorError, making it easy to catch all package-specific errors with a single except block.',
    },
    {
      question: 'Which exception includes field and value attributes for debugging?',
      options: ['CacheError', 'ConversionError', 'AnalysisError', 'ValidationError'],
      correctIndex: 3,
      explanation: 'ValidationError includes optional field and value attributes providing context about what failed validation.',
    },
    {
      question: 'When does SchemaValidationError get raised?',
      options: [
        'When JSON parsing fails',
        'When structured mode output fails validation after repair',
        'When schema import fails',
        'When Pydantic model creation fails'
      ],
      correctIndex: 1,
      explanation: 'SchemaValidationError is raised when structured extraction output fails Pydantic validation even after attempting repair with another LLM call.',
    },
    {
      question: 'How does extract_many() handle individual file failures?',
      options: [
        'Stops immediately',
        'Returns error info in BatchExtractionItem',
        'Raises exception',
        'Skips silently'
      ],
      correctIndex: 1,
      explanation: 'When continue_on_error=True (default), failures are captured in BatchExtractionItem with status=ERROR and error message.',
    },
  ],
};

export default exceptionsContent;