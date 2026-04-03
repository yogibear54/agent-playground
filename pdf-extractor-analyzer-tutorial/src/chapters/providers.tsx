import type { ChapterData } from './types';
import Pre from '../components/Pre';

export const providersContent: ChapterData = {
  id: 'providers',
  title: 'Provider Adapters',
  description: 'Understand the port-and-adapters architecture for LLM providers and how to add new providers.',
  files: [
    'src/pdf_extractor_analyzer/ports/llm_provider.py',
    'src/pdf_extractor_analyzer/adapters/llm/replicate_adapter.py',
    'src/pdf_extractor_analyzer/adapters/llm/openrouter_adapter.py',
    'src/pdf_extractor_analyzer/provider_factory.py',
  ],
  content: (
    <>
      <h2>Introduction</h2>
      <p>
        The PDF Extractor Analyzer uses a <strong>port-and-adapters (hexagonal) architecture</strong> for LLM provider integration. This design allows the application to work with different vision model providers without changing the core analyzer logic.
      </p>

      <h2>Why Port-and-Adapters?</h2>
      <p>
        The port-and-adapters pattern provides several benefits:
      </p>
      <ul>
        <li><strong>Provider Agnosticism</strong> - The analyzer doesn't know which provider it's using</li>
        <li><strong>Easy Testing</strong> - Mock the port for unit tests without real API calls</li>
        <li><strong>Extensibility</strong> - Add new providers without changing existing code</li>
        <li><strong>Maintainability</strong> - Provider-specific logic is isolated in adapters</li>
      </ul>

      <h2>The Port Contract</h2>
      <p>
        The <code>LLMProviderPort</code> protocol defines the contract that all provider adapters must implement. It's defined in <code>ports/llm_provider.py</code>:
      </p>

      <h3>Required Methods</h3>
      <Pre>{`from pdf_extractor_analyzer.ports.llm_provider import LLMProviderPort

class LLMProviderPort(Protocol):
    @property
    def provider_name(self) -> str:
        """Stable provider identifier (e.g. 'replicate', 'openrouter')."""

    def generate(self, request: LLMRequest) -> LLMResponse:
        """Run a synchronous model inference request."""

    async def agenerate(self, request: LLMRequest) -> LLMResponse:
        """Run an asynchronous model inference request."""`}</Pre>

      <h3>Data Structures</h3>
      <p>
        The port defines normalized request and response types:
      </p>

      <h4>LLMRequest</h4>
      <Pre>{`@dataclass
class LLMRequest:
    prompt: str
    model: str
    image_bytes: bytes | None = None
    timeout_seconds: int | None = None
    generation: GenerationParams  # temp, top_p, etc.
    metadata: dict[str, Any]  # correlation_id, page_number, etc.`}</Pre>

      <h4>LLMResponse</h4>
      <Pre>{`@dataclass
class LLMResponse:
    text: str  # Normalized text output
    provider: str  # Provider identifier
    model: str  # Model used
    raw_output: Any | None  # Raw provider response`}</Pre>

      <h4>ProviderError</h4>
      <Pre>{`class ProviderError(Exception):
    def __init__(
        self,
        message: str,
        *,
        provider: str,
        code: ProviderErrorCode,
        model: str | None = None,
        retryable: bool | None = None,  # Hint for retry logic
        cause: BaseException | None = None,
    ):
        ...

# Error codes: AUTHENTICATION, RATE_LIMIT, TIMEOUT,
# INVALID_REQUEST, SERVICE_UNAVAILABLE, UNKNOWN`}</Pre>

      <h2>Existing Adapters</h2>

      <h3>ReplicateLLMAdapter</h3>
      <p>
        The Replicate adapter implements the port for Replicate's vision models:
      </p>
      <Pre>{`from pdf_extractor_analyzer.adapters.llm import ReplicateLLMAdapter

adapter = ReplicateLLMAdapter(config)
response = adapter.generate(LLMRequest(...))`}</Pre>

      <h4>Key Features</h4>
      <ul>
        <li>Supports both sync and async inference</li>
        <li>Handles Replicate-specific error codes</li>
        <li>Converts images to data URLs for the API</li>
        <li>Normalizes output to string format</li>
      </ul>

      <h3>OpenRouterLLMAdapter</h3>
      <p>
        The OpenRouter adapter implements the port for OpenRouter's API:
      </p>
      <Pre>{`from pdf_extractor_analyzer.adapters.llm import OpenRouterLLMAdapter

adapter = OpenRouterLLMAdapter(config)
response = adapter.generate(LLMRequest(...))`}</Pre>

      <h4>Key Features</h4>
      <ul>
        <li>Uses standard HTTP POST requests</li>
        <li>Maps HTTP status codes to ProviderError</li>
        <li>Supports OpenRouter's multi-model routing</li>
        <li>Handles complex response structures</li>
      </ul>

      <h2>Provider Factory</h2>
      <p>
        The <code>provider_factory.py</code> module creates provider instances based on configuration:
      </p>
      <Pre>{`from pdf_extractor_analyzer.provider_factory import create_llm_provider

provider = create_llm_provider(config)  # Returns LLMProviderPort

# The factory uses config.provider to select the adapter:
# - "replicate" -> ReplicateLLMAdapter
# - "openrouter" -> OpenRouterLLMAdapter`}</Pre>

      <h3>Registering Custom Providers</h3>
      <p>
        You can register custom provider builders at runtime:
      </p>
      <Pre>{`from pdf_extractor_analyzer.provider_factory import register_provider_builder

def build_my_provider(config):
    return MyProviderAdapter(config)

register_provider_builder("myprovider", build_my_provider)

# Now use it:
config = ExtractorConfig(provider="myprovider")
provider = create_llm_provider(config)`}</Pre>

      <h2>Adding a New Provider</h2>
      <p>
        To add a new LLM provider, follow these steps:
      </p>

      <h3>1. Create the Adapter</h3>
      <Pre>{`# In src/pdf_extractor_analyzer/adapters/llm/myprovider_adapter.py

from pdf_extractor_analyzer.ports.llm_provider import (
    LLMProviderPort,
    LLMRequest,
    LLMResponse,
    ProviderError,
    ProviderErrorCode,
)

class MyProviderLLMAdapter(LLMProviderPort):
    @property
    def provider_name(self) -> str:
        return "myprovider"

    def generate(self, request: LLMRequest) -> LLMResponse:
        try:
            # Call your provider's API here
            output = self._call_api(request)
            return LLMResponse(
                text=self._normalize(output),
                provider=self.provider_name,
                model=request.model,
                raw_output=output,
            )
        except Exception as exc:
            raise self._to_provider_error(exc, model=request.model) from exc

    async def agenerate(self, request: LLMRequest) -> LLMResponse:
        # Implement async version or delegate to sync
        return await asyncio.to_thread(self.generate, request)`}</Pre>

      <h3>2. Map Provider Errors</h3>
      <p>
        Implement <code>_to_provider_error()</code> to map provider-specific exceptions to <code>ProviderError</code>:
      </p>
      <Pre>{`def _to_provider_error(self, exc: Exception, *, model: str) -> ProviderError:
    # Map HTTP status codes or provider error codes
    if isinstance(exc, HTTPError):
        if exc.status == 401:
            code = ProviderErrorCode.AUTHENTICATION
            retryable = False
        elif exc.status == 429:
            code = ProviderErrorCode.RATE_LIMIT
            retryable = True
        elif exc.status >= 500:
            code = ProviderErrorCode.SERVICE_UNAVAILABLE
            retryable = True
        else:
            code = ProviderErrorCode.INVALID_REQUEST
            retryable = False

        return ProviderError(
            str(exc),
            provider=self.provider_name,
            code=code,
            model=model,
            retryable=retryable,
            cause=exc,
        )

    return ProviderError(str(exc), provider=self.provider_name, model=model)`}</Pre>

      <h3>3. Register the Provider</h3>
      <Pre>{`# In provider_factory.py

def _build_myprovider_provider(config: ExtractorConfig) -> LLMProviderPort:
    from .adapters.llm import MyProviderLLMAdapter
    return MyProviderLLMAdapter(config)

_PROVIDER_BUILDERS["myprovider"] = _build_myprovider_provider`}</Pre>

      <h3>4. Add Configuration</h3>
      <p>
        Add provider-specific configuration if needed:
      </p>
      <Pre>{`# In config.py

@dataclass(slots=True)
class MyProviderProviderConfig:
    api_key: str | None = None
    model: str | None = None
    fallback_model: str | None = None
    # Add provider-specific settings

@dataclass(slots=True)
class ExtractorConfig:
    # ...
    myprovider: MyProviderProviderConfig = field(default_factory=MyProviderProviderConfig)`}</Pre>

      <h3>5. Add Tests</h3>
      <Pre>{`# Unit tests for adapter
def test_myprovider_adapter_generate():
    adapter = MyProviderLLMAdapter(config)
    request = LLMRequest(prompt="test", model="model-1")
    response = adapter.generate(request)
    assert response.provider == "myprovider"
    assert isinstance(response.text, str)

# Integration test with live marker
@pytest.mark.live_myprovider
def test_myprovider_live():
    # Requires MYPROVIDER_API_KEY env var
    ...

# Provider factory test
def test_provider_factory_myprovider():
    config = ExtractorConfig(provider="myprovider")
    provider = create_llm_provider(config)
    assert isinstance(provider, MyProviderLLMAdapter)`}</Pre>

      <h2>Provider Selection Flow</h2>
      <p>
        When you create a <code>PDFExtractor</code>, the provider is resolved as follows:
      </p>
      <ol>
        <li><code>config.provider</code> specifies the provider name (e.g., "replicate", "openrouter")</li>
        <li><code>create_llm_provider(config)</code> looks up the builder function</li>
        <li>The builder creates the adapter instance with provider-specific config</li>
        <li>The adapter is passed to <code>VisionAnalyzer</code></li>
      </ol>

      <Pre>{`# Complete flow example
config = ExtractorConfig(
    provider="openrouter",
    openrouter=OpenRouterProviderConfig(api_key="sk-...")
)

# PDFExtractor internally:
provider = create_llm_provider(config)  # Returns OpenRouterLLMAdapter
analyzer = VisionAnalyzer(config, provider=provider)  # Provider-agnostic`}</Pre>

      <div className="info-box tip">
        <div className="info-box-title">Testing Tip</div>
        <p>
          Use <code>unittest.mock</code> or <code>pytest-mock</code> to create a mock LLMProviderPort for testing the analyzer and pipeline without making real API calls:
        </p>
        <Pre>{`def mock_provider_factory(config):
    return MockLLMProvider()

# Monkey patch the factory during tests
with patch('pdf_extractor_analyzer.pipeline.create_llm_provider', mock_provider_factory):
    extractor = PDFExtractor(config)
    result = extractor.extract(...)  # Uses mock provider`}</Pre>
      </div>

      <h2>Summary</h2>
      <p>
        The port-and-adapters architecture provides a clean separation between the extraction logic and provider-specific implementation. This makes the codebase:
      </p>
      <ul>
        <li><strong>Testable</strong> - Mock the port for unit tests</li>
        <li><strong>Extensible</strong> - Add new providers without changing core logic</li>
        <li><strong>Maintainable</strong> - Provider code is isolated</li>
        <li><strong>Flexible</strong> - Switch providers via configuration</li>
      </ul>
    </>
  ),
  quiz: [
    {
      question: 'What is the main benefit of the port-and-adapters architecture?',
      options: [
        'Faster performance',
        'Provider agnosticism and easy extensibility',
        'Smaller file sizes',
        'Better documentation',
      ],
      correctIndex: 1,
      explanation: 'The port-and-adapters architecture makes the application provider-agnostic and allows adding new providers without changing core logic.',
    },
    {
      question: 'What methods must an LLMProviderPort implement?',
      options: [
        'Only generate()',
        'Only agenerate()',
        'provider_name, generate(), and agenerate()',
        'Only provider_name',
      ],
      correctIndex: 2,
      explanation: 'The LLMProviderPort protocol requires the provider_name property and both generate() (sync) and agenerate() (async) methods.',
    },
    {
      question: 'How do you add a new provider to the system?',
      options: [
        'Modify the analyzer.py file',
        'Implement LLMProviderPort and register in provider_factory.py',
        'Add it to config.py only',
        'Create a new CLI command',
      ],
      correctIndex: 1,
      explanation: 'To add a new provider, implement the LLMProviderPort interface, create the adapter, and register it in the provider factory.',
    },
    {
      question: 'What is the purpose of ProviderError.retryable?',
      options: [
        'To track how many retries occurred',
        'To indicate if the error should be retried',
        'To log retry attempts',
        'To disable retries completely',
      ],
      correctIndex: 1,
      explanation: 'The retryable field in ProviderError provides a hint to the retry logic about whether the error can be retried (e.g., rate limit errors are retryable, auth errors are not).',
    },
  ],
};

export default providersContent;
