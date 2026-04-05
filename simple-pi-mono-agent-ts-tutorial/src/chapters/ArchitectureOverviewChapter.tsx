import { CodeBlock } from "../components/CodeBlock";
import type { ChapterPageProps } from "../components/ChapterTemplate";

const TREE_SNIPPET = `simple-pi-mono-agent-ts/
├─ src/index.ts                      # TypeScript-first, source-of-truth implementation
├─ dist/                             # Compiled runtime modules actually executed by Node
│  ├─ index.js                       # Runtime entrypoint (orchestrates startup lifecycle)
│  ├─ agent/
│  │  ├─ createAgent.js              # Agent composition root (model + prompt + tools)
│  │  └─ events.js                   # Streaming/logging adapter for terminal output
│  ├─ tools/sumNumbers.js            # Domain tool (extract + sum numeric literals)
│  ├─ lib/messages.js                # Message parsing helpers / type guard boundary
│  ├─ config/env.js                  # Env validation + defaults
│  └─ prompts/system.js              # Prompt constants
├─ package.json
├─ tsconfig.json
└─ .env.example`;

const BOOTSTRAP_SNIPPET = `// dist/index.js
async function main() {
  const config = loadConfigFromEnv();
  if (!config) return; // fail-fast boundary

  const agent = createAgent(config);
  attachAgentLogging(agent);

  await agent.prompt(DEMO_PROMPT);
  await agent.waitForIdle();
}`;

const COMPOSITION_SNIPPET = `// dist/agent/createAgent.js
export function createAgent(config) {
  const agent = new Agent({
    initialState: {
      systemPrompt: SYSTEM_PROMPT,
      model: getModel("openrouter", config.openRouterModelId),
      tools: [],
    },
  });

  agent.setTools([createSumNumbersTool(agent)]);
  return agent;
}`;

const TOOL_SNIPPET = `// dist/tools/sumNumbers.js
const NUMBER_PATTERN = /-?\\d+(?:\\.\\d+)?/g;

function extractNumbersFromText(text) {
  const out = [];
  for (const m of text.matchAll(NUMBER_PATTERN)) {
    const n = Number.parseFloat(m[0]);
    if (Number.isFinite(n)) out.push(n);
  }
  return out;
}

execute: async () => {
  const text = getLastUserMessageText(agent.state.messages);
  if (!text) return { content: [{ type: "text", text: "No user message found in context." }], details: { numbers: [], sum: 0 } };

  const numbers = extractNumbersFromText(text);
  const sum = numbers.reduce((a, b) => a + b, 0);
  return { content: [{ type: "text", text: "Found \${numbers.length} number(s)... Sum = \${sum}." }], details: { numbers, sum } };
};`;

const MESSAGE_HELPERS_SNIPPET = `// dist/lib/messages.js
export function getLastUserMessageText(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role === "user") return stringifyUserContent(m);
  }
  return null;
}`;

export function ArchitectureOverviewChapter({
  title,
  overview,
  filesCovered,
  prevTitle,
  nextTitle,
  onPrev,
  onNext,
  complete,
  onToggleComplete,
}: ChapterPageProps) {
  return (
    <article className="chapter">
      <header className="chapter-header">
        <h1>{title}</h1>
        {overview.map((paragraph) =>
          paragraph ? <p key={paragraph}>{paragraph}</p> : null,
        )}
        <p>
          Think of this project like a tiny production service: one orchestration entrypoint,
          one composition root, one domain tool, and a few utility boundaries that keep concerns
          separated.
        </p>
      </header>

      <section className="chapter-section">
        <h2>Files Covered</h2>
        <ul className="files-list">
          {filesCovered.map((file) => (
            <li key={file}>
              <code>{file}</code>
            </li>
          ))}
        </ul>
      </section>

      <section className="chapter-section">
        <h2>1) Architecture at a glance</h2>
        <CodeBlock code={TREE_SNIPPET} language="bash" />
        <p>
          The architecture is intentionally layered from outside-in: <code>index.js</code> handles
          lifecycle, <code>agent/*</code> handles runtime wiring, <code>tools/*</code> handles domain
          behavior, <code>lib/*</code> handles reusable parsing helpers, and <code>config/prompts</code>
          provide pure configuration data.
        </p>
      </section>

      <section className="chapter-section">
        <h2>2) Runtime startup flow (orchestration pattern)</h2>
        <CodeBlock code={BOOTSTRAP_SNIPPET} language="ts" />
        <p>
          This module is an <strong>orchestrator</strong>, not a logic container. It does four things:
          validate env config, build the agent, attach logging, then run a prompt and wait for idle.
          That boundary makes debugging easier because startup failures and runtime failures are
          separated.
        </p>
      </section>

      <section className="chapter-section">
        <h2>3) Composition root: why createAgent exists</h2>
        <CodeBlock code={COMPOSITION_SNIPPET} language="ts" />
        <p>
          <code>createAgent</code> is a composition root: one place where model provider, system
          prompt, and tools are assembled. This is cleaner than constructing the agent inline in
          <code>main()</code> because later changes (new tools, model switching, A/B prompts) happen in
          one file.
        </p>
      </section>

      <section className="chapter-section">
        <h2>4) Domain tool boundary and data transformation</h2>
        <CodeBlock code={TOOL_SNIPPET} language="ts" />
        <p>
          The tool applies a simple pipeline: read last user text → parse numbers with regex → sum
          numbers → return both natural-language content and structured <code>details</code>. Returning
          both forms is a practical pattern: humans read <code>content</code>, programs inspect
          <code>details</code>.
        </p>
        <p>
          Edge-case behavior is explicit: if no user message exists, it returns a safe result instead
          of throwing. This keeps tool execution deterministic and user-friendly.
        </p>
      </section>

      <section className="chapter-section">
        <h2>5) Message helpers: localizing format assumptions</h2>
        <CodeBlock code={MESSAGE_HELPERS_SNIPPET} language="ts" />
        <p>
          Scanning from the end is an intentional optimization and correctness choice: we only need
          the most recent user message, so reverse traversal avoids extra work and reflects
          conversation semantics.
        </p>
      </section>

      <section className="chapter-section">
        <h2>Architecture diagram (request → tool → streamed response)</h2>
        <svg
          viewBox="0 0 940 320"
          role="img"
          aria-label="Architecture data flow from entrypoint to agent to tool and output"
          style={{ width: "100%", height: "auto", border: "1px solid var(--border)", borderRadius: 12, background: "#fff" }}
        >
          <defs>
            <marker id="arrow" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">
              <path d="M0,0 L10,4 L0,8 z" fill="#2563eb" />
            </marker>
          </defs>
          <rect x="20" y="40" width="190" height="90" rx="10" fill="#dbeafe" stroke="#2563eb" />
          <text x="34" y="73" fontSize="15" fontFamily="Noto Sans">dist/index.js</text>
          <text x="34" y="96" fontSize="13" fontFamily="Noto Sans">main() orchestration</text>

          <rect x="255" y="40" width="210" height="90" rx="10" fill="#eef2ff" stroke="#4f46e5" />
          <text x="269" y="73" fontSize="15" fontFamily="Noto Sans">agent/createAgent.js</text>
          <text x="269" y="96" fontSize="13" fontFamily="Noto Sans">model + prompt + tools</text>

          <rect x="510" y="40" width="205" height="90" rx="10" fill="#ecfeff" stroke="#0891b2" />
          <text x="524" y="73" fontSize="15" fontFamily="Noto Sans">tools/sumNumbers.js</text>
          <text x="524" y="96" fontSize="13" fontFamily="Noto Sans">parse + compute</text>

          <rect x="750" y="40" width="170" height="90" rx="10" fill="#f0fdf4" stroke="#15803d" />
          <text x="765" y="73" fontSize="15" fontFamily="Noto Sans">agent/events.js</text>
          <text x="765" y="96" fontSize="13" fontFamily="Noto Sans">stream to stdout</text>

          <line x1="210" y1="85" x2="255" y2="85" stroke="#2563eb" strokeWidth="2.5" markerEnd="url(#arrow)" />
          <line x1="465" y1="85" x2="510" y2="85" stroke="#2563eb" strokeWidth="2.5" markerEnd="url(#arrow)" />
          <line x1="715" y1="85" x2="750" y2="85" stroke="#2563eb" strokeWidth="2.5" markerEnd="url(#arrow)" />

          <rect x="255" y="185" width="300" height="100" rx="10" fill="#f8fafc" stroke="#64748b" />
          <text x="271" y="215" fontSize="15" fontFamily="Noto Sans">lib/messages.js</text>
          <text x="271" y="238" fontSize="13" fontFamily="Noto Sans">getLastUserMessageText()</text>
          <text x="271" y="259" fontSize="13" fontFamily="Noto Sans">readAssistantTextIfPresent()</text>

          <line x1="612" y1="130" x2="430" y2="185" stroke="#0ea5e9" strokeWidth="2" markerEnd="url(#arrow)" />
          <text x="495" y="165" fontSize="12" fill="#0f766e" fontFamily="Noto Sans">tool reads conversation state</text>
        </svg>
      </section>

      <section className="chapter-section">
        <h2>Deep-dive analysis questions (and answers)</h2>
        <ol>
          <li>
            <strong>Why split src and dist instead of running only src?</strong> Because dist is the
            deployable runtime artifact; source remains clean and typed, while emitted JS guarantees
            Node can execute without TS tooling in production.
          </li>
          <li>
            <strong>Why keep env loading in config/env.js?</strong> Centralized fail-fast validation
            prevents partial startup states and keeps required environment assumptions explicit.
          </li>
          <li>
            <strong>Why does the tool read from agent.state.messages instead of prompt input args?</strong>
            It enables tool behavior that is context-aware across conversation turns and mirrors real
            agent workflows.
          </li>
          <li>
            <strong>What pitfall exists in numeric extraction?</strong> The regex matches plain numeric
            literals only; currency symbols and locale formats (e.g. <code>1,234.56</code>) are not
            normalized.
          </li>
          <li>
            <strong>How would you extend this architecture?</strong> Add more tools in
            <code>createAgent</code>, keep message parsing helpers in <code>lib</code>, and keep
            orchestration in <code>index</code> unchanged.
          </li>
        </ol>
      </section>

      <section className="chapter-section">
        <h2>Knowledge check</h2>
        <div className="placeholder-grid">
          <div className="placeholder-card">
            <h3>Q1. Where should you add a new tool?</h3>
            <p>A) dist/index.js &nbsp; B) dist/agent/createAgent.js &nbsp; C) dist/prompts/system.js</p>
            <p>
              <strong>Answer: B.</strong> Tool registration belongs in the composition root so startup
              orchestration stays minimal.
            </p>
          </div>
          <div className="placeholder-card">
            <h3>Q2. Why is <code>if (!config) return;</code> important?</h3>
            <p>A) It caches config &nbsp; B) It prevents invalid runtime boot &nbsp; C) It speeds regex parsing</p>
            <p>
              <strong>Answer: B.</strong> This is a fail-fast guard that avoids constructing an agent with
              missing credentials.
            </p>
          </div>
          <div className="placeholder-card">
            <h3>Q3. Why reverse-iterate messages?</h3>
            <p>A) To find the newest user message first &nbsp; B) To sort roles &nbsp; C) To mutate history</p>
            <p>
              <strong>Answer: A.</strong> It matches the “most recent input” requirement with minimal work.
            </p>
          </div>
          <div className="placeholder-card">
            <h3>Q4. Which chapter should you read next for module-level detail?</h3>
            <p>
              A) <em>Key Modules</em> &nbsp; B) <em>TypeScript Patterns</em> &nbsp; C) <em>Data Flow</em>
            </p>
            <p>
              <strong>Best next step: A, then C.</strong> <em>Key Modules</em> explains responsibilities,
              and <em>Data Flow</em> traces runtime values end-to-end.
            </p>
          </div>
        </div>
      </section>

      <section className="chapter-section actions-row">
        <button className="btn" onClick={onToggleComplete}>
          {complete ? "Mark as not completed" : "Mark chapter complete"}
        </button>
      </section>

      <nav className="chapter-nav" aria-label="Chapter navigation">
        <button className="btn secondary" onClick={onPrev} disabled={!onPrev}>
          {prevTitle ? `← ${prevTitle}` : "← Start of tutorial"}
        </button>
        <button className="btn secondary" onClick={onNext} disabled={!onNext}>
          {nextTitle ? `${nextTitle} →` : "End of tutorial →"}
        </button>
      </nav>
    </article>
  );
}
