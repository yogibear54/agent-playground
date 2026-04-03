import type { ChapterData } from './types';
import Pre from '../components/Pre';

export const cliContent: ChapterData = {
  id: 'cli',
  title: 'Command-Line Interface',
  description: 'Learn how to use the CLI for PDF extraction from the command line.',
  files: ['src/pdf_extractor_analyzer/cli.py'],
  content: (
    <>
      <h2>CLI Overview</h2>
      <p>
        The CLI provides command-line access to all extraction features. It's installed as <code>pdf-extractor</code> via the <code>pyproject.toml</code> entry point.
      </p>

      <h2>Installation</h2>
      <Pre>{`# Install the package
pip install -e .

# CLI is now available
pdf-extractor --help`}</Pre>

      <h2>Command Options</h2>

      <h3>Positional Arguments</h3>
      <Pre>{`pdf-extractor <PDF_PATHS...>    # One or more PDF files to process`}</Pre>

      <h3>Extraction Options</h3>
      <table className="data-table">
        <thead><tr><th>Option</th><th>Default</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>--provider</code></td><td>replicate</td><td>LLM provider: replicate, openrouter</td></tr>
          <tr><td><code>--mode</code></td><td>full_text</td><td>Extraction mode: full_text, summary, structured, markdown, prompt</td></tr>
          <tr><td><code>--schema-import</code></td><td>None</td><td>Pydantic schema import path for structured mode</td></tr>
          <tr><td><code>--prompt</code></td><td>None</td><td>Custom prompt for PROMPT extraction mode</td></tr>
          <tr><td><code>--model</code></td><td>Provider-specific</td><td>Primary model (default: openai/gpt-4o for replicate, auto for openrouter)</td></tr>
          <tr><td><code>--fallback-model</code></td><td>openai/gpt-4o-mini</td><td>Fallback model on primary failure</td></tr>
        </tbody>
      </table>

      <h3>Provider-Specific Options</h3>
      <table className="data-table">
        <thead><tr><th>Option</th><th>Default</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>--replicate-api-token</code></td><td>None</td><td>Replicate API token (overrides env var)</td></tr>
          <tr><td><code>--replicate-max-concurrent-calls</code></td><td>1</td><td>Replicate max concurrent submissions</td></tr>
          <tr><td><code>--openrouter-api-key</code></td><td>None</td><td>OpenRouter API key (overrides env var)</td></tr>
          <tr><td><code>--openrouter-base-url</code></td><td>https://openrouter.ai/api/v1</td><td>OpenRouter API base URL</td></tr>
        </tbody>
      </table>

      <h3>Conversion Options</h3>
      <table className="data-table">
        <thead><tr><th>Option</th><th>Default</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>--dpi</code></td><td>150</td><td>Image resolution for PDF pages</td></tr>
          <tr><td><code>--max-pages</code></td><td>None</td><td>Limit pages to process</td></tr>
          <tr><td><code>--image-max-long-edge</code></td><td>None</td><td>Cap longest edge of rendered images (pixels)</td></tr>
        </tbody>
      </table>

      <h3>Cache Options</h3>
      <table className="data-table">
        <thead><tr><th>Option</th><th>Default</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>--cache-mode</code></td><td>persistent</td><td>Cache mode: persistent, ephemeral, disabled</td></tr>
          <tr><td><code>--cache-dir</code></td><td>./cache</td><td>Cache directory path</td></tr>
          <tr><td><code>--cache-ttl-days</code></td><td>7</td><td>Days before cache expires</td></tr>
        </tbody>
      </table>

      <h3>Batch Options</h3>
      <table className="data-table">
        <thead><tr><th>Option</th><th>Default</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>--max-workers</code></td><td>4</td><td>Parallel workers for multiple PDFs (sync mode)</td></tr>
          <tr><td><code>--max-concurrent-pages</code></td><td>4</td><td>Per-document async page concurrency</td></tr>
          <tr><td><code>--async-rps</code></td><td>8.0</td><td>Per-document async request rate limit</td></tr>
          <tr><td><code>--stop-on-error</code></td><td>False</td><td>Stop batch on first error</td></tr>
        </tbody>
      </table>

      <h3>Output Options</h3>
      <table className="data-table">
        <thead><tr><th>Option</th><th>Default</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>--output</code></td><td>stdout</td><td>Write result to file</td></tr>
          <tr><td><code>--pretty</code></td><td>False</td><td>Format JSON with indentation</td></tr>
          <tr><td><code>--async</code></td><td>False</td><td>Use async extraction pipeline</td></tr>
        </tbody>
      </table>

      <h2>Usage Examples</h2>

      <h3>Simple Text Extraction (Replicate)</h3>
      <Pre>{`# Extract full text using default Replicate provider
pdf-extractor ./document.pdf --mode full_text --pretty

# Specify Replicate model
pdf-extractor ./document.pdf --provider replicate --model openai/gpt-4o-mini --pretty`}</Pre>

      <h3>OpenRouter Provider</h3>
      <Pre>{`# Use OpenRouter provider
pdf-extractor ./document.pdf \
  --provider openrouter \
  --model z-ai/glm-4.6v \
  --mode summary --pretty

# OpenRouter with auto model selection
pdf-extractor ./document.pdf \
  --provider openrouter \
  --model openrouter/auto \
  --openrouter-api-key your_key \
  --mode summary --pretty`}</Pre>

      <h3>Async Extraction</h3>
      <Pre>{`# Use async pipeline for concurrent page processing
pdf-extractor ./document.pdf \
  --mode full_text \
  --async \
  --max-concurrent-pages 8 \
  --async-rps 10.0 \
  --pretty

# Async batch processing
pdf-extractor ./docs/*.pdf \
  --mode summary \
  --async \
  --max-workers 4 \
  --pretty`}</Pre>

      <h3>Summary Extraction</h3>
      <Pre>{`# Get 3-5 sentence summary with disabled cache
pdf-extractor ./document.pdf --mode summary --cache-mode disabled --pretty`}</Pre>

      <h3>Structured Extraction</h3>
      <Pre>{`# Extract structured data with custom schema
# First, define schema in my_schemas.py:
# class InvoiceSchema(BaseModel):
#     vendor_name: str | None
#     total: float | None

pdf-extractor ./invoice.pdf \\
  --mode structured \\
  --schema-import my_schemas:InvoiceSchema \\
  --pretty`}</Pre>

      <h3>Markdown Extraction</h3>
      <Pre>{`# Extract as Markdown
pdf-extractor ./document.pdf --mode markdown --cache-mode persistent --pretty`}</Pre>

      <h3>Custom Prompt Extraction</h3>
      <p>
        The <code>prompt</code> mode allows you to provide custom instructions for tailored extraction:
      </p>
      <Pre>{`# Extract specific information with custom prompt
pdf-extractor ./document.pdf \
  --mode prompt \
  --prompt "Extract all dates, names, and monetary amounts from this document" \
  --pretty

# Ask for structured analysis
pdf-extractor ./invoice.pdf \
  --mode prompt \
  --prompt "Identify the vendor name, invoice number, and total amount due" \
  --provider openrouter \
  --pretty

# Combine with async for batch custom extraction
pdf-extractor ./docs/*.pdf \
  --mode prompt \
  --prompt "List all action items and their assigned owners" \
  --async \
  --max-workers 4 \
  --pretty`}</Pre>

      <h3>Batch Processing</h3>
      <Pre>{`# Process multiple PDFs with 2 workers
pdf-extractor ./docs/a.pdf ./docs/b.pdf ./docs/c.pdf \\
  --mode summary \\
  --max-workers 2 \\
  --pretty

# Fail fast on first error
pdf-extractor ./docs/*.pdf \\
  --mode full_text \\
  --stop-on-error`}</Pre>

      <h3>High Quality Conversion</h3>
      <Pre>{`# Higher DPI for better OCR accuracy
pdf-extractor ./scan.pdf \\
  --mode full_text \\
  --dpi 300 \\
  --max-pages 10 \\
  --pretty

# Limit image size for large documents
pdf-extractor ./large.pdf \\
  --mode full_text \\
  --dpi 150 \\
  --image-max-long-edge 2048 \\
  --pretty`}</Pre>

      <h2>Schema Import Format</h2>
      <p>
        The <code>--schema-import</code> option uses Python module notation:
      </p>
      <Pre>{`# Format: module.submodule:ClassName
--schema-import my_package.schemas:InvoiceSchema
--schema-import invoice_extractor.models:ReceiptModel`}</Pre>

      <h2>Exit Codes</h2>
      <table className="data-table">
        <thead><tr><th>Code</th><th>Meaning</th></tr></thead>
        <tbody>
          <tr><td>0</td><td>Success</td></tr>
          <tr><td>1</td><td>General error</td></tr>
          <tr><td>2</td><td>Argument/validation error</td></tr>
          <tr><td>130</td><td>Interrupted (Ctrl+C)</td></tr>
        </tbody>
      </table>

      <h2>Error Handling</h2>
      <p>
        The CLI distinguishes between error types:
      </p>
      <Pre>{`try:
    # Process extraction
except KeyboardInterrupt:
    return 130  # 128 + SIGINT(2)
except (ValueError, TypeError) as exc:
    sys.stderr.write(f"Error: {exc}\\n")
    return 2
except Exception as exc:
    sys.stderr.write(f"Error: {exc}\\n")
    sys.stderr.write(traceback.format_exc())
    return 1`}</Pre>

      <h2>Programmatic Usage</h2>
      <p>
        The CLI can also be invoked programmatically:
      </p>
      <Pre>{`from pdf_extractor_analyzer.cli import main

# Process files
exit_code = main([
    "--mode", "summary",
    "--pretty",
    "./document.pdf"
])`}</Pre>

      <div className="info-box tip">
        <div className="info-box-title">💡 Environment Variables</div>
        <p>
          Set provider API keys via environment variables:
        </p>
        <ul>
          <li><code>REPLICATE_API_TOKEN</code> - For Replicate provider</li>
          <li><code>OPENROUTER_API_KEY</code> - For OpenRouter provider</li>
        </ul>
        <p>
          The CLI and library will automatically use these when provider-specific config is not provided.
        </p>
      </div>
    </>
  ),
  quiz: [
    {
      question: 'What is the default extraction mode?',
      options: ['summary', 'full_text', 'structured', 'markdown'],
      correctIndex: 1,
      explanation: 'The default mode is full_text, which transcribes all visible text from the PDF pages.',
    },
    {
      question: 'How do you process multiple PDFs in parallel?',
      options: [
        'Use --parallel flag',
        'Use --max-workers flag',
        'Pass --batch flag',
        'Not supported in CLI'
      ],
      correctIndex: 1,
      explanation: 'The --max-workers flag controls parallel processing when multiple PDF paths are provided. Default is 4.',
    },
    {
      question: 'What format does --schema-import expect?',
      options: [
        'JSON file path',
        'Python file path',
        'module.submodule:ClassName',
        'ClassName only'
      ],
      correctIndex: 2,
      explanation: 'Use Python import notation like my_package.schemas:InvoiceSchema where the schema is a Pydantic BaseModel class.',
    },
    {
      question: 'What exit code indicates an argument/validation error?',
      options: ['0', '1', '2', '130'],
      correctIndex: 2,
      explanation: 'Exit code 2 is for argument/validation errors (like missing schema for structured mode), while 1 is for general errors and 130 forSIGINT.',
    },
    {
      question: 'What is required when using the prompt extraction mode?',
      options: [
        'A Pydantic schema',
        'The --prompt option with custom instructions',
        'An API token',
        'PDF must be under 10 pages',
      ],
      correctIndex: 1,
      explanation: 'The prompt mode requires the --prompt option to provide custom extraction instructions to the LLM.',
    },
  ],
};

export default cliContent;