import type { ChapterData } from './types';
import Pre from '../components/Pre';

export const configContent: ChapterData = {
  id: 'config',
  title: 'Configuration System',
  description: 'Understand how the configuration system works with validated dataclasses.',
  files: ['src/pdf_extractor_analyzer/config.py'],
  content: (
    <>
      <h2>Configuration Overview</h2>
      <p>
        The configuration system uses Python's <code>@dataclass</code> decorator with slots for memory efficiency and a comprehensive <code>validate()</code> method that ensures all parameters are within acceptable bounds.
      </p>

      <h2>ExtractorConfig Dataclass</h2>
      <p>
        The <code>ExtractorConfig</code> class encapsulates all configurable parameters for PDF extraction. It uses frozen slots for performance. The configuration now includes provider-specific settings following the port-and-adapters architecture.
      </p>

      <h3>Conversion Settings</h3>
      <table className="data-table">
        <thead><tr><th>Parameter</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>dpi</code></td><td>int</td><td>150</td><td>Resolution for PDF to image conversion</td></tr>
          <tr><td><code>max_pages</code></td><td>int | None</td><td>None</td><td>Optional limit on pages to process</td></tr>
          <tr><td><code>force_conversion</code></td><td>bool</td><td>False</td><td>Force re-conversion even if cached</td></tr>
        </tbody>
      </table>

      <h3>Cache Settings</h3>
      <table className="data-table">
        <thead><tr><th>Parameter</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>cache_dir</code></td><td>Path</td><td>./cache</td><td>Directory for persistent cache storage</td></tr>
          <tr><td><code>cache_mode</code></td><td>CacheMode</td><td>PERSISTENT</td><td>Cache behavior mode</td></tr>
          <tr><td><code>cache_ttl_days</code></td><td>int</td><td>7</td><td>Days before cache entries expire</td></tr>
        </tbody>
      </table>

      <h3>Provider Settings</h3>
      <table className="data-table">
        <thead><tr><th>Parameter</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>provider</code></td><td>str</td><td>replicate</td><td>LLM provider (replicate, openrouter)</td></tr>
          <tr><td><code>model</code></td><td>str</td><td>openai/gpt-4o</td><td>Primary model (provider-specific)</td></tr>
          <tr><td><code>fallback_model</code></td><td>str | None</td><td>openai/gpt-4o-mini</td><td>Fallback model on primary failure</td></tr>
        </tbody>
      </table>

      <h3>Replicate Provider Configuration</h3>
      <p>The <code>replicate</code> field is a <code>ReplicateProviderConfig</code> instance:</p>
      <table className="data-table">
        <thead><tr><th>Parameter</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>api_token</code></td><td>str | None</td><td>None</td><td>Replicate API token (or env var)</td></tr>
          <tr><td><code>max_concurrent_calls</code></td><td>int</td><td>1</td><td>Max concurrent Replicate submissions</td></tr>
          <tr><td><code>model</code></td><td>str | None</td><td>None</td><td>Override default model</td></tr>
          <tr><td><code>fallback_model</code></td><td>str | None</td><td>None</td><td>Override default fallback model</td></tr>
        </tbody>
      </table>

      <h3>OpenRouter Provider Configuration</h3>
      <p>The <code>openrouter</code> field is a <code>OpenRouterProviderConfig</code> instance:</p>
      <table className="data-table">
        <thead><tr><th>Parameter</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>api_key</code></td><td>str | None</td><td>None</td><td>OpenRouter API key (or env var)</td></tr>
          <tr><td><code>base_url</code></td><td>str</td><td>https://openrouter.ai/api/v1</td><td>OpenRouter API base URL</td></tr>
          <tr><td><code>model</code></td><td>str | None</td><td>None</td><td>Override default model</td></tr>
          <tr><td><code>fallback_model</code></td><td>str | None</td><td>None</td><td>Override default fallback model</td></tr>
        </tbody>
      </table>

      <h3>Retry and Timeout Settings</h3>
      <table className="data-table">
        <thead><tr><th>Parameter</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>max_retries</code></td><td>int</td><td>3</td><td>Number of API retry attempts</td></tr>
          <tr><td><code>retry_backoff_seconds</code></td><td>float</td><td>1.0</td><td>Base delay for exponential backoff</td></tr>
          <tr><td><code>timeout_seconds</code></td><td>int</td><td>60</td><td>API call timeout</td></tr>
        </tbody>
      </table>

      <h3>Concurrency Controls</h3>
      <table className="data-table">
        <thead><tr><th>Parameter</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>max_concurrent_pages</code></td><td>int</td><td>4</td><td>Per-document async page concurrency limit</td></tr>
          <tr><td><code>async_requests_per_second</code></td><td>float</td><td>8.0</td><td>Per-document async request rate limit</td></tr>
        </tbody>
      </table>

      <h3>Security Limits</h3>
      <table className="data-table">
        <thead><tr><th>Parameter</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>image_max_long_edge</code></td><td>int | None</td><td>None</td><td>Cap longest edge of rendered images</td></tr>
          <tr><td><code>max_image_width</code></td><td>int</td><td>8000</td><td>Maximum image width in pixels</td></tr>
          <tr><td><code>max_image_height</code></td><td>int</td><td>8000</td><td>Maximum image height in pixels</td></tr>
          <tr><td><code>max_image_bytes</code></td><td>int</td><td>20MB</td><td>Maximum image file size</td></tr>
          <tr><td><code>max_pdf_file_size</code></td><td>int | None</td><td>None</td><td>Maximum PDF file size</td></tr>
        </tbody>
      </table>

      <h3>Model API Parameters</h3>
      <table className="data-table">
        <thead><tr><th>Parameter</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>max_completion_tokens</code></td><td>int</td><td>4096</td><td>Maximum output tokens</td></tr>
          <tr><td><code>temperature</code></td><td>float</td><td>0.0</td><td>Sampling temperature</td></tr>
          <tr><td><code>top_p</code></td><td>float</td><td>1.0</td><td>Top-p sampling</td></tr>
          <tr><td><code>presence_penalty</code></td><td>float</td><td>0.0</td><td>Presence penalty</td></tr>
          <tr><td><code>frequency_penalty</code></td><td>float</td><td>0.0</td><td>Frequency penalty</td></tr>
          <tr><td><code>log_level</code></td><td>str</td><td>WARNING</td><td>Logging verbosity</td></tr>
        </tbody>
      </table>

      <h2>Provider Model Resolution</h2>
      <p>
        The configuration uses smart model resolution based on the selected provider:
      </p>
      <ul>
        <li><strong>Replicate provider</strong>: Uses <code>openai/gpt-4o</code> by default</li>
        <li><strong>OpenRouter provider</strong>: Uses <code>z-ai/glm-4.6v</code> by default with <code>openrouter/auto</code> as fallback</li>
        <li>Provider-specific configs override the default models</li>
        <li>Legacy <code>model</code> and <code>fallback_model</code> fields are preserved for backward compatibility</li>
      </ul>

      <div className="info-box tip">
        <div className="info-box-title">💡 Provider Selection</div>
        <p>
          Set the provider via <code>ExtractorConfig(provider="openrouter")</code> or CLI <code>--provider openrouter</code>. The provider factory will create the appropriate adapter automatically.
        </p>
      </div>

      <h2>CacheMode Enum</h2>
      <p>
        The <code>CacheMode</code> enum defines three caching behaviors:
      </p>
      <ul>
        <li><strong>PERSISTENT</strong> - Save to disk, reuse across runs</li>
        <li><strong>EPHEMERAL</strong> - Temporary directory, cleaned after extraction</li>
        <li><strong>DISABLED</strong> - No caching, always re-convert</li>
      </ul>

      <h2>Validation</h2>
      <p>
        The <code>validate()</code> method performs comprehensive checks:
      </p>
      <ul>
        <li>DPI must be positive</li>
        <li>TTL cannot be negative</li>
        <li>Retry count must be ≥ 1</li>
        <li>Temperature range [0.0, 2.0]</li>
        <li>Top-p range [0.0, 1.0]</li>
        <li>Penalty ranges [-2.0, 2.0]</li>
        <li>Log level must be valid Python logging level</li>
      </ul>

      <div className="info-box tip">
        <div className="info-box-title">💡 Configuration Best Practice</div>
        <p>
          Always call <code>config.validate()</code> before passing to <code>PDFExtractor</code>. The constructor does this automatically, but manual validation helps catch errors early.
        </p>
      </div>

      <h2>Usage Examples</h2>
      <Pre>{`# Default configuration (Replicate provider)
from pdf_extractor_analyzer import PDFExtractor

extractor = PDFExtractor()

# Custom configuration with Replicate
from pdf_extractor_analyzer import PDFExtractor, ExtractorConfig, CacheMode, ReplicateProviderConfig

config = ExtractorConfig(
    dpi=300,
    cache_mode=CacheMode.EPHEMERAL,
    replicate=ReplicateProviderConfig(
        api_token="your_token",
        max_concurrent_calls=2
    )
)
config.validate()
extractor = PDFExtractor(config)

# OpenRouter provider configuration
from pdf_extractor_analyzer import OpenRouterProviderConfig

config = ExtractorConfig(
    provider="openrouter",
    openrouter=OpenRouterProviderConfig(
        api_key="your_key",
        model="z-ai/glm-4.6v"
    )
)
extractor = PDFExtractor(config)`}</Pre>

      <h2>Legacy Compatibility</h2>
      <p>
        For backward compatibility, legacy configuration fields are still supported:
      </p>
      <Pre>{`# Legacy style still works (with deprecation warnings)
config = ExtractorConfig(
    replicate_api_token="your_token",
    max_concurrent_replicate_calls=2
)

# These are internally synced to the new provider config
# but new code should use the grouped provider approach`}</Pre>
    </>
  ),
  quiz: [
    {
      question: 'What is the default provider for PDF extraction?',
      options: ['OpenRouter', 'Replicate', 'Anthropic', 'OpenAI'],
      correctIndex: 1,
      explanation: 'The default provider is "replicate", which uses the ReplicateLLMAdapter to communicate with Replicate vision models.',
    },
    {
      question: 'How do you configure the OpenRouter provider?',
      options: [
        'Set provider="openrouter" in ExtractorConfig',
        'Use ReplicateProviderConfig with OpenRouter credentials',
        'Modify the analyzer.py file directly',
        'Set OPENROUTER=1 environment variable',
      ],
      correctIndex: 0,
      explanation: 'Set provider="openrouter" in ExtractorConfig and configure the openrouter field with OpenRouterProviderConfig(api_key="your_key").',
    },
    {
      question: 'What is the default model for the OpenRouter provider?',
      options: ['openai/gpt-4o', 'gpt-4o-mini', 'z-ai/glm-4.6v', 'openrouter/auto'],
      correctIndex: 2,
      explanation: 'The OpenRouter provider defaults to "z-ai/glm-4.6v" with "openrouter/auto" as the fallback model.',
    },
    {
      question: 'What is the default DPI for PDF to image conversion?',
      options: ['72', '150', '300', '600'],
      correctIndex: 1,
      explanation: 'The default DPI is 150, which provides a good balance between quality and file size for most documents.',
    },
  ],
};

export default configContent;