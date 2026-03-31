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
          <tr><td><code>--mode</code></td><td>full_text</td><td>Extraction mode: full_text, summary, structured, markdown</td></tr>
          <tr><td><code>--schema-import</code></td><td>None</td><td>Pydantic schema import path for structured mode</td></tr>
          <tr><td><code>--model</code></td><td>openai/gpt-4o</td><td>Primary Replicate model</td></tr>
          <tr><td><code>--fallback-model</code></td><td>gpt-4o-mini</td><td>Fallback model on primary failure</td></tr>
        </tbody>
      </table>

      <h3>Conversion Options</h3>
      <table className="data-table">
        <thead><tr><th>Option</th><th>Default</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>--dpi</code></td><td>150</td><td>Image resolution for PDF pages</td></tr>
          <tr><td><code>--max-pages</code></td><td>None</td><td>Limit pages to process</td></tr>
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
          <tr><td><code>--max-workers</code></td><td>4</td><td>Parallel workers for multiple PDFs</td></tr>
          <tr><td><code>--stop-on-error</code></td><td>False</td><td>Stop batch on first error</td></tr>
        </tbody>
      </table>

      <h3>Output Options</h3>
      <table className="data-table">
        <thead><tr><th>Option</th><th>Default</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>--output</code></td><td>stdout</td><td>Write result to file</td></tr>
          <tr><td><code>--pretty</code></td><td>False</td><td>Format JSON with indentation</td></tr>
        </tbody>
      </table>

      <h2>Usage Examples</h2>

      <h3>Simple Text Extraction</h3>
      <Pre>{`# Extract full text from single PDF
pdf-extractor ./document.pdf --mode full_text --pretty`}</Pre>

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
          Set <code>REPLICATE_API_TOKEN</code> environment variable instead of passing it in config. The CLI and library will automatically use it.
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
  ],
};

export default cliContent;