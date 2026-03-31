interface DiagramProps {
  type: 'architecture' | 'data-flow' | 'cache-flow' | 'class-hierarchy';
}

function Diagram({ type }: DiagramProps) {
  if (type === 'architecture') {
    return (
      <div className="diagram-container">
        <svg viewBox="0 0 800 500" width="100%" height="auto" style={{ maxWidth: '800px' }}>
          {/* Background */}
          <defs>
            <linearGradient id="headerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
            <linearGradient id="moduleGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f8fafc" />
              <stop offset="100%" stopColor="#e2e8f0" />
            </linearGradient>
            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="2" dy="2" stdDeviation="3" floodOpacity="0.15" />
            </filter>
          </defs>

          {/* Entry Layer */}
          <g transform="translate(300, 20)">
            <rect x="0" y="0" width="200" height="60" rx="8" fill="url(#headerGrad)" filter="url(#shadow)" />
            <text x="100" y="25" textAnchor="middle" fill="white" fontWeight="600" fontSize="14">Entry Points</text>
            <text x="100" y="45" textAnchor="middle" fill="rgba(255,255,255,0.9)" fontSize="11">CLI / Python API</text>
          </g>

          {/* Arrow down */}
          <path d="M400 85 L400 105" stroke="#94a3b8" strokeWidth="2" markerEnd="url(#arrowhead)" />
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
            </marker>
          </defs>

          {/* Pipeline Layer */}
          <g transform="translate(200, 110)">
            <rect x="0" y="0" width="400" height="70" rx="8" fill="#22c55e" filter="url(#shadow)" />
            <text x="200" y="25" textAnchor="middle" fill="white" fontWeight="600" fontSize="14">Pipeline Layer</text>
            <text x="200" y="45" textAnchor="middle" fill="rgba(255,255,255,0.9)" fontSize="11">pdf_extractor_analyzer/pipeline.py</text>
            <text x="200" y="60" textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize="10">PDFExtractor - Main orchestration class</text>
          </g>

          {/* Connector lines to modules */}
          <path d="M280 185 L280 210 L160 210 L160 240" stroke="#94a3b8" strokeWidth="1.5" />
          <path d="M400 185 L400 240" stroke="#94a3b8" strokeWidth="1.5" />
          <path d="M520 185 L520 210 L640 210 L640 240" stroke="#94a3b8" strokeWidth="1.5" />

          {/* Module Layer - Left */}
          <g transform="translate(60, 245)">
            <rect x="0" y="0" width="200" height="80" rx="8" fill="url(#moduleGrad)" stroke="#e2e8f0" strokeWidth="1" filter="url(#shadow)" />
            <text x="100" y="25" textAnchor="middle" fill="#2563eb" fontWeight="600" fontSize="13">Converter</text>
            <text x="100" y="42" textAnchor="middle" fill="#475569" fontSize="10">converter.py</text>
            <text x="100" y="60" textAnchor="middle" fill="#64748b" fontSize="9">PDF → Images</text>
            <text x="100" y="72" textAnchor="middle" fill="#64748b" fontSize="9">PyMuPDF Integration</text>
          </g>

          {/* Module Layer - Center */}
          <g transform="translate(300, 245)">
            <rect x="0" y="0" width="200" height="80" rx="8" fill="url(#moduleGrad)" stroke="#e2e8f0" strokeWidth="1" filter="url(#shadow)" />
            <text x="100" y="25" textAnchor="middle" fill="#2563eb" fontWeight="600" fontSize="13">Cache</text>
            <text x="100" y="42" textAnchor="middle" fill="#475569" fontSize="10">cache.py</text>
            <text x="100" y="60" textAnchor="middle" fill="#64748b" fontSize="9">Hash-based Storage</text>
            <text x="100" y="72" textAnchor="middle" fill="#64748b" fontSize="9">TTL Management</text>
          </g>

          {/* Module Layer - Right */}
          <g transform="translate(540, 245)">
            <rect x="0" y="0" width="200" height="80" rx="8" fill="url(#moduleGrad)" stroke="#e2e8f0" strokeWidth="1" filter="url(#shadow)" />
            <text x="100" y="25" textAnchor="middle" fill="#2563eb" fontWeight="600" fontSize="13">Analyzer</text>
            <text x="100" y="42" textAnchor="middle" fill="#475569" fontSize="10">analyzer.py</text>
            <text x="100" y="60" textAnchor="middle" fill="#64748b" fontSize="9">Replicate API</text>
            <text x="100" y="72" textAnchor="middle" fill="#64748b" fontSize="9">Vision LLM Calls</text>
          </g>

          {/* Support Layer */}
          <g transform="translate(120, 350)">
            <rect x="0" y="0" width="140" height="60" rx="6" fill="#fbbf24" filter="url(#shadow)" />
            <text x="70" y="25" textAnchor="middle" fill="#1e293b" fontWeight="600" fontSize="12">Config</text>
            <text x="70" y="42" textAnchor="middle" fill="#1e293b" fontSize="10">config.py</text>
            <text x="70" y="54" textAnchor="middle" fill="#292524" fontSize="9">Dataclass</text>
          </g>

          <g transform="translate(280, 350)">
            <rect x="0" y="0" width="140" height="60" rx="6" fill="#fbbf24" filter="url(#shadow)" />
            <text x="70" y="25" textAnchor="middle" fill="#1e293b" fontWeight="600" fontSize="12">Schemas</text>
            <text x="70" y="42" textAnchor="middle" fill="#1e293b" fontSize="10">schemas.py</text>
            <text x="70" y="54" textAnchor="middle" fill="#292524" fontSize="9">Pydantic Models</text>
          </g>

          <g transform="translate(440, 350)">
            <rect x="0" y="0" width="140" height="60" rx="6" fill="#fbbf24" filter="url(#shadow)" />
            <text x="70" y="25" textAnchor="middle" fill="#1e293b" fontWeight="600" fontSize="12">Exceptions</text>
            <text x="70" y="42" textAnchor="middle" fill="#1e293b" fontSize="10">exceptions.py</text>
            <text x="70" y="54" textAnchor="middle" fill="#292524" fontSize="9">Error Classes</text>
          </g>

          {/* Legend */}
          <g transform="translate(50, 450)">
            <rect x="0" y="0" width="16" height="16" rx="3" fill="#2563eb" />
            <text x="24" y="12" fill="#475569" fontSize="11">Entry Point</text>
            
            <rect x="130" y="0" width="16" height="16" rx="3" fill="#22c55e" />
            <text x="154" y="12" fill="#475569" fontSize="11">Core Pipeline</text>
            
            <rect x="280" y="0" width="16" height="16" rx="3" fill="#e2e8f0" stroke="#cbd5e1" />
            <text x="304" y="12" fill="#475569" fontSize="11">Processing Module</text>
            
            <rect x="460" y="0" width="16" height="16" rx="3" fill="#fbbf24" />
            <text x="484" y="12" fill="#475569" fontSize="11">Support Module</text>
          </g>
        </svg>
        <div className="diagram-legend">
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#2563eb' }}></div>
            <span>Entry Points</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#22c55e' }}></div>
            <span>Pipeline Layer</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#e2e8f0', border: '1px solid #cbd5e1' }}></div>
            <span>Processing Modules</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#fbbf24' }}></div>
            <span>Support Modules</span>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'data-flow') {
    return (
      <div className="diagram-container">
        <svg viewBox="0 0 900 400" width="100%" height="auto" style={{ maxWidth: '900px' }}>
          <defs>
            <linearGradient id="pdfGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>
            <linearGradient id="processGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
            <linearGradient id="cacheGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
            <linearGradient id="outputGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#16a34a" />
            </linearGradient>
            <marker id="flowArrow" markerWidth="12" markerHeight="8" refX="10" refY="4" orient="auto">
              <polygon points="0 0, 12 4, 0 8" fill="#64748b" />
            </marker>
            <filter id="dropShadow" x="-10%" y="-10%" width="120%" height="130%">
              <feDropShadow dx="2" dy="3" stdDeviation="3" floodOpacity="0.15" />
            </filter>
          </defs>

          {/* Step 1: PDF Input */}
          <g transform="translate(30, 160)">
            <rect x="0" y="0" width="120" height="80" rx="10" fill="url(#pdfGrad)" filter="url(#dropShadow)" />
            <text x="60" y="35" textAnchor="middle" fill="white" fontWeight="600" fontSize="14">PDF</text>
            <text x="60" y="55" textAnchor="middle" fill="rgba(255,255,255,0.9)" fontSize="10">Input File</text>
          </g>

          {/* Step label */}
          <text x="90" y="130" textAnchor="middle" fill="#64748b" fontSize="11" fontWeight="500">Step 1</text>

          {/* Arrow 1→2 */}
          <line x1="160" y1="200" x2="200" y2="200" stroke="#64748b" strokeWidth="2" markerEnd="url(#flowArrow)" />

          {/* Step 2: Hash & Cache Check */}
          <g transform="translate(210, 140)">
            <rect x="0" y="0" width="140" height="120" rx="10" fill="url(#cacheGrad)" filter="url(#dropShadow)" />
            <text x="70" y="30" textAnchor="middle" fill="#1e293b" fontWeight="600" fontSize="12">Hash &amp; Cache</text>
            <text x="70" y="50" textAnchor="middle" fill="#292524" fontSize="10">SHA-256 Hash</text>
            <text x="70" y="65" textAnchor="middle" fill="#292524" fontSize="10">Cache Lookup</text>
            <line x1="15" y1="80" x2="125" y2="80" stroke="#292524" strokeOpacity="0.3" strokeWidth="1" />
            <text x="70" y="100" textAnchor="middle" fill="#451a03" fontSize="9">Cache Hit?</text>
            <text x="70" y="112" textAnchor="middle" fill="#451a03" fontSize="9">→ Skip Conversion</text>
          </g>
          <text x="280" y="130" textAnchor="middle" fill="#64748b" fontSize="11" fontWeight="500">Step 2</text>

          {/* Arrow 2→3 */}
          <line x1="360" y1="200" x2="400" y2="200" stroke="#64748b" strokeWidth="2" markerEnd="url(#flowArrow)" />

          {/* Step 3: Convert to Images */}
          <g transform="translate(410, 150)">
            <rect x="0" y="0" width="130" height="100" rx="10" fill="url(#processGrad)" filter="url(#dropShadow)" />
            <text x="65" y="30" textAnchor="middle" fill="white" fontWeight="600" fontSize="12">Convert</text>
            <text x="65" y="50" textAnchor="middle" fill="rgba(255,255,255,0.9)" fontSize="10">PyMuPDF</text>
            <text x="65" y="70" textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize="9">PDF → PNG</text>
            <text x="65" y="85" textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize="9">Page by Page</text>
          </g>
          <text x="475" y="140" textAnchor="middle" fill="#64748b" fontSize="11" fontWeight="500">Step 3</text>

          {/* Arrow 3→4 */}
          <line x1="550" y1="200" x2="590" y2="200" stroke="#64748b" strokeWidth="2" markerEnd="url(#flowArrow)" />

          {/* Step 4: Vision Analysis */}
          <g transform="translate(600, 140)">
            <rect x="0" y="0" width="140" height="100" rx="10" fill="url(#processGrad)" filter="url(#dropShadow)" />
            <text x="70" y="30" textAnchor="middle" fill="white" fontWeight="600" fontSize="12">Analyze</text>
            <text x="70" y="50" textAnchor="middle" fill="rgba(255,255,255,0.9)" fontSize="10">Replicate API</text>
            <text x="70" y="70" textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize="9">GPT-4o Vision</text>
            <text x="70" y="85" textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize="9">Retry + Fallback</text>
          </g>
          <text x="670" y="130" textAnchor="middle" fill="#64748b" fontSize="11" fontWeight="500">Step 4</text>

          {/* Arrow 4→5 */}
          <line x1="750" y1="200" x2="790" y2="200" stroke="#64748b" strokeWidth="2" markerEnd="url(#flowArrow)" />

          {/* Step 5: Output */}
          <g transform="translate(800, 160)">
            <rect x="0" y="0" width="90" height="80" rx="10" fill="url(#outputGrad)" filter="url(#dropShadow)" />
            <text x="45" y="35" textAnchor="middle" fill="white" fontWeight="600" fontSize="12">Output</text>
            <text x="45" y="55" textAnchor="middle" fill="rgba(255,255,255,0.9)" fontSize="10">JSON Result</text>
          </g>
          <text x="845" y="145" textAnchor="middle" fill="#64748b" fontSize="11" fontWeight="500">Step 5</text>

          {/* Extraction Modes Box */}
          <g transform="translate(600, 280)">
            <rect x="0" y="0" width="290" height="90" rx="8" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1" />
            <text x="145" y="20" textAnchor="middle" fill="#1e293b" fontWeight="600" fontSize="11">Extraction Modes</text>
            <line x1="10" y1="28" x2="280" y2="28" stroke="#e2e8f0" strokeWidth="1" />
            <g transform="translate(15, 40)">
              <rect x="0" y="0" width="55" height="20" rx="4" fill="#dbeafe" />
              <text x="27" y="14" textAnchor="middle" fill="#1d4ed8" fontSize="9">full_text</text>
            </g>
            <g transform="translate(80, 40)">
              <rect x="0" y="0" width="55" height="20" rx="4" fill="#dbeafe" />
              <text x="27" y="14" textAnchor="middle" fill="#1d4ed8" fontSize="9">summary</text>
            </g>
            <g transform="translate(145, 40)">
              <rect x="0" y="0" width="65" height="20" rx="4" fill="#dbeafe" />
              <text x="32" y="14" textAnchor="middle" fill="#1d4ed8" fontSize="9">structured</text>
            </g>
            <g transform="translate(220, 40)">
              <rect x="0" y="0" width="55" height="20" rx="4" fill="#dbeafe" />
              <text x="27" y="14" textAnchor="middle" fill="#1d4ed8" fontSize="9">markdown</text>
            </g>
            <text x="145" y="75" textAnchor="middle" fill="#64748b" fontSize="9">Different prompts for each mode</text>
          </g>

          {/* Extraction mode connection */}
          <line x1="670" y1="245" x2="670" y2="275" stroke="#94a3b8" strokeWidth="1" strokeDasharray="4" />
        </svg>
      </div>
    );
  }

  if (type === 'cache-flow') {
    return (
      <div className="diagram-container">
        <svg viewBox="0 0 700 450" width="100%" height="auto" style={{ maxWidth: '700px' }}>
          <defs>
            <marker id="cacheArrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#64748b" />
            </marker>
            <filter id="cacheShadow" x="-10%" y="-10%" width="120%" height="130%">
              <feDropShadow dx="2" dy="2" stdDeviation="2" floodOpacity="0.1" />
            </filter>
          </defs>

          {/* Cache Directory Structure */}
          <g transform="translate(50, 30)">
            <rect x="0" y="0" width="300" height="280" rx="10" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1" filter="url(#cacheShadow)" />
            <rect x="0" y="0" width="300" height="40" rx="10" fill="#e2e8f0" />
            <rect x="0" y="30" width="300" height="10" fill="#e2e8f0" />
            <text x="150" y="26" textAnchor="middle" fill="#1e293b" fontWeight="600" fontSize="13">Cache Directory Structure</text>
            
            {/* Tree structure */}
            <g transform="translate(20, 55)" fontFamily="monospace" fontSize="12">
              <text fill="#1e293b" fontWeight="500">cache/</text>
              <text x="20" y="25" fill="#475569">├── 006e5150ea001c8c/</text>
              <text x="40" y="45" fill="#64748b" fontSize="11">│   ├── metadata.json</text>
              <text x="40" y="62" fill="#64748b" fontSize="11">│   ├── content.json</text>
              <text x="40" y="79" fill="#64748b" fontSize="11">│   ├── content.md</text>
              <text x="40" y="96" fill="#64748b" fontSize="11">│   ├── page_001.png</text>
              <text x="40" y="113" fill="#64748b" fontSize="11">│   └── page_002.png</text>
              <text x="20" y="135" fill="#475569">├── 8ed544d2dd9a8b29/</text>
              <text x="40" y="152" fill="#64748b" fontSize="11">│   └── ...</text>
              <text x="20" y="170" fill="#475569">└── a6648d29b77b0027/</text>
              <text x="40" y="187" fill="#64748b" fontSize="11">    └── ...</text>
            </g>
          </g>

          {/* Cache Hit Flow */}
          <g transform="translate(400, 30)">
            <rect x="0" y="0" width="250" height="180" rx="10" fill="#ecfdf5" stroke="#86efac" strokeWidth="1" filter="url(#cacheShadow)" />
            <rect x="0" y="0" width="250" height="35" rx="10" fill="#22c55e" />
            <rect x="0" y="25" width="250" height="10" fill="#22c55e" />
            <text x="125" y="24" textAnchor="middle" fill="white" fontWeight="600" fontSize="12">✓ Cache Hit Flow</text>
            
            <g transform="translate(15, 50)" fontSize="11">
              <text fill="#1e293b" fontWeight="500">1. Compute content hash</text>
              <text y="18" fill="#475569">   SHA-256(pdf_bytes)</text>
              
              <text y="40" fill="#1e293b" fontWeight="500">2. Check cache directory</text>
              <text y="58" fill="#475569">   cache/&lbrace;hash[:32]&rbrace;/</text>
              
              <text y="80" fill="#1e293b" fontWeight="500">3. Validate metadata</text>
              <text y="98" fill="#475569">   Same DPI, pages, converter</text>
              
              <text y="120" fill="#1e293b" fontWeight="500">4. Return cached result</text>
              <text y="138" fill="#475569">   Skip conversion &amp; analysis</text>
            </g>
          </g>

          {/* Cache Miss Flow */}
          <g transform="translate(400, 240)">
            <rect x="0" y="0" width="250" height="180" rx="10" fill="#fef3c7" stroke="#fcd34d" strokeWidth="1" filter="url(#cacheShadow)" />
            <rect x="0" y="0" width="250" height="35" rx="10" fill="#f59e0b" />
            <rect x="0" y="25" width="250" height="10" fill="#f59e0b" />
            <text x="125" y="24" textAnchor="middle" fill="white" fontWeight="600" fontSize="12">⚡ Cache Miss Flow</text>
            
            <g transform="translate(15, 50)" fontSize="11">
              <text fill="#1e293b" fontWeight="500">1. Compute content hash</text>
              <text y="18" fill="#475569">   SHA-256(pdf_bytes)</text>
              
              <text y="40" fill="#1e293b" fontWeight="500">2. Convert PDF to images</text>
              <text y="58" fill="#475569">   PyMuPDF at config DPI</text>
              
              <text y="80" fill="#1e293b" fontWeight="500">3. Analyze with Vision LLM</text>
              <text y="98" fill="#475569">   Replicate API calls</text>
              
              <text y="120" fill="#1e293b" fontWeight="500">4. Save to cache</text>
              <text y="138" fill="#475569">   Images + metadata + result</text>
            </g>
          </g>

          {/* TTL Box */}
          <g transform="translate(50, 340)">
            <rect x="0" y="0" width="300" height="80" rx="8" fill="#eff6ff" stroke="#93c5fd" strokeWidth="1" />
            <text x="150" y="25" textAnchor="middle" fill="#1e40af" fontWeight="600" fontSize="12">Cache TTL Management</text>
            <text x="150" y="45" textAnchor="middle" fill="#3b82f6" fontSize="11">Default: 7 days</text>
            <text x="150" y="62" textAnchor="middle" fill="#3b82f6" fontSize="10">cleanup_expired() removes stale entries</text>
          </g>
        </svg>
      </div>
    );
  }

  if (type === 'class-hierarchy') {
    return (
      <div className="diagram-container">
        <svg viewBox="0 0 800 550" width="100%" height="auto" style={{ maxWidth: '800px' }}>
          <defs>
            <filter id="classShadow" x="-10%" y="-10%" width="120%" height="130%">
              <feDropShadow dx="2" dy="2" stdDeviation="2" floodOpacity="0.1" />
            </filter>
          </defs>

          {/* Base Exception */}
          <g transform="translate(300, 20)">
            <rect x="0" y="0" width="200" height="70" rx="8" fill="#fbbf24" stroke="#f59e0b" strokeWidth="2" filter="url(#classShadow)" />
            <text x="100" y="25" textAnchor="middle" fill="#1e293b" fontWeight="600" fontSize="13" fontFamily="monospace">PDFExtractorError</text>
            <line x1="0" y1="38" x2="200" y2="38" stroke="#f59e0b" strokeWidth="1" />
            <text x="100" y="55" textAnchor="middle" fill="#451a03" fontSize="10" fontFamily="monospace">Base Exception</text>
          </g>

          {/* Inheritance lines */}
          <line x1="200" y1="130" x2="300" y2="90" stroke="#94a3b8" strokeWidth="2" />
          <line x1="400" y1="130" x2="400" y2="90" stroke="#94a3b8" strokeWidth="2" />
          <line x1="600" y1="130" x2="500" y2="90" stroke="#94a3b8" strokeWidth="2" />

          {/* Derived Exceptions */}
          <g transform="translate(50, 130)">
            <rect x="0" y="0" width="150" height="90" rx="6" fill="#fef3c7" stroke="#fcd34d" strokeWidth="1" filter="url(#classShadow)" />
            <text x="75" y="20" textAnchor="middle" fill="#1e293b" fontWeight="600" fontSize="11" fontFamily="monospace">CacheError</text>
            <line x1="10" y1="30" x2="140" y2="30" stroke="#fcd34d" strokeWidth="1" />
            <text x="75" y="50" textAnchor="middle" fill="#451a03" fontSize="9">Cache operations</text>
            <text x="75" y="62" textAnchor="middle" fill="#451a03" fontSize="9">failures</text>
          </g>

          <g transform="translate(220, 130)">
            <rect x="0" y="0" width="150" height="90" rx="6" fill="#fecaca" stroke="#f87171" strokeWidth="1" filter="url(#classShadow)" />
            <text x="75" y="20" textAnchor="middle" fill="#1e293b" fontWeight="600" fontSize="11" fontFamily="monospace">ConversionError</text>
            <line x1="10" y1="30" x2="140" y2="30" stroke="#f87171" strokeWidth="1" />
            <text x="75" y="50" textAnchor="middle" fill="#7f1d1d" fontSize="9">PDF conversion</text>
            <text x="75" y="62" textAnchor="middle" fill="#7f1d1d" fontSize="9">failures</text>
          </g>

          <g transform="translate(390, 130)">
            <rect x="0" y="0" width="150" height="90" rx="6" fill="#fecaca" stroke="#f87171" strokeWidth="1" filter="url(#classShadow)" />
            <text x="75" y="20" textAnchor="middle" fill="#1e293b" fontWeight="600" fontSize="11" fontFamily="monospace">AnalysisError</text>
            <line x1="10" y1="30" x2="140" y2="30" stroke="#f87171" strokeWidth="1" />
            <text x="75" y="50" textAnchor="middle" fill="#7f1d1d" fontSize="9">LLM analysis</text>
            <text x="75" y="62" textAnchor="middle" fill="#7f1d1d" fontSize="9">failures</text>
          </g>

          <g transform="translate(560, 130)">
            <rect x="0" y="0" width="150" height="90" rx="6" fill="#e0e7ff" stroke="#818cf8" strokeWidth="1" filter="url(#classShadow)" />
            <text x="75" y="20" textAnchor="middle" fill="#1e293b" fontWeight="600" fontSize="11" fontFamily="monospace">ValidationError</text>
            <line x1="10" y1="30" x2="140" y2="30" stroke="#818cf8" strokeWidth="1" />
            <text x="75" y="45" textAnchor="middle" fill="#312e81" fontSize="9">Input validation</text>
            <text x="75" y="57" textAnchor="middle" fill="#312e81" fontSize="9">with field/value</text>
          </g>

          {/* Error Handling Flow */}
          <g transform="translate(50, 260)">
            <rect x="0" y="0" width="700" height="260" rx="10" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1" />
            <text x="350" y="25" textAnchor="middle" fill="#1e293b" fontWeight="600" fontSize="14">Error Handling Flow</text>
            <line x1="20" y1="35" x2="680" y2="35" stroke="#e2e8f0" strokeWidth="1" />
            
            {/* Flow boxes */}
            <g transform="translate(30, 50)">
              <rect x="0" y="0" width="130" height="60" rx="6" fill="#3b82f6" />
              <text x="65" y="25" textAnchor="middle" fill="white" fontWeight="500" fontSize="11">User Input</text>
              <text x="65" y="42" textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize="9">PDF path, config</text>
            </g>
            <path d="M170 80 L210 80" stroke="#94a3b8" strokeWidth="2" markerEnd="url(#arrowhead)" />
            
            <g transform="translate(220, 50)">
              <rect x="0" y="0" width="130" height="60" rx="6" fill="#fbbf24" />
              <text x="65" y="25" textAnchor="middle" fill="#1e293b" fontWeight="500" fontSize="11">Validate Input</text>
              <text x="65" y="42" textAnchor="middle" fill="#451a03" fontSize="9">Path, format, size</text>
            </g>
            <path d="M360 80 L400 80" stroke="#94a3b8" strokeWidth="2" markerEnd="url(#arrowhead)" />
            
            <g transform="translate(410, 50)">
              <rect x="0" y="0" width="130" height="60" rx="6" fill="#22c55e" />
              <text x="65" y="25" textAnchor="middle" fill="white" fontWeight="500" fontSize="11">Process</text>
              <text x="65" y="42" textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize="9">Convert &amp; Analyze</text>
            </g>
            <path d="M550 80 L590 80" stroke="#94a3b8" strokeWidth="2" markerEnd="url(#arrowhead)" />
            
            <g transform="translate(600, 50)">
              <rect x="0" y="0" width="80" height="60" rx="6" fill="#64748b" />
              <text x="40" y="25" textAnchor="middle" fill="white" fontWeight="500" fontSize="11">Result</text>
              <text x="40" y="42" textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize="9">JSON</text>
            </g>

            {/* Error branches */}
            <path d="M285 115 L285 140 L200 140 L200 160" stroke="#ef4444" strokeWidth="2" strokeDasharray="4" markerEnd="url(#arrowhead)" />
            <path d="M475 115 L475 140 L550 140 L550 160" stroke="#ef4444" strokeWidth="2" strokeDasharray="4" markerEnd="url(#arrowhead)" />
            
            <g transform="translate(100, 170)">
              <rect x="0" y="0" width="200" height="50" rx="6" fill="#fef2f2" stroke="#f87171" strokeWidth="1" />
              <text x="100" y="20" textAnchor="middle" fill="#991b1b" fontWeight="500" fontSize="10">ValidationError raised</text>
              <text x="100" y="35" textAnchor="middle" fill="#7f1d1d" fontSize="9">field="pdf_path", value=... )</text>
            </g>
            
            <g transform="translate(450, 170)">
              <rect x="0" y="0" width="200" height="50" rx="6" fill="#fef2f2" stroke="#f87171" strokeWidth="1" />
              <text x="100" y="20" textAnchor="middle" fill="#991b1b" fontWeight="500" fontSize="10">AnalysisError raised</text>
              <text x="100" y="35" textAnchor="middle" fill="#7f1d1d" fontSize="9">"Replicate analysis failed"</text>
            </g>
          </g>
        </svg>
      </div>
    );
  }

  return null;
}

export default Diagram;