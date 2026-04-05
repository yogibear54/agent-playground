import { CodeBlock } from "../components/CodeBlock";
import type { ChapterPageProps } from "../components/ChapterTemplate";

const IMPORTS_SNIPPET = `import { Agent, type AgentMessage, type AgentTool } from "@mariozechner/pi-agent-core";
import { getModel, type UserMessage } from "@mariozechner/pi-ai";
import { Type } from "@sinclair/typebox";`;

const TYPE_GUARDS_SNIPPET = `function isUserMessage(m: AgentMessage): m is UserMessage {
  return (m as UserMessage).role === "user";
}

function isAssistantMessage(m: AgentMessage): m is Extract<AgentMessage, { role: "assistant" }> {
  return (m as { role?: string }).role === "assistant";
}`;

const TOOL_TYPING_SNIPPET = `const emptyParams = Type.Object({});

function createSumNumbersTool(agent: Agent): AgentTool<typeof emptyParams> {
  return {
    name: "sum_numbers_in_last_user_message",
    parameters: emptyParams,
    execute: async () => {
      const text = getLastUserMessageText(agent.state.messages);
      // ...
      return {
        content: [{ type: "text" as const, text: "..." }],
        details: { numbers, sum },
      };
    },
  };
}`;

const MESSAGE_FLOW_SNIPPET = `export function getLastUserMessageText(messages: AgentMessage[]): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (isUserMessage(m)) return stringifyUserContent(m);
  }
  return null;
}

export function stringifyUserContent(msg: UserMessage): string {
  const c = msg.content;
  if (typeof c === "string") return c;
  return c.map((part) => (part.type === "text" ? part.text : "")).join("");
}`;

const TSCONFIG_SNIPPET = `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "skipLibCheck": true,
    "noEmitOnError": true
  },
  "include": ["src/**/*.ts"]
}`;

const PACKAGE_SNIPPET = `{
  "type": "module",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx src/index.ts"
  },
  "dependencies": {
    "@mariozechner/pi-agent-core": "^0.61.1",
    "@mariozechner/pi-ai": "^0.61.1",
    "@sinclair/typebox": "^0.34.0"
  }
}`;

type QuizQuestion = {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
};

const QUIZ: QuizQuestion[] = [
  {
    question: "Why use `type` imports in `import { Agent, type AgentMessage } ...`?",
    options: [
      "A) To make runtime code faster by default",
      "B) To ensure type-only symbols are erased from emitted JavaScript",
      "C) Because Node.js refuses mixed imports",
      "D) To avoid having to install dependencies",
    ],
    answer: "B",
    explanation:
      "`type` imports communicate intent and let TypeScript erase them at emit time. This keeps runtime JS clean and prevents accidental value imports.",
  },
  {
    question: "What problem does `m is UserMessage` solve in a type guard?",
    options: [
      "A) It validates API keys",
      "B) It narrows union types so TypeScript knows which fields are safe",
      "C) It converts unknown JSON into class instances",
      "D) It forces runtime exceptions when roles mismatch",
    ],
    answer: "B",
    explanation:
      "`AgentMessage` is a union. The predicate `m is UserMessage` tells the compiler what branch we are in after the check.",
  },
  {
    question: "Why does `createSumNumbersTool` return `AgentTool<typeof emptyParams>`?",
    options: [
      "A) To bind runtime schema and compile-time type to the same source of truth",
      "B) To reduce bundle size",
      "C) To avoid writing async functions",
      "D) To auto-generate environment variables",
    ],
    answer: "A",
    explanation:
      "`Type.Object({})` defines schema at runtime and `typeof emptyParams` feeds exact parameter typing into `AgentTool` generics.",
  },
  {
    question: "Why return `string | null` from `getLastUserMessageText` instead of always a string?",
    options: [
      "A) It is shorter syntax",
      "B) Nullability makes the missing-message case explicit and forces handling",
      "C) TypeScript does not support empty strings",
      "D) Agent tools require null",
    ],
    answer: "B",
    explanation:
      "The function can legitimately fail to find a user message. Returning `null` encodes that possibility in the type system.",
  },
];

export function TypeScriptPatternsChapter({
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
        <h2>1) Pattern: Type-only imports + ESM clarity</h2>
        <p>
          This project mixes <strong>runtime values</strong> and <strong>compile-time types</strong>
          in imports. For JavaScript developers new to TypeScript, this is one of the highest-value
          habits: value imports are executed at runtime, while <code>type</code> imports are erased.
        </p>
        <CodeBlock code={IMPORTS_SNIPPET} language="ts" />
        <ul>
          <li>
            <strong>Line 1:</strong> <code>Agent</code> is a runtime value, but
            <code> AgentMessage</code> and <code>AgentTool</code> are compile-time-only contracts.
          </li>
          <li>
            <strong>Line 2:</strong> same split for <code>getModel</code> (value) and
            <code> UserMessage</code> (type).
          </li>
          <li>
            <strong>Line 3:</strong> <code>Type</code> from TypeBox is runtime schema-builder API.
          </li>
        </ul>
        <p>
          <strong>Why this pattern:</strong> it prevents accidental runtime coupling and makes ESM output
          predictable with <code>"type": "module"</code> (see <em>Configuration &amp; Entry Points</em>
          chapter).
        </p>
      </section>

      <section className="chapter-section">
        <h2>2) Pattern: Type guards for safe union narrowing</h2>
        <p>
          <code>AgentMessage</code> is a union of message shapes. The code uses custom type guards to
          narrow safely before reading role-specific fields.
        </p>
        <CodeBlock code={TYPE_GUARDS_SNIPPET} language="ts" />
        <ul>
          <li>
            <strong>Runtime check:</strong> role is tested with simple string comparisons.
          </li>
          <li>
            <strong>Compile-time effect:</strong> in guarded branches, TypeScript now knows which
            message variant you have.
          </li>
          <li>
            <strong>Trade-off:</strong> manual guards are explicit and fast, but rely on role fields
            being consistent with upstream library contracts.
          </li>
        </ul>
      </section>

      <section className="chapter-section">
        <h2>3) Pattern: Schema-driven tool typing (single source of truth)</h2>
        <p>
          The tool definition combines TypeBox runtime schema + TypeScript generic typing so your tool
          is validated both at runtime and compile time.
        </p>
        <CodeBlock code={TOOL_TYPING_SNIPPET} language="ts" />
        <p>
          The key move is <code>AgentTool&lt;typeof emptyParams&gt;</code>. If parameters change later,
          the schema and TypeScript type stay aligned automatically.
        </p>
        <p>
          <strong>Alternative:</strong> a handwritten interface for params plus separate validator.
          That is flexible but easier to desynchronize. This project chooses consistency over maximum
          flexibility.
        </p>
      </section>

      <section className="chapter-section">
        <h2>4) Data flow + nullability contracts</h2>
        <p>
          The core helper pipeline is: <code>messages -&gt; last user message -&gt; normalized text -&gt;
          number extraction -&gt; sum</code>.
        </p>
        <CodeBlock code={MESSAGE_FLOW_SNIPPET} language="ts" />
        <ul>
          <li>
            Reverse loop prioritizes the newest user message without extra allocations.
          </li>
          <li>
            <code>string | null</code> return type forces caller-side handling for missing context.
          </li>
          <li>
            <code>stringifyUserContent</code> gracefully ignores non-text content blocks.
          </li>
        </ul>

        <div className="diagram-wrap" role="img" aria-label="Data flow from prompt to tool execution">
          <svg viewBox="0 0 900 220" width="100%" height="220" xmlns="http://www.w3.org/2000/svg">
            <rect x="20" y="50" width="150" height="70" rx="10" fill="#dbeafe" stroke="#2563eb" />
            <text x="95" y="90" textAnchor="middle" fontSize="14">User prompt</text>

            <rect x="210" y="50" width="170" height="70" rx="10" fill="#ecfeff" stroke="#0891b2" />
            <text x="295" y="80" textAnchor="middle" fontSize="14">Agent state</text>
            <text x="295" y="98" textAnchor="middle" fontSize="12">messages[]</text>

            <rect x="420" y="50" width="210" height="70" rx="10" fill="#fef9c3" stroke="#ca8a04" />
            <text x="525" y="80" textAnchor="middle" fontSize="14">getLastUserMessageText</text>
            <text x="525" y="98" textAnchor="middle" fontSize="12">string | null</text>

            <rect x="670" y="50" width="210" height="70" rx="10" fill="#dcfce7" stroke="#16a34a" />
            <text x="775" y="80" textAnchor="middle" fontSize="14">extract + reduce</text>
            <text x="775" y="98" textAnchor="middle" fontSize="12">numbers[] + sum</text>

            <line x1="170" y1="85" x2="210" y2="85" stroke="#475569" strokeWidth="2" markerEnd="url(#arrow)" />
            <line x1="380" y1="85" x2="420" y2="85" stroke="#475569" strokeWidth="2" markerEnd="url(#arrow)" />
            <line x1="630" y1="85" x2="670" y2="85" stroke="#475569" strokeWidth="2" markerEnd="url(#arrow)" />

            <defs>
              <marker id="arrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#475569" />
              </marker>
            </defs>
          </svg>
        </div>
      </section>

      <section className="chapter-section">
        <h2>5) Compiler/runtime configuration patterns</h2>
        <p>
          TypeScript patterns are reinforced by config. The compiler and package settings protect your
          runtime assumptions.
        </p>
        <CodeBlock code={TSCONFIG_SNIPPET} language="json" />
        <CodeBlock code={PACKAGE_SNIPPET} language="json" />
        <ul>
          <li>
            <code>strict: true</code> catches nullable and union mistakes early (important for message
            handling code).
          </li>
          <li>
            <code>module/moduleResolution: NodeNext</code> matches modern Node ESM behavior.
          </li>
          <li>
            <code>noEmitOnError: true</code> ensures bad type states never produce runnable build output.
          </li>
          <li>
            <code>tsx src/index.ts</code> gives fast TypeScript dev execution, while <code>tsc</code>+
            <code> node dist/index.js</code> mirrors production.
          </li>
        </ul>
      </section>

      <section className="chapter-section">
        <h2>Deeper analysis questions (for code reviews)</h2>
        <ol>
          <li>Should number parsing accept scientific notation (e.g. <code>1e3</code>)?</li>
          <li>
            Would a stricter validator around message content parts reduce silent dropping of non-text
            blocks?
          </li>
          <li>
            Is scanning from end of <code>messages</code> enough, or do we need timestamp checks for
            concurrent tool calls?
          </li>
          <li>
            Should tool logs use a structured logger instead of <code>console.log</code> for production
            observability?
          </li>
          <li>
            If tool parameters grow, should we keep inline schema definitions or move to a dedicated
            schema module?
          </li>
        </ol>
      </section>

      <section className="chapter-section">
        <h2>Knowledge check</h2>
        {QUIZ.map((q, i) => (
          <details key={q.question} className="quiz-item">
            <summary>
              <strong>
                Q{i + 1}. {q.question}
              </strong>
            </summary>
            <ul>
              {q.options.map((opt) => (
                <li key={opt}>{opt}</li>
              ))}
            </ul>
            <p>
              <strong>Answer:</strong> {q.answer}
            </p>
            <p>{q.explanation}</p>
          </details>
        ))}
      </section>

      <section className="chapter-section callout">
        <p>
          Cross-reference: revisit <strong>Data Flow</strong> for event sequencing, and
          <strong> Configuration &amp; Entry Points</strong> for environment/model wiring choices.
        </p>
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
