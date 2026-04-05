import type { ChapterPageProps } from "../components/ChapterTemplate";
import { CodeBlock } from "../components/CodeBlock";

const MODULE_BOUNDARY_SNIPPET = `// dist/agent/createAgent.js
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

const EVENTS_SNIPPET = `// dist/agent/events.js
export function attachAgentLogging(agent) {
  let sawTextDelta = false;

  agent.subscribe((event) => {
    if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
      sawTextDelta = true;
      process.stdout.write(event.assistantMessageEvent.delta);
    }

    if (event.type === "message_end") {
      const text = readAssistantTextIfPresent(event.message);
      if (!sawTextDelta && text) process.stdout.write(text + "\\n");
      sawTextDelta = false;
    }
  });
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

export function createSumNumbersTool(agent) {
  return {
    name: "sum_numbers_in_last_user_message",
    parameters: Type.Object({}),
    execute: async () => {
      const text = getLastUserMessageText(agent.state.messages);
      if (!text) {
        return {
          content: [{ type: "text", text: "No user message found in context." }],
          details: { numbers: [], sum: 0 },
        };
      }

      const numbers = extractNumbersFromText(text);
      const sum = numbers.reduce((a, b) => a + b, 0);
      return {
        content: [{ type: "text", text: "Found " + numbers.length + " number(s). Sum = " + sum + "." }],
        details: { numbers, sum },
      };
    },
  };
}`;

const MESSAGE_UTILS_SNIPPET = `// dist/lib/messages.js
export function getLastUserMessageText(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role === "user") return stringifyUserContent(m);
  }
  return null;
}

export function readAssistantTextIfPresent(message) {
  if (message.role !== "assistant") return null;
  const text = message.content
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("")
    .trim();
  return text || null;
}`;

const ENTRYPOINT_SNIPPET = `// src/index.ts (trimmed)
const agent = new Agent({
  initialState: {
    systemPrompt: "...call the tool exactly once...",
    model: getModel("openrouter", openRouterModelId as never),
    tools: [],
  },
});

agent.setTools([createSumNumbersTool(agent)]);
agent.subscribe(/* stream text and handle model errors */);
await agent.prompt(DEMO_PROMPT);
await agent.waitForIdle();`;

const PROMPTS_SNIPPET = `// dist/prompts/system.js
export const SYSTEM_PROMPT =
  "You are a helpful assistant. When the user asks to sum numbers that appear in their message, call the tool sum_numbers_in_last_user_message exactly once and answer using its result.";

export const DEMO_PROMPT =
  "I bought items for 12.50, 8, and 3.25 dollars. What is the sum of those amounts? Use the tool to sum the numbers in my message.";`;

export function KeyModulesChapter({
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
        <h2>1) Module relationship map</h2>
        <p>
          Think of this project as a small assembly line: one module creates the agent, one module defines
          a tool, one module reads/writes message content, and one module handles streamed events.
        </p>
        <svg viewBox="0 0 880 240" role="img" aria-label="Key module architecture" style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 12, background: "#fff" }}>
          <rect x="20" y="70" width="170" height="90" rx="10" fill="#dbeafe" stroke="#2563eb" />
          <text x="35" y="102" fontSize="14" fill="#1f2937">src/index.ts</text>
          <text x="35" y="124" fontSize="12" fill="#1f2937">Bootstraps runtime</text>

          <rect x="230" y="20" width="190" height="90" rx="10" fill="#ecfeff" stroke="#0891b2" />
          <text x="245" y="52" fontSize="14" fill="#1f2937">dist/agent/createAgent.js</text>
          <text x="245" y="74" fontSize="12" fill="#1f2937">Builds Agent + registers tool</text>

          <rect x="230" y="130" width="190" height="90" rx="10" fill="#fef9c3" stroke="#ca8a04" />
          <text x="245" y="162" fontSize="14" fill="#1f2937">dist/agent/events.js</text>
          <text x="245" y="184" fontSize="12" fill="#1f2937">Streams/prints responses</text>

          <rect x="470" y="20" width="190" height="90" rx="10" fill="#ede9fe" stroke="#7c3aed" />
          <text x="485" y="52" fontSize="14" fill="#1f2937">dist/tools/sumNumbers.js</text>
          <text x="485" y="74" fontSize="12" fill="#1f2937">Tool business logic</text>

          <rect x="470" y="130" width="190" height="90" rx="10" fill="#fee2e2" stroke="#dc2626" />
          <text x="485" y="162" fontSize="14" fill="#1f2937">dist/lib/messages.js</text>
          <text x="485" y="184" fontSize="12" fill="#1f2937">Message extraction helpers</text>

          <rect x="700" y="70" width="160" height="90" rx="10" fill="#dcfce7" stroke="#16a34a" />
          <text x="715" y="102" fontSize="14" fill="#1f2937">dist/prompts/system.js</text>
          <text x="715" y="124" fontSize="12" fill="#1f2937">Behavior contract</text>

          <line x1="190" y1="95" x2="230" y2="65" stroke="#334155" markerEnd="url(#arrow)" />
          <line x1="190" y1="135" x2="230" y2="175" stroke="#334155" markerEnd="url(#arrow)" />
          <line x1="420" y1="65" x2="470" y2="65" stroke="#334155" markerEnd="url(#arrow)" />
          <line x1="420" y1="175" x2="470" y2="175" stroke="#334155" markerEnd="url(#arrow)" />
          <line x1="660" y1="65" x2="700" y2="95" stroke="#334155" markerEnd="url(#arrow)" />
          <defs>
            <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
              <path d="M0,0 L0,6 L9,3 z" fill="#334155" />
            </marker>
          </defs>
        </svg>
      </section>

      <section className="chapter-section">
        <h2>2) Deep analysis questions (the ones you should ask while reading code)</h2>
        <ol>
          <li>Why split <code>createAgent</code>, <code>events</code>, and <code>sumNumbers</code> into separate modules instead of one file?</li>
          <li>Why does the tool read from <code>agent.state.messages</code> instead of taking raw user text as a direct parameter?</li>
          <li>How does <code>sawTextDelta</code> prevent duplicate output in streamed vs non-streamed responses?</li>
          <li>What edge cases does the number regex handle, and what does it intentionally not handle (for example, scientific notation)?</li>
          <li>If you add another tool, where should the registration, logging, and message parsing logic live?</li>
        </ol>
      </section>

      <section className="chapter-section">
        <h2>3) Entrypoint walkthrough: how everything gets wired</h2>
        <CodeBlock code={ENTRYPOINT_SNIPPET} language="ts" />
        <p>
          The entrypoint coordinates lifecycle, but it does not try to own every concern. That is a deliberate
          design choice: orchestration in one place, implementation details in focused modules.
        </p>
        <ol>
          <li><code>{"new Agent({ initialState })"}</code> creates runtime state with model + behavioral rules.</li>
          <li><code>setTools(...)</code> injects callable capabilities after construction.</li>
          <li><code>subscribe(...)</code> attaches an event observer so output can stream to the CLI.</li>
          <li><code>prompt(...)</code> starts one interaction turn.</li>
          <li><code>waitForIdle()</code> blocks process exit until all async work is complete.</li>
        </ol>
        <ul>
          <li><strong>Agent construction:</strong> injects model + system prompt.</li>
          <li><strong>Tool registration:</strong> installs a tool factory that closes over <code>agent</code>.</li>
          <li><strong>Event subscription:</strong> streams partial text and handles terminal errors.</li>
          <li><strong>Execution:</strong> sends one prompt and waits for idle to avoid early process exit.</li>
        </ul>
      </section>

      <section className="chapter-section">
        <h2>4) Pattern deep-dive by module</h2>

        <h3>4.1 Agent creation as a composition root</h3>
        <CodeBlock code={MODULE_BOUNDARY_SNIPPET} language="js" />
        <p>
          <strong>Why this pattern:</strong> <code>createAgent</code> acts like a composition root (a central
          place where dependencies are assembled). This keeps callers from remembering "all the pieces"
          every time they spin up an agent.
        </p>
        <ol>
          <li><code>SYSTEM_PROMPT</code> is imported so behavior rules are centralized.</li>
          <li><code>getModel("openrouter", ...)</code> abstracts provider-specific model wiring.</li>
          <li><code>tools: []</code> satisfies state shape early, then tools are bound deliberately via <code>setTools</code>.</li>
        </ol>

        <h3>4.2 Event adapter pattern for CLI output</h3>
        <CodeBlock code={EVENTS_SNIPPET} language="js" />
        <p>
          <code>attachAgentLogging</code> adapts low-level event objects into user-facing terminal output.
          The <code>sawTextDelta</code> flag protects against a subtle duplication bug: some runs stream
          text chunks, while others only provide final text at message end.
        </p>
        <ol>
          <li>On <code>message_update + text_delta</code>, print token chunks immediately.</li>
          <li>On <code>message_end</code>, print full text only if no deltas were seen.</li>
          <li>Reset <code>sawTextDelta</code> so the next assistant turn starts clean.</li>
        </ol>

        <h3>4.3 Tool as pure-ish business logic + side-effect boundary</h3>
        <CodeBlock code={TOOL_SNIPPET} language="js" />
        <p>
          The tool keeps parsing and math straightforward, then returns structured output ({`{ content, details }`}).
          That <code>details</code> object is handy for debugging and future analytics, even if the user only sees text.
        </p>
        <ol>
          <li>Regex extraction isolates number parsing into one tiny helper.</li>
          <li>Empty-context guard returns a safe response instead of throwing.</li>
          <li><code>reduce</code> computes the sum from parsed literals.</li>
          <li>Return payload includes machine-friendly details for downstream use.</li>
        </ol>

        <h3>4.4 Message utility module reduces repeated defensive code</h3>
        <CodeBlock code={MESSAGE_UTILS_SNIPPET} language="js" />
        <p>
          Centralizing message parsing avoids repeated role checks and content-shape checks across the codebase.
          This is especially useful for developers coming from JavaScript: TypeScript-friendly helpers keep unsafe
          narrowing logic in one place.
        </p>

        <h3>4.5 Prompt module as behavior contract</h3>
        <CodeBlock code={PROMPTS_SNIPPET} language="js" />
        <p>
          The prompt file is tiny, but it is architecturally important: it encodes the contract between the model
          and tool layer ("call this tool exactly once"). In practice, this is where reliability often starts or breaks.
        </p>
      </section>

      <section className="chapter-section">
        <h2>5) Data flow from prompt to response</h2>
        <svg viewBox="0 0 860 180" role="img" aria-label="Data flow from user message to tool output" style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 12, background: "#fff" }}>
          <rect x="20" y="60" width="120" height="56" rx="8" fill="#dbeafe" stroke="#2563eb" />
          <text x="42" y="93" fontSize="13">User text</text>

          <rect x="170" y="60" width="140" height="56" rx="8" fill="#ecfeff" stroke="#0891b2" />
          <text x="187" y="93" fontSize="13">Agent messages[]</text>

          <rect x="340" y="60" width="160" height="56" rx="8" fill="#fee2e2" stroke="#dc2626" />
          <text x="355" y="93" fontSize="13">getLastUserMessageText</text>

          <rect x="530" y="60" width="120" height="56" rx="8" fill="#ede9fe" stroke="#7c3aed" />
          <text x="550" y="93" fontSize="13">Regex parse</text>

          <rect x="680" y="60" width="160" height="56" rx="8" fill="#dcfce7" stroke="#16a34a" />
          <text x="699" y="84" fontSize="13">Tool result</text>
          <text x="699" y="102" fontSize="12">content + details</text>

          <line x1="140" y1="88" x2="170" y2="88" stroke="#334155" markerEnd="url(#arrow2)" />
          <line x1="310" y1="88" x2="340" y2="88" stroke="#334155" markerEnd="url(#arrow2)" />
          <line x1="500" y1="88" x2="530" y2="88" stroke="#334155" markerEnd="url(#arrow2)" />
          <line x1="650" y1="88" x2="680" y2="88" stroke="#334155" markerEnd="url(#arrow2)" />

          <defs>
            <marker id="arrow2" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
              <path d="M0,0 L0,6 L9,3 z" fill="#334155" />
            </marker>
          </defs>
        </svg>
        <p>
          Cross-reference: the <strong>Data Flow</strong> chapter dives deeper into event ordering and tool-call timing.
          The <strong>TypeScript Patterns</strong> chapter explains why type guards make this flow safer.
        </p>
      </section>

      <section className="chapter-section">
        <h2>6) Pitfalls and edge cases you should anticipate</h2>
        <ul>
          <li><strong>No user message found:</strong> tool returns a safe fallback with sum = 0 instead of throwing.</li>
          <li><strong>Regex limitations:</strong> numbers like <code>1e3</code> are not captured by the current pattern.</li>
          <li><strong>Output duplication risk:</strong> solved by tracking whether deltas already printed.</li>
          <li><strong>Prompt-tool contract drift:</strong> if system prompt changes, tool usage behavior may degrade.</li>
          <li><strong>Floating-point precision:</strong> decimals may show JS precision artifacts for some values.</li>
        </ul>
      </section>

      <section className="chapter-section">
        <h2>7) Knowledge check</h2>

        <div className="placeholder-card">
          <h3>Q1. Why is <code>tools: []</code> passed during initial agent state before <code>setTools()</code>?</h3>
          <p>A) It is required by the Agent state shape and allows later runtime wiring.</p>
          <p>B) It improves regex extraction speed.</p>
          <p>C) It prevents any events from being emitted.</p>
          <details>
            <summary>Answer</summary>
            <p><strong>Correct: A.</strong> The state expects a tools array; wiring afterward keeps creation and runtime setup decoupled.</p>
          </details>
        </div>

        <div className="placeholder-card" style={{ marginTop: 12 }}>
          <h3>Q2. What problem does <code>sawTextDelta</code> solve?</h3>
          <p>A) It retries failed requests.</p>
          <p>B) It avoids printing the same assistant text twice across streaming and final events.</p>
          <p>C) It validates model IDs.</p>
          <details>
            <summary>Answer</summary>
            <p><strong>Correct: B.</strong> If deltas were already printed, the final full text should not be printed again.</p>
          </details>
        </div>

        <div className="placeholder-card" style={{ marginTop: 12 }}>
          <h3>Q3. Why keep <code>getLastUserMessageText</code> in a shared lib module?</h3>
          <p>A) To reduce duplicated role/content checks and keep parsing logic consistent.</p>
          <p>B) To make prompts shorter.</p>
          <p>C) To avoid using TypeScript entirely.</p>
          <details>
            <summary>Answer</summary>
            <p><strong>Correct: A.</strong> Shared helpers centralize defensive parsing and make future tools easier to implement.</p>
          </details>
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
