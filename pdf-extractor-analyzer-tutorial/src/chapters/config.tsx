import type { ChapterData } from './types';

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
        The <code>ExtractorConfig</code> class encapsulates all configurable parameters for PDF extraction. It uses frozen slots for performance.
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

      <h3>Model Settings</h3>
      <table className="data-table">
        <thead><tr><th>Parameter</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>model</code></td><td>str</td><td>openai/gpt-4o</td><td>Primary Replicate model</td></tr>
          <tr><td><code>fallback_model</code></td><td>str | None</td><td>gpt-4o-mini</td><td>Fallback model on primary failure</td></tr>
          <tr><td><code>max_retries</code></td><td>int</td><td>3</td><td>Number of API retry attempts</td></tr>
          <tr><td><code>retry_backoff_seconds</code></td><td>float</td><td>1.0</td><td>Base delay for exponential backoff</td></tr>
          <tr><td><code>timeout_seconds</code></td><td>int</td><td>60</td><td>API call timeout</td></tr>
        </tbody>
      </table>

      <h3>Security Limits</h3>
      <table className="data-table">
        <thead><tr><th>Parameter</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>max_image_width</code></td><td>int</td><td>8000</td><td>Maximum image width in pixels</td></tr>
          <tr><td><code>max_image_height</code></td><td>int</td><td>8000</td><td>Maximum image height in pixels</td></tr>
          <tr><td><code>max_image_bytes</code></td><td>int</td><td>20MB</td><td>Maximum image file size</td></tr>
          <tr><td><code>max_pdf_file_size</code></td><td>int | None</td><td>None</td><td>Maximum PDF file size</td></tr>
          <tr><td><code>replicate_api_token</code></td><td>str | None</td><td>None</td><td>API token (or env var)</td></tr>
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
      <pre><code>{`# Default configuration
from pdf_extractor_analyzer import PDFExtractor

extractor = PDFExtractor()

# Custom configuration
from pdf_extractor_analyzer import PDFExtractor, ExtractorConfig, CacheMode

config = ExtractorConfig(
    dpi=300,
    cache_mode=CacheMode.EPHEMERAL,
    model="openai/gpt-4o-mini",
    max_page_limit=10
)
config.validate()  # Explicit validation
extractor = PDFExtractor(config)`}</code></pre>
    </>
  ),
  quiz: [
    {
      question: 'What is the default DPI for PDF to image conversion?',
      options: ['72', '150', '300', '600'],
      correctIndex: 1,
      explanation: 'The default DPI is 150, which provides a good balance between quality and file size for most documents.',
    },
    {
      question: 'Which CacheMode should you use for a one-time extraction with no persistent storage?',
      options: ['PERSISTENT', 'EPHEMERAL', 'DISABLED', 'MEMORY'],
      correctIndex: 1,
      explanation: 'EPHEMERAL creates a temporary directory that is automatically cleaned up after extraction, perfect for one-time processing.',
    },
    {
      question: 'What happens if you set temperature to 3.0?',
      options: ['It works normally', 'It raises a ValueError on validation', 'It defaults to 1.0', 'It raises a TypeError'],
      correctIndex: 1,
      explanation: 'The validate() method checks that temperature is between 0.0 and 2.0, raising a ValueError for invalid values.',
    },
    {
      question: 'How many retry attempts are made by default for API calls?',
      options: ['1', '3', '5', 'No retries'],
      correctIndex: 1,
      explanation: 'The default max_retries is 3, meaning up to 3 attempts will be made with exponential backoff between each.',
    },
  ],
};

export default configContent;