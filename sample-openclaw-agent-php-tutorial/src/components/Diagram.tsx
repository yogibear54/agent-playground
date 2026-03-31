export type DiagramType = 'architecture' | 'data-flow';

interface DiagramProps {
  type: DiagramType;
}

function ArchitectureDiagram() {
  return (
    <svg viewBox="0 0 980 560" width="100%" height="auto" role="img" aria-label="Architecture overview diagram">
      <defs>
        <linearGradient id="entryGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
        <linearGradient id="coreGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <linearGradient id="adapterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </linearGradient>
        <linearGradient id="runtimeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <marker id="arrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#64748b" />
        </marker>
      </defs>

      <rect x="320" y="18" width="340" height="72" rx="12" fill="url(#entryGrad)" />
      <text x="490" y="47" textAnchor="middle" fill="#ffffff" fontSize="16" fontWeight="700">
        Entry Layer
      </text>
      <text x="490" y="68" textAnchor="middle" fill="rgba(255,255,255,0.92)" fontSize="12">
        bin/agent.php + Composer script + environment bootstrap
      </text>

      <line x1="490" y1="92" x2="490" y2="122" stroke="#64748b" strokeWidth="2" markerEnd="url(#arrow)" />

      <rect x="220" y="126" width="540" height="98" rx="12" fill="url(#coreGrad)" />
      <text x="490" y="162" textAnchor="middle" fill="#ffffff" fontSize="18" fontWeight="700">
        Core Orchestrator (src/AgentDaemon.php)
      </text>
      <text x="490" y="186" textAnchor="middle" fill="rgba(255,255,255,0.92)" fontSize="12">
        Event loop • thread state • Anthropic tool-calling • heartbeat scheduling
      </text>

      <line x1="490" y1="226" x2="490" y2="256" stroke="#64748b" strokeWidth="2" markerEnd="url(#arrow)" />

      <rect x="52" y="266" width="274" height="118" rx="10" fill="url(#adapterGrad)" stroke="#cbd5e1" />
      <text x="189" y="296" textAnchor="middle" fill="#0f172a" fontSize="14" fontWeight="700">
        Slack Integration Adapter
      </text>
      <text x="189" y="319" textAnchor="middle" fill="#334155" fontSize="11">
        apps.connections.open + events_api envelope ACK
      </text>
      <text x="189" y="337" textAnchor="middle" fill="#334155" fontSize="11">
        chat.postMessage + assistant typing indicator
      </text>
      <text x="189" y="355" textAnchor="middle" fill="#64748b" fontSize="10">
        Socket Mode over WebSocket (textalk/websocket)
      </text>

      <rect x="352" y="266" width="274" height="118" rx="10" fill="url(#adapterGrad)" stroke="#cbd5e1" />
      <text x="489" y="296" textAnchor="middle" fill="#0f172a" fontSize="14" fontWeight="700">
        Anthropic Adapter
      </text>
      <text x="489" y="319" textAnchor="middle" fill="#334155" fontSize="11">
        messages API request with tool schemas
      </text>
      <text x="489" y="337" textAnchor="middle" fill="#334155" fontSize="11">
        tool_use parsing + tool_result feedback loop
      </text>
      <text x="489" y="355" textAnchor="middle" fill="#64748b" fontSize="10">
        model: claude-opus-4-1-20250805
      </text>

      <rect x="652" y="266" width="274" height="118" rx="10" fill="url(#adapterGrad)" stroke="#cbd5e1" />
      <text x="789" y="296" textAnchor="middle" fill="#0f172a" fontSize="14" fontWeight="700">
        Runtime Tool Layer
      </text>
      <text x="789" y="319" textAnchor="middle" fill="#334155" fontSize="11">
        send_slack_message • read_file • write_file
      </text>
      <text x="789" y="337" textAnchor="middle" fill="#334155" fontSize="11">
        execute_bash with safety policy (strict / relaxed)
      </text>
      <text x="789" y="355" textAnchor="middle" fill="#64748b" fontSize="10">
        Workspace confinement at ~/.picobot/workspace
      </text>

      <line x1="190" y1="388" x2="190" y2="430" stroke="#64748b" strokeWidth="1.8" markerEnd="url(#arrow)" />
      <line x1="490" y1="388" x2="490" y2="430" stroke="#64748b" strokeWidth="1.8" markerEnd="url(#arrow)" />
      <line x1="790" y1="388" x2="790" y2="430" stroke="#64748b" strokeWidth="1.8" markerEnd="url(#arrow)" />

      <rect x="220" y="436" width="540" height="96" rx="12" fill="url(#runtimeGrad)" />
      <text x="490" y="468" textAnchor="middle" fill="#ffffff" fontSize="16" fontWeight="700">
        Runtime Persistence Layer (~/.picobot)
      </text>
      <text x="490" y="491" textAnchor="middle" fill="rgba(255,255,255,0.92)" fontSize="12">
        threads/*.json conversation memory • workspace prompt files • skills metadata
      </text>
      <text x="490" y="512" textAnchor="middle" fill="rgba(255,255,255,0.82)" fontSize="11">
        Enables long-running daemon behavior across Slack thread interactions
      </text>
    </svg>
  );
}

function DataFlowDiagram() {
  return (
    <svg viewBox="0 0 1100 560" width="100%" height="auto" role="img" aria-label="Data flow diagram">
      <defs>
        <marker id="flowArrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#334155" />
        </marker>
      </defs>

      <rect x="28" y="220" width="130" height="92" rx="10" fill="#2563eb" />
      <text x="93" y="258" textAnchor="middle" fill="#ffffff" fontSize="13" fontWeight="700">Slack DM</text>
      <text x="93" y="280" textAnchor="middle" fill="rgba(255,255,255,0.9)" fontSize="10">events_api</text>

      <rect x="198" y="188" width="158" height="158" rx="10" fill="#e2e8f0" stroke="#cbd5e1" />
      <text x="277" y="218" textAnchor="middle" fill="#0f172a" fontSize="12" fontWeight="700">handleSlackMessageEvent</text>
      <text x="277" y="238" textAnchor="middle" fill="#334155" fontSize="10">authorize user</text>
      <text x="277" y="254" textAnchor="middle" fill="#334155" fontSize="10">set typing status</text>
      <text x="277" y="270" textAnchor="middle" fill="#334155" fontSize="10">enqueue pending user msg</text>
      <text x="277" y="286" textAnchor="middle" fill="#334155" fontSize="10">runThreadLoop(threadTs)</text>

      <rect x="392" y="188" width="180" height="158" rx="10" fill="#10b981" />
      <text x="482" y="218" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="700">runThreadLoop</text>
      <text x="482" y="238" textAnchor="middle" fill="rgba(255,255,255,0.9)" fontSize="10">load thread JSON</text>
      <text x="482" y="254" textAnchor="middle" fill="rgba(255,255,255,0.9)" fontSize="10">merge pending messages</text>
      <text x="482" y="270" textAnchor="middle" fill="rgba(255,255,255,0.9)" fontSize="10">isConversationAtRest?</text>
      <text x="482" y="286" textAnchor="middle" fill="rgba(255,255,255,0.9)" fontSize="10">generateMessages()</text>
      <text x="482" y="302" textAnchor="middle" fill="rgba(255,255,255,0.9)" fontSize="10">save thread JSON</text>

      <rect x="608" y="188" width="172" height="158" rx="10" fill="#f59e0b" />
      <text x="694" y="218" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="700">Anthropic API</text>
      <text x="694" y="238" textAnchor="middle" fill="rgba(255,255,255,0.9)" fontSize="10">messages.create</text>
      <text x="694" y="254" textAnchor="middle" fill="rgba(255,255,255,0.9)" fontSize="10">returns assistant blocks</text>
      <text x="694" y="270" textAnchor="middle" fill="rgba(255,255,255,0.9)" fontSize="10">text + tool_use</text>

      <rect x="816" y="188" width="250" height="158" rx="10" fill="#f8fafc" stroke="#cbd5e1" />
      <text x="941" y="218" textAnchor="middle" fill="#0f172a" fontSize="12" fontWeight="700">Tool Execution</text>
      <text x="941" y="238" textAnchor="middle" fill="#334155" fontSize="10">send_slack_message</text>
      <text x="941" y="254" textAnchor="middle" fill="#334155" fontSize="10">read_file / write_file</text>
      <text x="941" y="270" textAnchor="middle" fill="#334155" fontSize="10">execute_bash safety checks</text>
      <text x="941" y="286" textAnchor="middle" fill="#334155" fontSize="10">emit tool_result blocks</text>

      <line x1="158" y1="266" x2="198" y2="266" stroke="#334155" strokeWidth="2" markerEnd="url(#flowArrow)" />
      <line x1="356" y1="266" x2="392" y2="266" stroke="#334155" strokeWidth="2" markerEnd="url(#flowArrow)" />
      <line x1="572" y1="266" x2="608" y2="266" stroke="#334155" strokeWidth="2" markerEnd="url(#flowArrow)" />
      <line x1="780" y1="266" x2="816" y2="266" stroke="#334155" strokeWidth="2" markerEnd="url(#flowArrow)" />

      <path
        d="M 940 352 C 940 430, 700 440, 700 370"
        fill="none"
        stroke="#334155"
        strokeWidth="2"
        strokeDasharray="6 5"
        markerEnd="url(#flowArrow)"
      />
      <text x="785" y="438" textAnchor="middle" fill="#475569" fontSize="10">
        tool_result appended as next user message
      </text>

      <rect x="302" y="430" width="488" height="92" rx="10" fill="#1d4ed8" />
      <text x="546" y="462" textAnchor="middle" fill="#ffffff" fontSize="13" fontWeight="700">
        Completion condition
      </text>
      <text x="546" y="486" textAnchor="middle" fill="rgba(255,255,255,0.92)" fontSize="11">
        Loop exits when last assistant message contains no tool_use blocks
      </text>
      <text x="546" y="505" textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize="10">
        Then agent waits for next Slack event or heartbeat trigger
      </text>
    </svg>
  );
}

function Diagram({ type }: DiagramProps) {
  return (
    <div className="diagram-card">
      {type === 'architecture' ? <ArchitectureDiagram /> : <DataFlowDiagram />}
    </div>
  );
}

export default Diagram;
