import type { ChapterData } from './types';

export const architectureContent: ChapterData = {
  id: 'architecture',
  title: 'Architecture Overview',
  description: 'Learn about the clean modular architecture that powers the PDF Extractor Analyzer.',
  files: [
    'src/pdf_extractor_analyzer/__init__.py',
    'src/pdf_extractor_analyzer/pipeline.py',
    'src/pdf_extractor_analyzer/config.py',
  ],
  content: (
    <>
      <h2>Introduction</h2>
      <p>
        The PDF Extractor Analyzer follows a <strong>clean modular architecture</strong> with clear separation of concerns. Each module has a single responsibility and well-defined interfaces, making the codebase easy to understand, test, and extend.
      </p>
      
      <h2>Architecture Pattern</h2>
      <p>
        The project uses a <strong>pipeline architecture</strong> where data flows through a series of processing stages. The main orchestrator (<code>PDFExtractor</code>) coordinates between specialized modules:
      </p>
      
      <h3>Core Layers</h3>
      <ol>
        <li>
          <strong>Entry Layer</strong> - CLI and Python API entry points
          <ul>
            <li><code>cli.py</code> - Command-line interface using argparse</li>
            <li>Direct library imports via <code>__init__.py</code></li>
          </ul>
        </li>
        <li>
          <strong>Pipeline Layer</strong> - Orchestrates the extraction workflow
          <ul>
            <li><code>pipeline.py</code> - Main <code>PDFExtractor</code> class</li>
            <li>Coordinates converter, cache, and analyzer</li>
          </ul>
        </li>
        <li>
          <strong>Processing Layer</strong> - Specialized processing modules
          <ul>
            <li><code>converter.py</code> - PDF to image conversion</li>
            <li><code>analyzer.py</code> - Vision LLM analysis</li>
            <li><code>cache.py</code> - Hash-based caching</li>
          </ul>
        </li>
        <li>
          <strong>Support Layer</strong> - Configuration and utilities
          <ul>
            <li><code>config.py</code> - Configuration dataclass</li>
            <li><code>schemas.py</code> - Pydantic models</li>
            <li><code>exceptions.py</code> - Custom exception hierarchy</li>
          </ul>
        </li>
      </ol>

      <h2>Key Design Principles</h2>
      
      <h3>1. Single Responsibility</h3>
      <p>
        Each module handles exactly one concern:
      </p>
      <ul>
        <li><code>converter.py</code> only converts PDFs to images</li>
        <li><code>cache.py</code> only manages cache storage and retrieval</li>
        <li><code>analyzer.py</code> only communicates with the LLM API</li>
      </ul>

      <h3>2. Dependency Injection</h3>
      <p>
        The <code>PDFExtractor</code> receives its configuration through constructor injection, making it easy to test with different configurations or mock dependencies.
      </p>

      <h3>3. Immutable Configuration</h3>
      <p>
        The <code>ExtractorConfig</code> uses a frozen dataclass with validation, ensuring configuration values are validated once at creation time and remain immutable during processing.
      </p>

      <h3>4. Type Safety</h3>
      <p>
        Extensive use of type hints throughout the codebase enables better IDE support, early error detection, and self-documenting code.
      </p>

      <div className="info-box tip">
        <div className="info-box-title">💡 Architecture Best Practice</div>
        <p>
          The separation between processing modules allows each to be tested in isolation. You can mock the <code>ReplicateVisionAnalyzer</code> to test the pipeline without making actual API calls.
        </p>
      </div>

      <h2>Module Dependencies</h2>
      <p>The dependency graph flows in one direction:</p>
      <ul>
        <li>CLI/Library → Pipeline → Converter + Cache + Analyzer</li>
        <li>All modules depend on Config and Exceptions (support layer)</li>
        <li>Pipeline depends on Schemas for output types</li>
      </ul>

      <h2>Entry Points</h2>
      <p>
        The package provides two entry points:
      </p>
      
      <h3>Command-Line Interface</h3>
      <p>
        Installed as <code>pdf-extractor</code> via the <code>pyproject.toml</code> entry point:
      </p>
      <pre><code>pdf-extractor ./document.pdf --mode full_text --pretty</code></pre>

      <h3>Python Library</h3>
      <p>Import directly in your Python code:</p>
      <pre><code>{`from pdf_extractor_analyzer import PDFExtractor, ExtractorConfig

extractor = PDFExtractor(ExtractorConfig())
result = extractor.extract("document.pdf", mode=ExtractionMode.SUMMARY)`}</code></pre>

      <h2>Summary</h2>
      <p>
        This architecture provides:
      </p>
      <ul>
        <li><strong>Testability</strong> - Each module can be tested independently</li>
        <li><strong>Extensibility</strong> - Easy to add new extraction modes or providers</li>
        <li><strong>Maintainability</strong> - Clear boundaries between concerns</li>
        <li><strong>Performance</strong> - Caching layer reduces redundant processing</li>
      </ul>
    </>
  ),
  diagram: 'architecture',
  quiz: [
    {
      question: 'What architecture pattern does the PDF Extractor Analyzer follow?',
      options: [
        'MVC (Model-View-Controller)',
        'Clean modular architecture with pipeline pattern',
        'Microservices architecture',
        'Monolithic architecture',
      ],
      correctIndex: 1,
      explanation: 'The project follows a clean modular architecture with a pipeline pattern where data flows through processing stages coordinated by the PDFExtractor class.',
    },
    {
      question: 'Which module is responsible for orchestrating the extraction workflow?',
      options: [
        'cli.py',
        'converter.py',
        'pipeline.py',
        'analyzer.py',
      ],
      correctIndex: 2,
      explanation: 'The pipeline.py module contains the PDFExtractor class which serves as the main orchestrator, coordinating between converter, cache, and analyzer modules.',
    },
    {
      question: 'What are the four main layers in the architecture?',
      options: [
        'Input, Processing, Output, Storage',
        'Entry, Pipeline, Processing, Support',
        'Frontend, Backend, Database, API',
        'Models, Views, Controllers, Services',
      ],
      correctIndex: 1,
      explanation: 'The four layers are Entry (CLI/API), Pipeline (orchestration), Processing (converter, analyzer, cache), and Support (config, schemas, exceptions).',
    },
    {
      question: 'How does the architecture support testability?',
      options: [
        'By using only static methods',
        'Through dependency injection and separation of concerns',
        'By avoiding external dependencies',
        'Through extensive logging',
      ],
      correctIndex: 1,
      explanation: 'Each module can be tested in isolation thanks to clear separation of concerns. Dependencies like the analyzer can be mocked for testing the pipeline without making actual API calls.',
    },
  ],
};

export default architectureContent;