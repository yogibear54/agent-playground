import type { ChapterData } from './types';

export const analyzerContent: ChapterData = {
  id: 'analyzer',
  title: 'Vision Analyzer Module',
  description: 'Learn how the analyzer interfaces with Replicate vision models.',
  files: ['src/pdf_extractor_analyzer/analyzer.py'],
  content: (
    <>
      <h2>Module Purpose</h2>
      <p>
        The analyzer module provides the bridge between page images and the vision LLM. It handles API communication, retry logic, prompt building, and output parsing.
      </p>

      <h2>ReplicateVisionAnalyzer Class</h2>
      <p>
        The <code>ReplicateVisionAnalyzer</code> class encapsulates all LLM interaction logic.
      </p>

      <h3>Initialization</h3>
      <pre><code>{`def __init__(self, config: ExtractorConfig):
    self.config = config
    if config.replicate_api_token:
        self.client = replicate.Client(api_token=config.replicate_api_token)
    else:
        self.client = replicate.Client()  # Uses REPLICATE_API_TOKEN env
    
    # Setup logger with configured level
    self._logger = logging.getLogger(f"{__name__}.ReplicateVisionAnalyzer")
    self._logger.setLevel(getattr(logging, config.log_level.upper()))`}</code></pre>

      <h2>Core Methods</h2>

      <h3>analyze_page()</h3>
      <p>
        The primary method for analyzing a single page image:
      </p>
      <pre><code>{`def analyze_page(
    self,
    *,
    image_bytes: bytes,
    mode: ExtractionMode,
    structured_schema: dict | None = None,
    correlation_id: str | None = None,
    page_number: int | None = None,
) -> str | dict[str, Any]:`}</code></pre>

      <h4>Processing Flow</h4>
      <ol>
        <li>Validate image byte size against config limits</li>
        <li>Build prompt based on extraction mode</li>
        <li>Call API with retry logic and fallback model</li>
        <li>Parse output (JSON for structured mode)</li>
        <li>Return extracted content</li>
      </ol>

      <h3>_build_prompt()</h3>
      <p>
        Generates mode-specific prompts for the vision model:
      </p>
      <table className="data-table">
        <thead><tr><th>Mode</th><th>Prompt Strategy</th></tr></thead>
        <tbody>
          <tr><td><code>full_text</code></td><td>"Transcribe all text...Preserve layout hints with line breaks"</td></tr>
          <tr><td><code>summary</code></td><td>"Summarize in 3-5 concise sentences. Include key numbers, dates"</td></tr>
          <tr><td><code>markdown</code></td><td>"Convert to Markdown with proper syntax: headings, bold, lists, code blocks"</td></tr>
          <tr><td><code>structured</code></td><td>"Extract structured information...return JSON only...Use null for unknown"</td></tr>
        </tbody>
      </table>

      <h3>repair_structured_output()</h3>
      <p>
        When structured mode output fails validation, this method attempts repair:
      </p>
      <pre><code>{`def repair_structured_output(
    self,
    candidate: dict,
    validation_error: str,
    structured_schema: dict | None,
    correlation_id: str | None = None,
) -> dict[str, Any]:
    """Send invalid JSON back to LLM with error message for repair."""`}</code></pre>

      <h4>Repair Strategy</h4>
      <ol>
        <li>Size check: Prevent huge payloads</li>
        <li>Send candidate + error + schema to LLM</li>
        <li>Parse repaired JSON</li>
        <li>If still invalid, raise SchemaValidationError</li>
      </ol>

      <h2>Retry Logic</h2>
      <p>
        The <code>_run_with_retries()</code> method implements exponential backoff:
      </p>
      <pre><code>{`# Try primary model, then fallback
for model in [config.model, config.fallback_model]:
    for attempt in range(1, config.max_retries + 1):
        try:
            return call_api(model, prompt, image_bytes)
        except Exception as exc:
            if attempt == max_retries:
                break
            sleep(config.retry_backoff_seconds * (2 ** (attempt - 1)))

raise AnalysisError("All models failed")`}</code></pre>

      <h3>Retry Parameters</h3>
      <ul>
        <li><code>max_retries</code> - Maximum attempts per model (default: 3)</li>
        <li><code>retry_backoff_seconds</code> - Base delay (default: 1.0)</li>
        <li>Delay formula: <code>base_delay * 2^(attempt-1)</code></li>
      </ul>

      <div className="info-box tip">
        <div className="info-box-title">💡 Fallback Model</div>
        <p>
          Configure a cheaper/faster fallback model for resilience. If GPT-4o fails, GPT-4o-mini can often recover at lower cost.
        </p>
      </div>

      <h2>JSON Extraction</h2>
      <p>
        The <code>_extract_json_object()</code> method uses multiple parsing strategies:
      </p>
      <ol>
        <li><strong>Direct parse</strong> - Try <code>json.loads()</code> directly</li>
        <li><strong>Code fences</strong> - Extract from <code>```json ... ```</code> blocks</li>
        <li><strong>Brace extraction</strong> - Find <code>{" {"}</code> and <code>{"}"}</code> boundaries</li>
      </ol>

      <h2>Image Validation</h2>
      <p>
        Before API calls, images are validated:
      </p>
      <pre><code>{`def _validate_image_bytes(self, image_bytes: bytes) -> None:
    image_size = len(image_bytes)
    if image_size > self.config.max_image_bytes:
        raise ValidationError(
            f"Image size ({image_size} bytes) exceeds maximum "
            f"({self.config.max_image_bytes} bytes)"
        )`}</code></pre>

      <h2>Logging</h2>
      <p>
        Structured logging with correlation IDs for tracking:
      </p>
      <pre><code>{`# Generate correlation ID for tracking related operations
cid = str(uuid.uuid4())[:8]

self._logger.info("Starting page analysis", extra={
    "correlation_id": cid,
    "page_number": page_number,
    "mode": mode.value,
    "model": self.config.model,
})`}</code></pre>
    </>
  ),
  quiz: [
    {
      question: 'What happens when the primary model fails all retries?',
      options: [
        'Raises an error immediately',
        'Tries the fallback model',
        'Returns empty result',
        'Skips the page'
      ],
      correctIndex: 1,
      explanation: 'After exhausting retries on the primary model, the analyzer tries the fallback model (configured in ExtractorConfig) before raising AnalysisError.',
    },
    {
      question: 'How does the analyzer handle LLM responses with markdown code fences?',
      options: [
        'Fails with error',
        'Strips markdown formatting',
        'Parses JSON from fenced blocks',
        'Sends back to LLM'
      ],
      correctIndex: 2,
      explanation: 'The _extract_json_object() method tries multiple strategies, including extracting JSON from ```json code fences that LLMs often wrap their responses in.',
    },
    {
      question: 'What is the purpose of repair_structured_output()?',
      options: [
        'Compress large JSON outputs',
        'Attempt to fix invalid JSON with another LLM call',
        'Convert structured to summary mode',
        'Cache structured outputs'
      ],
      correctIndex: 1,
      explanation: 'When structured mode output fails Pydantic validation, repair_structured_output() sends the candidate and error back to the LLM for repair.',
    },
    {
      question: 'What logging level is configured by default?',
      options: ['DEBUG', 'INFO', 'WARNING', 'ERROR'],
      correctIndex: 2,
      explanation: 'The default log_level is "WARNING", which reduces noise while still capturing important issues.',
    },
  ],
};

export default analyzerContent;