import type { ChapterData } from './types';
import Pre from '../components/Pre';

export const analyzerContent: ChapterData = {
  id: 'analyzer',
  title: 'Vision Analyzer Module',
  description: 'Learn how the analyzer interfaces with Replicate vision models.',
  files: ['src/pdf_extractor_analyzer/analyzer.py'],
  content: (
    <>
      <h2>Module Purpose</h2>
      <p>
        The analyzer module provides the bridge between page images and vision LLMs through a provider-agnostic interface. It handles API communication via provider adapters, retry logic, prompt building, and output parsing. It supports both synchronous and asynchronous operations.
      </p>

      <h2>VisionAnalyzer Class</h2>
      <p>
        The <code>VisionAnalyzer</code> class is the provider-agnostic analyzer that works with any LLM provider adapter implementing the <code>LLMProviderPort</code> interface.
      </p>

      <h3>Initialization</h3>
      <Pre>{`from pdf_extractor_analyzer.analyzer import VisionAnalyzer
from pdf_extractor_analyzer.provider_factory import create_llm_provider

# The provider factory creates the appropriate adapter
provider = create_llm_provider(config)
analyzer = VisionAnalyzer(config, provider=provider)

# Or let PDFExtractor create it for you
from pdf_extractor_analyzer import PDFExtractor
extractor = PDFExtractor(config)  # Creates VisionAnalyzer internally`}</Pre>

      <div className="info-box tip">
        <div className="info-box-title">💡 Provider-Agnostic Design</div>
        <p>
          The VisionAnalyzer doesn't know which specific provider it's using. It communicates through the LLMProviderPort interface, making it easy to swap providers without changing analyzer logic.
        </p>
      </div>

      <h2>Core Methods</h2>

      <h3>analyze_page() - Synchronous</h3>
      <p>
        The primary method for analyzing a single page image synchronously:
      </p>
      <Pre>{`def analyze_page(
    self,
    *,
    image_bytes: bytes,
    mode: ExtractionMode,
    structured_schema: dict | None = None,
    correlation_id: str | None = None,
    page_number: int | None = None,
) -> str | dict[str, Any]:`}</Pre>

      <h4>Processing Flow</h4>
      <ol>
        <li>Validate image byte size against config limits</li>
        <li>Build prompt based on extraction mode</li>
        <li>Call provider via LLMRequest with retry logic and fallback model</li>
        <li>Parse LLMResponse (JSON for structured mode)</li>
        <li>Return extracted content</li>
      </ol>

      <h3>analyze_page_async() - Asynchronous</h3>
      <p>
        The async version for concurrent page processing:
      </p>
      <Pre>{`async def analyze_page_async(
    self,
    *,
    image_bytes: bytes,
    mode: ExtractionMode,
    structured_schema: dict | None = None,
    correlation_id: str | None = None,
    page_number: int | None = None,
    rate_limit_coro: Callable[[], Awaitable[None]] | None = None,
) -> str | dict[str, Any]:`}</Pre>

      <h4>Key Differences</h4>
      <ul>
        <li><code>rate_limit_coro</code> - Optional coroutine for rate limiting</li>
        <li>Uses <code>provider.agenerate()</code> instead of <code>provider.generate()</code></li>
        <li>Supports concurrent processing with asyncio</li>
      </ul>

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
      <Pre>{`def repair_structured_output(
    self,
    candidate: dict,
    validation_error: str,
    structured_schema: dict | None,
    correlation_id: str | None = None,
) -> dict[str, Any]:
    """Send invalid JSON back to LLM with error message for repair."""`}</Pre>

      <h4>Repair Strategy</h4>
      <ol>
        <li>Size check: Prevent huge payloads</li>
        <li>Send candidate + error + schema to LLM</li>
        <li>Parse repaired JSON</li>
        <li>If still invalid, raise SchemaValidationError</li>
      </ol>

      <h2>Retry Logic</h2>
      <p>
        The <code>_run_with_retries()</code> method implements exponential backoff with provider-specific retry policies:
      </p>
      <Pre>{`# Try primary model, then fallback
for model in [config.get_primary_model(), config.get_fallback_model()]:
    for attempt in range(1, config.max_retries + 1):
        try:
            request = LLMRequest(
                prompt=prompt,
                model=model,
                image_bytes=image_bytes,
                timeout_seconds=self.config.timeout_seconds,
                generation=self._generation_params(),
            )
            response = self.provider.generate(request)
            return response.text
        except ProviderError as exc:
            # Respect provider's retry recommendation
            if exc.retryable is False:
                break
            if attempt == self.config.max_retries:
                break
            sleep(config.retry_backoff_seconds * (2 ** (attempt - 1)))

raise AnalysisError("All models failed")`}</Pre>

      <h3>Provider-Aware Retry</h3>
      <ul>
        <li>Providers indicate if errors are retryable via <code>ProviderError.retryable</code></li>
        <li>Authentication errors (401) are never retried</li>
        <li>Rate limit errors (429) are always retried with backoff</li>
        <li>Service unavailable errors (503) are retried</li>
      </ul>

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
      <Pre>{`def _validate_image_bytes(self, image_bytes: bytes) -> None:
    image_size = len(image_bytes)
    if image_size > self.config.max_image_bytes:
        raise ValidationError(
            f"Image size ({image_size} bytes) exceeds maximum "
            f"({self.config.max_image_bytes} bytes)"
        )`}</Pre>

      <h2>Logging</h2>
      <p>
        Structured logging with correlation IDs for tracking:
      </p>
      <Pre>{`# Generate correlation ID for tracking related operations
cid = str(uuid.uuid4())[:8]

self._logger.info("Starting page analysis", extra={
    "correlation_id": cid,
    "page_number": page_number,
    "mode": mode.value,
    "model": self.config.model,
})`}</Pre>
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