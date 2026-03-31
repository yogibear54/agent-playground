import React from 'react'
import CodeBlock from '../components/CodeBlock'
import Diagram from '../components/Diagram'
import Callout from '../components/Callout'
import Quiz from '../components/Quiz'
import type { ChapterData } from '../data/types'

export const chapter2: ChapterData = {
  id: 'entry-points-config',
  number: 2,
  title: 'Entry Points & Configuration',
  subtitle: 'How the project boots up — package.json, tsconfig, and environment',
  sourceFiles: ['package.json', 'tsconfig.json', '.env.example', 'src/index.ts'],
  render: () => (
    <>
      <h2>Entry Points & Configuration</h2>
      <p className="chapter-subtitle">Understanding how the project is configured and launched</p>

      <h3>Package Configuration</h3>
      <p>
        The <code>package.json</code> declares this as an ESM project (<code>"type": "module"</code>)
        and provides three scripts for development and production workflows:
      </p>
      <CodeBlock
        language="json"
        filename="package.json"
        code={`{
  "name": "simple-agent",
  "version": "0.0.1",
  "private": true,
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
}`}
      />

      <table>
        <thead>
          <tr><th>Script</th><th>Command</th><th>When to Use</th></tr>
        </thead>
        <tbody>
          <tr>
            <td><code>dev</code></td>
            <td><code>tsx src/index.ts</code></td>
            <td>Development — runs TypeScript directly without compiling</td>
          </tr>
          <tr>
            <td><code>build</code></td>
            <td><code>tsc</code></td>
            <td>Compiles <code>src/</code> → <code>dist/</code></td>
          </tr>
          <tr>
            <td><code>start</code></td>
            <td><code>node dist/index.js</code></td>
            <td>Runs the compiled output (run <code>build</code> first)</td>
          </tr>
        </tbody>
      </table>

      <Callout type="info" title="tsx vs ts-node">
        <code>tsx</code> is a modern TypeScript execution engine that uses esbuild under the hood.
        It's significantly faster than <code>ts-node</code> and supports ESM natively — making it ideal
        for development workflows.
      </Callout>

      <h3>TypeScript Configuration</h3>
      <CodeBlock
        language="json"
        filename="tsconfig.json"
        code={`{
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
}`}
      />
      <p>Key configuration choices:</p>
      <ul>
        <li><strong><code>target: "ES2022"</code></strong> — Output modern JavaScript with top-level await support</li>
        <li><strong><code>module: "NodeNext"</code></strong> — Full ESM support with Node.js module resolution</li>
        <li><strong><code>strict: true</code></strong> — Enables all strict type-checking options</li>
        <li><strong><code>noEmitOnError: true</code></strong> — Won't produce output if there are type errors</li>
      </ul>

      <h3>Environment Variables</h3>
      <p>The project uses OpenRouter as its LLM provider. Configuration is done through environment variables:</p>
      <CodeBlock
        language="bash"
        filename=".env.example"
        code={`# OpenRouter (required) — https://openrouter.ai/settings/keys
OPENROUTER_API_KEY=

# Optional — any model id from https://openrouter.ai/models
# OPENROUTER_MODEL=anthropic/claude-sonnet-4`}
      />
      <Callout type="warning" title="API Key Required">
        The <code>main()</code> function explicitly checks for <code>OPENROUTER_API_KEY</code> and exits
        with an error if it's missing. The key is never committed to the repository — only the
        <code>.env.example</code> template is tracked.
      </Callout>

      <h3>Boot Sequence Diagram</h3>
      <Diagram title="Application Startup Flow">
        <svg width="500" height="320" viewBox="0 0 500 320" xmlns="http://www.w3.org/2000/svg">
          {/* Steps */}
          <rect x="150" y="10" width="200" height="44" rx="8" fill="#6c5ce7" opacity="0.12" stroke="#6c5ce7" strokeWidth="1.5"/>
          <text x="250" y="30" textAnchor="middle" fontSize="12" fontWeight="600" fill="#6c5ce7">1. main() called</text>
          <text x="250" y="46" textAnchor="middle" fontSize="10" fill="#64647a">Top-level await entry point</text>

          <line x1="250" y1="54" x2="250" y2="74" stroke="#999" strokeWidth="1.5" markerEnd="url(#arrow2)"/>

          <rect x="120" y="74" width="260" height="44" rx="8" fill="#3b82f6" opacity="0.12" stroke="#3b82f6" strokeWidth="1.5"/>
          <text x="250" y="94" textAnchor="middle" fontSize="12" fontWeight="600" fill="#3b82f6">2. Validate OPENROUTER_API_KEY</text>
          <text x="250" y="110" textAnchor="middle" fontSize="10" fill="#64647a">Exit early if missing</text>

          <line x1="250" y1="118" x2="250" y2="138" stroke="#999" strokeWidth="1.5" markerEnd="url(#arrow2)"/>

          <rect x="110" y="138" width="280" height="44" rx="8" fill="#10b981" opacity="0.12" stroke="#10b981" strokeWidth="1.5"/>
          <text x="250" y="158" textAnchor="middle" fontSize="12" fontWeight="600" fill="#10b981">{`3. new Agent({ initialState })`}</text>
          <text x="250" y="174" textAnchor="middle" fontSize="10" fill="#64647a">systemPrompt + getModel("openrouter", ...)</text>

          <line x1="250" y1="182" x2="250" y2="202" stroke="#999" strokeWidth="1.5" markerEnd="url(#arrow2)"/>

          <rect x="115" y="202" width="270" height="44" rx="8" fill="#f59e0b" opacity="0.12" stroke="#f59e0b" strokeWidth="1.5"/>
          <text x="250" y="222" textAnchor="middle" fontSize="12" fontWeight="600" fill="#d97706">4. agent.setTools([sumTool])</text>
          <text x="250" y="238" textAnchor="middle" fontSize="10" fill="#64647a">Register tool after construction (closure pattern)</text>

          <line x1="250" y1="246" x2="250" y2="266" stroke="#999" strokeWidth="1.5" markerEnd="url(#arrow2)"/>

          <rect x="90" y="266" width="320" height="44" rx="8" fill="#ef4444" opacity="0.12" stroke="#ef4444" strokeWidth="1.5"/>
          <text x="250" y="286" textAnchor="middle" fontSize="12" fontWeight="600" fill="#dc2626">5. agent.subscribe() → agent.prompt() → waitForIdle()</text>
          <text x="250" y="302" textAnchor="middle" fontSize="10" fill="#64647a">Listen for events, send demo prompt, wait for completion</text>

          <defs>
            <marker id="arrow2" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#999"/>
            </marker>
          </defs>
        </svg>
      </Diagram>
    </>
  ),
  quiz: [
    {
      question: 'What does the "type": "module" field in package.json enable?',
      options: [
        'CommonJS module support',
        'ES Module (ESM) support for .js files',
        'TypeScript module compilation',
        'Babel transpilation',
      ],
      correctIndex: 1,
      explanation: '"type": "module" tells Node.js to treat .js files as ES Modules (using import/export syntax) rather than CommonJS (require/module.exports).',
    },
    {
      question: 'Why does the main() function check for OPENROUTER_API_KEY before creating the Agent?',
      options: [
        'The Agent constructor requires it as a parameter',
        'To fail fast with a clear error message rather than an obscure API error later',
        'It\'s a TypeScript compilation requirement',
        'The key must be set before importing pi-ai',
      ],
      correctIndex: 1,
      explanation: 'Checking early provides a user-friendly error message. Without this check, the program would fail deep inside the LLM API call with a confusing authentication error.',
    },
    {
      question: 'What is the purpose of the tsx package in the dev script?',
      options: [
        'It\'s a testing framework',
        'It compiles TypeScript to JavaScript for production',
        'It executes TypeScript files directly without a separate build step',
        'It provides TypeScript type definitions',
      ],
      correctIndex: 2,
      explanation: 'tsx is a TypeScript execution tool powered by esbuild. It lets you run .ts files directly (tsx src/index.ts) without running tsc first, making the development loop faster.',
    },
  ],
}
