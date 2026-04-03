import type { ChapterData } from './types';
import Pre from '../components/Pre';

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
        The project uses a <strong>pipeline architecture</strong> where data flows through a series of processing stages. The main orchestrator (<code>PDFExtractor</code>) coordinates between specialized modules. Additionally, it implements a <strong>port-and-adapters pattern</strong> for LLM provider integration:
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
            <li>Supports both sync and async extraction</li>
          </ul>
        </li>
        <li>
          <strong>Processing Layer</strong> - Specialized processing modules
          <ul>
            <li><code>converter.py</code> - PDF to image conversion</li>
            <li><code>analyzer.py</code> - Vision LLM analysis (provider-agnostic)</li>
            <li><code>cache.py</code> - Hash-based caching</li>
          </ul>
        </li>
        <li>
          <strong>Provider Layer</strong> - LLM provider adapters (port-and-adapters)
          <ul>
            <li><code>ports/llm_provider.py</code> - Provider port contract</li>
            <li><code>adapters/llm/replicate_adapter.py</code> - Replicate implementation</li>
            <li><code>adapters/llm/openrouter_adapter.py</code> - OpenRouter implementation</li>
            <li><code>provider_factory.py</code> - Provider factory and registry</li>
          </ul>
        </li>
        <li>
          <strong>Support Layer</strong> - Configuration and utilities
          <ul>
            <li><code>config.py</code> - Configuration dataclass with provider configs</li>
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
        <div className="info-box-title">💡 Port-and-Adapters Pattern</div>
        <p>
          The LLM provider layer uses the port-and-adapters (hexagonal) architecture. The <code>LLMProviderPort</code> defines the interface, and each provider (Replicate, OpenRouter) implements this interface. This makes it easy to add new providers without changing the analyzer logic.
        </p>
      </div>

      <h2>Module Dependencies</h2>
      <p>The dependency graph flows in one direction:</p>
      <ul>
        <li>CLI/Library → Pipeline → Converter + Cache + Analyzer</li>
        <li>Analyzer → LLM Provider Port (abstract)</li>
        <li>Provider Adapters (Replicate, OpenRouter) implement LLM Provider Port</li>
        <li>Provider Factory creates appropriate adapter based on config</li>
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
      <Pre lang="bash">pdf-extractor ./document.pdf --mode full_text --pretty</Pre>

      <h3>Python Library</h3>
      <p>Import directly in your Python code:</p>
      <Pre>{`from pdf_extractor_analyzer import PDFExtractor, ExtractorConfig, ExtractionMode

# Using default provider (Replicate)
extractor = PDFExtractor(ExtractorConfig())
result = extractor.extract("document.pdf", mode=ExtractionMode.SUMMARY)

# Using OpenRouter provider
from pdf_extractor_analyzer import OpenRouterProviderConfig

config = ExtractorConfig(
    provider="openrouter",
    openrouter=OpenRouterProviderConfig(api_key="your_key")
)
extractor = PDFExtractor(config)
result = extractor.extract("document.pdf", mode=ExtractionMode.SUMMARY)`}</Pre>

      <h2>Summary</h2>
      <p>
        This architecture provides:
      </p>
      <ul>
        <li><strong>Testability</strong> - Each module can be tested independently; mock the LLMProviderPort for testing</li>
        <li><strong>Extensibility</strong> - Add new extraction modes or LLM providers without changing core logic</li>
        <li><strong>Maintainability</strong> - Clear boundaries between concerns</li>
        <li><strong>Performance</strong> - Caching layer reduces redundant processing; async mode for concurrent operations</li>
        <li><strong>Flexibility</strong> - Switch between Replicate, OpenRouter, or custom providers via configuration</li>
      </ul>
    </>
  ),
  diagram: 'architecture',
  quiz: [
    {
      question: 'What architecture pattern does the PDF Extractor Analyzer follow?',
      options: [
        'MVC (Model-View-Controller)',
        'Clean modular architecture with pipeline and port-and-adapters patterns',
        'Microservices architecture',
        'Monolithic architecture',
      ],
      correctIndex: 1,
      explanation: 'The project follows a clean modular architecture with a pipeline pattern for data flow and a port-and-adapters pattern for LLM provider integration.',
    },
    {
      question: 'Which module defines the contract for LLM provider adapters?',
      options: [
        'analyzer.py',
        'provider_factory.py',
        'ports/llm_provider.py',
        'config.py',
      ],
      correctIndex: 2,
      explanation: 'The ports/llm_provider.py module defines the LLMProviderPort protocol that all provider adapters must implement.',
    },
    {
      question: 'What is the purpose of the port-and-adapters pattern in this project?',
      options: [
        'To manage database connections',
        'To enable multiple LLM providers with a unified interface',
        'To handle HTTP requests',
        'To cache extraction results',
      ],
      correctIndex: 1,
      explanation: 'The port-and-adapters pattern allows the analyzer to work with different LLM providers (Replicate, OpenRouter, etc.) through a unified LLMProviderPort interface.',
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