import type { CSSProperties } from "react";
import type { ChapterPageProps } from "../components/ChapterTemplate";
import { CodeBlock } from "../components/CodeBlock";

const MAIN_FLOW_SNIPPET = `const agent = new Agent({
  initialState: {
    systemPrompt: "...call the tool exactly once...",
    model: getModel("openrouter", openRouterModelId as never),
    tools: [],
  },
});

agent.setTools([createSumNumbersTool(agent)]);

agent.subscribe((event) => {
  if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
    process.stdout.write(event.assistantMessageEvent.delta);
  }

  if (event.type === "message_end" && isAssistantMessage(event.message)) {
    if (event.message.stopReason === "error" && event.message.errorMessage) {
      console.error(\`Model error: \${event.message.errorMessage}\`);
    }
  }
});

await agent.prompt(DEMO_PROMPT);
await agent.waitForIdle();`;

const MESSAGE_EXTRACTION_SNIPPET = `function isUserMessage(m: AgentMessage): m is UserMessage {
  return (m as UserMessage).role === "user";
}

export function stringifyUserContent(msg: UserMessage): string {
  const c = msg.content;
  if (typeof c === "string") return c;
  return c
    .map((part) => {
      if (part.type === "text") return part.text;
      return "";
    })
    .join("");
}

export function getLastUserMessageText(messages: AgentMessage[]): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (isUserMessage(m)) return stringifyUserContent(m);
  }
  return null;
}`;

const TOOL_EXECUTE_SNIPPET = `execute: async () => {
  const text = getLastUserMessageText(agent.state.messages);

  if (!text) {
    return {
      content: [{ type: "text" as const, text: "No user message found in context." }],
      details: { numbers: [] as number[], sum: 0 },
    };
  }

  const numbers = extractNumbersFromText(text);
  const sum = numbers.reduce((a, b) => a + b, 0);

  return {
    content: [{
      type: "text" as const,
      text: \`Found \${numbers.length} number(s): [\${numbers.join(", ")}]. Sum = \${sum}.\`,
    }],
    details: { numbers, sum },
  };
}`;

const EVENTS_SNIPPET = `export function attachAgentLogging(agent) {
  let sawTextDelta = false;

  agent.subscribe((event) => {
    if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
      sawTextDelta = true;
      process.stdout.write(event.assistantMessageEvent.delta);
    }

    if (event.type === "message_end") {
      const text = readAssistantTextIfPresent(event.message);
      if (!sawTextDelta && text) process.stdout.write(\`\${text}\\n\`);
      sawTextDelta = false;
    }
  });
}`;

const cardStyle: CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: "0.9rem",
  background: "#fff",
};

const quizOptionStyle: CSSProperties = {
  margin: "0.35rem 0",
};

export function DataFlowChapter({
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
        <h2>1) End-to-end data flow (bird&apos;s-eye view)</h2>
        <p>
          Think of this app as a small pipeline: input text goes in, structured tool output comes
          out, and the assistant uses that output to craft a final reply. The important detail is
          that the tool does <strong>not</strong> read fresh user input directly. It reads
          conversation state from <code>agent.state.messages</code>, which makes the flow
          deterministic and replayable.
        </p>

        <svg viewBox="0 0 980 260" width="100%" role="img" aria-label="Data flow diagram">
          <rect x="20" y="70" width="150" height="70" rx="10" fill="#dbeafe" stroke="#2563eb" />
          <text x="95" y="110" textAnchor="middle" fontSize="13" fill="#1e3a8a">
            User Prompt
          </text>

          <rect x="220" y="50" width="190" height="110" rx="10" fill="#eef2ff" stroke="#4338ca" />
          <text x="315" y="90" textAnchor="middle" fontSize="13" fill="#312e81">
            Agent Runtime
          </text>
          <text x="315" y="110" textAnchor="middle" fontSize="12" fill="#312e81">
            (state + model + tools)
          </text>

          <rect x="460" y="30" width="190" height="70" rx="10" fill="#ecfeff" stroke="#0891b2" />
          <text x="555" y="72" textAnchor="middle" fontSize="12" fill="#164e63">
            Tool: sum_numbers_...
          </text>

          <rect x="460" y="130" width="190" height="80" rx="10" fill="#fff7ed" stroke="#ea580c" />
          <text x="555" y="165" textAnchor="middle" fontSize="12" fill="#9a3412">
            Regex extraction
          </text>
          <text x="555" y="183" textAnchor="middle" fontSize="12" fill="#9a3412">
            + reduce(sum)
          </text>

          <rect x="700" y="50" width="250" height="110" rx="10" fill="#f0fdf4" stroke="#16a34a" />
          <text x="825" y="90" textAnchor="middle" fontSize="13" fill="#14532d">
            Assistant response
          </text>
          <text x="825" y="110" textAnchor="middle" fontSize="12" fill="#14532d">
            streamed via events
          </text>

          <line x1="170" y1="105" x2="220" y2="105" stroke="#475569" strokeWidth="2" />
          <polygon points="220,105 210,100 210,110" fill="#475569" />

          <line x1="410" y1="85" x2="460" y2="65" stroke="#475569" strokeWidth="2" />
          <polygon points="460,65 450,61 452,71" fill="#475569" />

          <line x1="555" y1="100" x2="555" y2="130" stroke="#475569" strokeWidth="2" />
          <polygon points="555,130 550,120 560,120" fill="#475569" />

          <line x1="650" y1="70" x2="700" y2="95" stroke="#475569" strokeWidth="2" />
          <polygon points="700,95 689,95 694,86" fill="#475569" />

          <line x1="650" y1="170" x2="700" y2="115" stroke="#475569" strokeWidth="2" />
          <polygon points="700,115 690,118 697,126" fill="#475569" />
        </svg>
      </section>

      <section className="chapter-section">
        <h2>2) Where flow starts: the entrypoint (<code>src/index.ts</code>)</h2>
        <CodeBlock code={MAIN_FLOW_SNIPPET} language="ts" />
        <ul>
          <li>
            <strong>Agent initialization:</strong> the agent is created with a system prompt, a
            model, and an initially empty tools array.
          </li>
          <li>
            <strong>Tool injection:</strong> tools are attached afterward with
            <code>agent.setTools([...])</code>. This keeps setup explicit and easy to test.
          </li>
          <li>
            <strong>Streaming path:</strong> <code>message_update</code> +
            <code>text_delta</code> prints incremental assistant output.
          </li>
          <li>
            <strong>Error path:</strong> on <code>message_end</code>, if stop reason is
            <code>error</code>, the code reports model errors.
          </li>
          <li>
            <strong>Lifecycle barrier:</strong> <code>waitForIdle()</code> ensures all async work
            (tool calls + final assistant turn) is done before exit.
          </li>
        </ul>
        <p>
          Why this pattern? It separates orchestration from business logic: entrypoint controls the
          runtime lifecycle, while parsing and tool behavior live in dedicated modules.
        </p>
      </section>

      <section className="chapter-section">
        <h2>3) Message parsing abstraction (<code>dist/lib/messages.js</code>)</h2>
        <CodeBlock code={MESSAGE_EXTRACTION_SNIPPET} language="ts" />
        <p>
          This helper module solves a subtle problem: user content may arrive as either plain string
          or structured parts. JavaScript beginners often handle only one shape and crash on the
          other. Here, the module normalizes both forms into one text string.
        </p>
        <ul>
          <li>
            <strong>Type guard:</strong> <code>isUserMessage</code> narrows union types safely.
          </li>
          <li>
            <strong>Normalization:</strong> <code>stringifyUserContent</code> collapses multipart
            content into one string.
          </li>
          <li>
            <strong>Last-turn strategy:</strong> iterating backward finds the freshest user message,
            which is exactly what the sum tool needs.
          </li>
        </ul>
      </section>

      <section className="chapter-section">
        <h2>4) Tool execution and transformation (<code>dist/tools/sumNumbers.js</code>)</h2>
        <CodeBlock code={TOOL_EXECUTE_SNIPPET} language="ts" />
        <p>
          The tool performs a classic transform pipeline: <em>read context → extract numbers →
          aggregate → return structured result</em>.
        </p>
        <div style={cardStyle}>
          <strong>Edge cases handled explicitly:</strong>
          <ul>
            <li>No user message in state: returns safe fallback with sum = 0.</li>
            <li>No numbers found: reduce still returns 0 because initial value is set.</li>
            <li>Mixed content: only text parts are included in extraction.</li>
          </ul>
        </div>
        <p>
          Design choice worth noting: the tool returns both human-readable <code>content</code> and
          machine-friendly <code>details</code>. That makes it useful for both model narration and
          downstream debugging/inspection.
        </p>
      </section>

      <section className="chapter-section">
        <h2>5) Event output and fallback logic (<code>dist/agent/events.js</code>)</h2>
        <CodeBlock code={EVENTS_SNIPPET} language="js" />
        <p>
          This module avoids a common streaming bug: duplicated output. If text deltas were already
          printed, it does not print the full message again at <code>message_end</code>. If deltas
          were absent (some models/tools behave this way), it falls back to final text.
        </p>
      </section>

      <section className="chapter-section">
        <h2>Deep-dive questions (and answers)</h2>
        <ol>
          <li>
            <strong>Why parse from agent state instead of passing tool input directly?</strong>
            <p>
              It keeps tools context-aware and stateless: they can always derive input from the
              same canonical source (<code>agent.state.messages</code>), which simplifies replay and
              debugging.
            </p>
          </li>
          <li>
            <strong>Why split message helpers into <code>dist/lib/messages.js</code>?</strong>
            <p>
              Parsing content shape is a cross-cutting concern. Centralizing it prevents drift and
              duplicate parsing logic across tools/events.
            </p>
          </li>
          <li>
            <strong>Why keep both streaming and non-streaming output paths?</strong>
            <p>
              Model providers can differ in event behavior. The fallback path makes output robust
              regardless of whether deltas are emitted.
            </p>
          </li>
          <li>
            <strong>What is the biggest pitfall when extending this flow?</strong>
            <p>
              Assuming message content is always a string. Future multimodal messages (images,
              structured parts) will break naive parsing.
            </p>
          </li>
        </ol>
      </section>

      <section className="chapter-section">
        <h2>Knowledge check</h2>
        <div style={cardStyle}>
          <p>
            <strong>1) Why does the tool use <code>getLastUserMessageText</code>?</strong>
          </p>
          <p style={quizOptionStyle}>A. To avoid reading assistant or system messages ✅</p>
          <p style={quizOptionStyle}>B. To improve regex speed ❌</p>
          <p style={quizOptionStyle}>C. To bypass TypeScript checks ❌</p>
          <p>
            <em>Explanation:</em> only user-authored text should be summed; assistant messages could
            include unrelated numbers.
          </p>
        </div>

        <div style={{ ...cardStyle, marginTop: "0.9rem" }}>
          <p>
            <strong>2) What problem does <code>sawTextDelta</code> solve?</strong>
          </p>
          <p style={quizOptionStyle}>A. It tracks regex matches ❌</p>
          <p style={quizOptionStyle}>B. It prevents duplicate output when both delta and final text exist ✅</p>
          <p style={quizOptionStyle}>C. It retries failed model calls ❌</p>
          <p>
            <em>Explanation:</em> without this guard, users could see streamed text and full text
            printed twice.
          </p>
        </div>

        <div style={{ ...cardStyle, marginTop: "0.9rem" }}>
          <p>
            <strong>3) Why return <code>details</code> alongside <code>content</code> from the tool?</strong>
          </p>
          <p style={quizOptionStyle}>A. It gives structured data for programmatic use and debugging ✅</p>
          <p style={quizOptionStyle}>B. It is required by JavaScript syntax ❌</p>
          <p style={quizOptionStyle}>C. It disables model streaming ❌</p>
          <p>
            <em>Explanation:</em> <code>content</code> helps conversational output; <code>details</code>
            helps system-level inspection.
          </p>
        </div>
      </section>

      <section className="chapter-section">
        <h2>Cross-references</h2>
        <ul>
          <li>
            Revisit <a href="#architecture-overview">Architecture Overview</a> for the broader
            module map.
          </li>
          <li>
            Continue with <a href="#typescript-patterns">TypeScript Patterns</a> to understand why
            type guards and typed tool schemas matter here.
          </li>
          <li>
            Check <a href="#key-modules">Key Modules</a> for module-by-module responsibilities.
          </li>
        </ul>
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
