import { CodeBlock } from "../components/CodeBlock";
import type { ChapterPageProps } from "../components/ChapterTemplate";

const PACKAGE_JSON_SNIPPET = `{
  "name": "simple-agent",
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

const ENV_AND_README_SNIPPET = `# .env.example
OPENROUTER_API_KEY=
# OPENROUTER_MODEL=anthropic/claude-sonnet-4

# README highlights
npm run dev
npm run build
npm start`;

const SRC_ENTRY_SNIPPET = `async function main(): Promise<void> {
  if (!process.env.OPENROUTER_API_KEY?.trim()) {
    console.error("Set OPENROUTER_API_KEY in the environment. See README.md.");
    process.exitCode = 1;
    return;
  }

  const openRouterModelId = process.env.OPENROUTER_MODEL?.trim() || "openrouter/auto";

  const agent = new Agent({
    initialState: {
      systemPrompt: "...",
      model: getModel("openrouter", openRouterModelId as never),
      tools: [],
    },
  });

  agent.setTools([createSumNumbersTool(agent)]);
  await agent.prompt(DEMO_PROMPT);
  await agent.waitForIdle();
}`;

const DIST_ENV_SNIPPET = `export const DEFAULT_OPENROUTER_MODEL = "openrouter/auto";

export function loadConfigFromEnv() {
  if (!process.env.OPENROUTER_API_KEY?.trim()) {
    console.error("Set OPENROUTER_API_KEY in the environment. See README.md.");
    process.exitCode = 1;
    return null;
  }

  return {
    openRouterModelId: process.env.OPENROUTER_MODEL?.trim() || DEFAULT_OPENROUTER_MODEL,
  };
}`;

const DIST_INDEX_SNIPPET = `async function main() {
  const config = loadConfigFromEnv();
  if (!config) return;

  const agent = createAgent(config);
  attachAgentLogging(agent);

  await agent.prompt(DEMO_PROMPT);
  await agent.waitForIdle();
}`;

type QuizQuestion = {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
};

const QUIZ: QuizQuestion[] = [
  {
    question: "Why does this project use both `tsx src/index.ts` and `node dist/index.js` workflows?",
    options: [
      "A) One is for development speed, the other validates production-like compiled output",
      "B) Node.js cannot execute TypeScript unless both commands run every time",
      "C) `tsx` and `tsc` are identical and included for style preference",
      "D) `node dist/index.js` is only needed for linting",
    ],
    answer: "A",
    explanation:
      "`tsx` gives fast feedback during development, while build+start confirms the emitted JavaScript in `dist/` behaves correctly in runtime conditions.",
  },
  {
    question: "What is the main reason for `module: NodeNext` + `type: module`?",
    options: [
      "A) To force CommonJS compatibility",
      "B) To align TypeScript emit/resolution with modern Node ESM behavior",
      "C) To disable import paths with file extensions",
      "D) To make TypeScript strict mode optional",
    ],
    answer: "B",
    explanation:
      "This combination makes compiler behavior match Node's modern ESM loader rules, which avoids subtle module-resolution mismatches.",
  },
  {
    question: "Why does env validation return `null` and set `process.exitCode` instead of throwing immediately?",
    options: [
      "A) It avoids any error handling in callers",
      "B) It enables fail-fast startup while keeping orchestration flow explicit and testable",
      "C) Throwing is not supported in async functions",
      "D) It is required by `@mariozechner/pi-agent-core`",
    ],
    answer: "B",
    explanation:
      "Returning `null` creates an explicit control-flow branch (`if (!config) return`). Setting `exitCode` still communicates failure to the shell without an unhandled exception path.",
  },
  {
    question: "What is a common extension-safe place to add new configuration variables?",
    options: [
      "A) Inside every tool execute() function",
      "B) In the centralized env loader (`dist/config/env.js` pattern)",
      "C) Only in README.md",
      "D) In package-lock.json",
    ],
    answer: "B",
    explanation:
      "Centralizing env parsing keeps configuration concerns in one boundary and prevents config drift across modules.",
  },
];

export function ConfigAndEntrypointsChapter({
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
          If this project were a small CLI product, this chapter is its launchpad manual.
          We will trace how configuration enters the app, how TypeScript settings shape output,
          and how the entrypoint keeps startup deterministic.
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
        <h2>1) Big picture: configuration surfaces and runtime boundary</h2>
        <p>
          This chapter's files define a clean sequence:
          <strong> package.json</strong> defines runnable commands,
          <strong> tsconfig.json</strong> defines compile behavior,
          <strong> .env.example + README</strong> define operator inputs,
          then <strong>index</strong> files execute the runtime lifecycle.
        </p>
        <CodeBlock code={PACKAGE_JSON_SNIPPET} language="json" />
        <ul>
          <li>
            <strong>Scripts are intentional contracts:</strong> dev mode uses <code>tsx</code>,
            production-like mode uses <code>tsc</code> then Node on emitted JS.
          </li>
          <li>
            <strong>Dependency split:</strong> runtime libraries in <code>dependencies</code>,
            compiler/runtime tooling in <code>devDependencies</code>.
          </li>
          <li>
            <strong>Why this pattern:</strong> new contributors can discover the entire run lifecycle
            by reading one file and one README section.
          </li>
        </ul>
      </section>

      <section className="chapter-section">
        <h2>2) TypeScript config: why these compiler settings matter</h2>
        <CodeBlock code={TSCONFIG_SNIPPET} language="json" />
        <p>
          For JavaScript developers new to TypeScript, this file is not just compiler metadata—it is
          a correctness policy.
        </p>
        <ul>
          <li>
            <strong><code>target: ES2022</code></strong>: emitted JS can use modern Node features
            without aggressive down-level transforms.
          </li>
          <li>
            <strong><code>module/moduleResolution: NodeNext</code></strong>: aligns TS behavior with
            Node ESM semantics. This avoids “works in TS, fails in Node” module bugs.
          </li>
          <li>
            <strong><code>strict: true</code></strong>: forces explicit handling of nullable states,
            which is critical in env loading and message processing.
          </li>
          <li>
            <strong><code>noEmitOnError: true</code></strong>: prevents shipping stale/broken JS when
            types fail.
          </li>
        </ul>
        <p>
          Trade-off: strictness can feel slower at first, but it dramatically reduces runtime
          surprises—especially when extending config and tool signatures.
        </p>
      </section>

      <section className="chapter-section">
        <h2>3) Environment contract: `.env.example` + README as operational docs</h2>
        <CodeBlock code={ENV_AND_README_SNIPPET} language="bash" />
        <p>
          The project uses a simple but robust convention: examples in <code>.env.example</code>,
          rationale and defaults in <code>README.md</code>, and enforcement in code.
        </p>
        <ul>
          <li>
            <strong>Required variable:</strong> <code>OPENROUTER_API_KEY</code>.
          </li>
          <li>
            <strong>Optional variable:</strong> <code>OPENROUTER_MODEL</code>, with fallback to
            <code> openrouter/auto</code> in runtime code.
          </li>
          <li>
            <strong>Pitfall to avoid:</strong> keeping examples and actual env loader logic out of
            sync. In this repo, the docs and code stay consistent.
          </li>
        </ul>
      </section>

      <section className="chapter-section">
        <h2>4) `src/index.ts`: monolithic source entrypoint walkthrough</h2>
        <CodeBlock code={SRC_ENTRY_SNIPPET} language="ts" />
        <p>
          Let us break this down line-by-line from a startup lifecycle perspective:
        </p>
        <ol>
          <li>
            <strong>Fail-fast guard:</strong> missing API key logs a clear operator message,
            sets non-zero exit code, and returns.
          </li>
          <li>
            <strong>Config normalization:</strong> model id is trimmed and defaulted once,
            so later code never deals with blank env values.
          </li>
          <li>
            <strong>Agent composition:</strong> model + system prompt + tools are wired before use.
          </li>
          <li>
            <strong>Execution:</strong> prompt is sent, then process waits for idle to avoid early exit.
          </li>
        </ol>
        <p>
          Why this is a good entrypoint pattern: orchestration code stays linear and readable, while
          domain logic (number extraction and tool behavior) remains in dedicated helpers.
        </p>
      </section>

      <section className="chapter-section">
        <h2>5) `dist/config/env.js` + `dist/index.js`: production-style split responsibilities</h2>
        <p>
          The built output shows a more modular architecture than the single-file source. This is a
          useful teaching contrast: source may start monolithic for clarity, while runtime structure
          can evolve into separable modules.
        </p>
        <CodeBlock code={DIST_ENV_SNIPPET} language="ts" />
        <CodeBlock code={DIST_INDEX_SNIPPET} language="ts" />
        <ul>
          <li>
            <strong>Config boundary extracted:</strong> <code>loadConfigFromEnv()</code> becomes a reusable,
            testable function.
          </li>
          <li>
            <strong>Entrypoint simplifies:</strong> <code>main()</code> now coordinates config,
            agent creation, and logging adapters.
          </li>
          <li>
            <strong>Design rationale:</strong> separation of concerns makes future additions safer
            (new env vars, multiple prompts, alternate startup modes).
          </li>
        </ul>
      </section>

      <section className="chapter-section">
        <h2>Configuration and startup data flow diagram</h2>
        <div className="diagram-wrap" role="img" aria-label="Data flow from shell environment to agent startup">
          <svg viewBox="0 0 980 290" width="100%" height="290" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <marker id="cfgArrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#334155" />
              </marker>
            </defs>

            <rect x="24" y="44" width="190" height="78" rx="10" fill="#e0f2fe" stroke="#0284c7" />
            <text x="119" y="74" textAnchor="middle" fontSize="15" fontFamily="Noto Sans">Shell /.env</text>
            <text x="119" y="95" textAnchor="middle" fontSize="12" fontFamily="Noto Sans">OPENROUTER_* vars</text>

            <rect x="254" y="44" width="230" height="78" rx="10" fill="#fef9c3" stroke="#ca8a04" />
            <text x="369" y="74" textAnchor="middle" fontSize="15" fontFamily="Noto Sans">loadConfigFromEnv()</text>
            <text x="369" y="95" textAnchor="middle" fontSize="12" fontFamily="Noto Sans">validate + default</text>

            <rect x="524" y="44" width="195" height="78" rx="10" fill="#dcfce7" stroke="#16a34a" />
            <text x="621" y="74" textAnchor="middle" fontSize="15" fontFamily="Noto Sans">createAgent()</text>
            <text x="621" y="95" textAnchor="middle" fontSize="12" fontFamily="Noto Sans">model + tools</text>

            <rect x="759" y="44" width="198" height="78" rx="10" fill="#ede9fe" stroke="#7c3aed" />
            <text x="858" y="74" textAnchor="middle" fontSize="15" fontFamily="Noto Sans">main() run cycle</text>
            <text x="858" y="95" textAnchor="middle" fontSize="12" fontFamily="Noto Sans">prompt + waitForIdle</text>

            <line x1="214" y1="83" x2="254" y2="83" stroke="#334155" strokeWidth="2" markerEnd="url(#cfgArrow)" />
            <line x1="484" y1="83" x2="524" y2="83" stroke="#334155" strokeWidth="2" markerEnd="url(#cfgArrow)" />
            <line x1="719" y1="83" x2="759" y2="83" stroke="#334155" strokeWidth="2" markerEnd="url(#cfgArrow)" />

            <rect x="254" y="166" width="324" height="92" rx="10" fill="#fff1f2" stroke="#e11d48" />
            <text x="416" y="195" textAnchor="middle" fontSize="15" fontFamily="Noto Sans">Fail-fast branch</text>
            <text x="416" y="217" textAnchor="middle" fontSize="12" fontFamily="Noto Sans">missing OPENROUTER_API_KEY</text>
            <text x="416" y="238" textAnchor="middle" fontSize="12" fontFamily="Noto Sans">set process.exitCode = 1 and return</text>

            <line x1="369" y1="122" x2="369" y2="166" stroke="#e11d48" strokeWidth="2" markerEnd="url(#cfgArrow)" />
          </svg>
        </div>
      </section>

      <section className="chapter-section">
        <h2>How to safely extend this configuration layer</h2>
        <p>
          If you add a new variable (for example <code>OPENROUTER_TIMEOUT_MS</code>), follow this order:
        </p>
        <ol>
          <li>Add it to <code>.env.example</code> with comments.</li>
          <li>Document behavior/default in <code>README.md</code>.</li>
          <li>Parse + validate it once in env loader code.</li>
          <li>Pass typed config into agent creation (not into random call sites).</li>
        </ol>
        <p>
          This pattern prevents “configuration scattering,” where magic strings spread across the codebase.
        </p>
      </section>

      <section className="chapter-section">
        <h2>Deep-dive analysis questions (for design reviews)</h2>
        <ol>
          <li>
            Should env parsing throw typed errors instead of returning <code>null</code>?
            What does each approach do to CLI UX and testability?
          </li>
          <li>
            Is <code>openrouter/auto</code> the right default for reproducibility, or should docs pin a
            deterministic model id?
          </li>
          <li>
            At what point should we move from plain <code>process.env</code> reads to a schema-validated
            config object shared across modules?
          </li>
          <li>
            How should startup logging evolve if this program runs in CI/production instead of local terminal usage?
          </li>
          <li>
            Should dev and prod entrypoints diverge further (e.g., flags, retries, health checks),
            or stay unified for simplicity?
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
          Cross-reference: connect this chapter with <strong>Architecture Overview</strong> (composition boundaries),
          <strong> Data Flow</strong> (event lifecycle), and <strong>TypeScript Patterns</strong>
          (type guards and schema-driven contracts).
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
