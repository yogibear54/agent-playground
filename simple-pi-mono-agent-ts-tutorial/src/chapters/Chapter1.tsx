import React from 'react'
import CodeBlock from '../components/CodeBlock'
import Diagram from '../components/Diagram'
import Callout from '../components/Callout'
import Quiz from '../components/Quiz'
import type { ChapterData } from '../data/types'

export const chapter1: ChapterData = {
  id: 'architecture-overview',
  number: 1,
  title: 'Architecture Overview',
  subtitle: 'A bird\'s-eye view of the project structure and design philosophy',
  sourceFiles: ['src/index.ts', 'package.json', 'tsconfig.json'],
  render: () => (
    <>
      <h2>Architecture Overview</h2>
      <p className="chapter-subtitle">Understanding the big picture before diving into code</p>

      <p>
        <strong>simple-pi-mono-agent-ts</strong> is a minimal, single-file TypeScript agent that demonstrates how to build
        AI-powered tool-calling agents using the <code>pi-mono</code> ecosystem. Despite its small size,
        the project follows clean separation of concerns and serves as an excellent reference architecture
        for building more complex agents.
      </p>

      <h3>Project at a Glance</h3>
      <p>
        The entire agent logic lives in a single file — <code>src/index.ts</code> — yet it's organized into
        clearly distinct layers:
      </p>
      <ul>
        <li><strong>Pure utility functions</strong> — number extraction and message parsing</li>
        <li><strong>Tool definition</strong> — the <code>AgentTool</code> that performs the sum</li>
        <li><strong>Agent lifecycle</strong> — construction, subscription, prompting, and waiting</li>
        <li><strong>Entry point</strong> — the <code>main()</code> function that wires everything together</li>
      </ul>

      <h3>Dependency Stack</h3>
      <p>The project depends on three key packages from the pi-mono ecosystem:</p>
      <table>
        <thead>
          <tr>
            <th>Package</th>
            <th>Purpose</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>@mariozechner/pi-agent-core</code></td>
            <td>Agent runtime — <code>Agent</code> class, tool types, message types, event system</td>
          </tr>
          <tr>
            <td><code>@mariozechner/pi-ai</code></td>
            <td>AI provider wiring — <code>getModel()</code>, provider registry, streaming</td>
          </tr>
          <tr>
            <td><code>@sinclair/typebox</code></td>
            <td>Runtime type schemas for tool parameters (JSON Schema compatible)</td>
          </tr>
        </tbody>
      </table>

      <Callout type="info" title="Why these packages?">
        The pi-mono ecosystem separates concerns: <code>pi-ai</code> handles LLM communication (streaming,
        provider abstraction), while <code>pi-agent-core</code> manages the agent loop (tool dispatch,
        message history, state). TypeBox provides a TypeScript-first way to define JSON Schema for tool inputs.
      </Callout>

      <h3>High-Level Architecture Diagram</h3>
      <Diagram title="Module Architecture">
        <svg width="580" height="380" viewBox="0 0 580 380" xmlns="http://www.w3.org/2000/svg">
          {/* Background boxes */}
          <rect x="190" y="20" width="200" height="60" rx="10" fill="#6c5ce7" opacity="0.12" stroke="#6c5ce7" strokeWidth="1.5"/>
          <text x="290" y="48" textAnchor="middle" fontSize="13" fontWeight="700" fill="#6c5ce7">main()</text>
          <text x="290" y="66" textAnchor="middle" fontSize="10" fill="#64647a">Entry point &amp; orchestration</text>

          <rect x="30" y="140" width="180" height="60" rx="10" fill="#3b82f6" opacity="0.12" stroke="#3b82f6" strokeWidth="1.5"/>
          <text x="120" y="168" textAnchor="middle" fontSize="13" fontWeight="700" fill="#3b82f6">Agent Lifecycle</text>
          <text x="120" y="186" textAnchor="middle" fontSize="10" fill="#64647a">subscribe / prompt / waitForIdle</text>

          <rect x="240" y="140" width="180" height="60" rx="10" fill="#10b981" opacity="0.12" stroke="#10b981" strokeWidth="1.5"/>
          <text x="330" y="168" textAnchor="middle" fontSize="13" fontWeight="700" fill="#10b981">createSumNumbersTool()</text>
          <text x="330" y="186" textAnchor="middle" fontSize="10" fill="#64647a">AgentTool definition</text>

          <rect x="450" y="140" width="110" height="60" rx="10" fill="#f59e0b" opacity="0.12" stroke="#f59e0b" strokeWidth="1.5"/>
          <text x="505" y="168" textAnchor="middle" fontSize="13" fontWeight="700" fill="#d97706">Utilities</text>
          <text x="505" y="186" textAnchor="middle" fontSize="10" fill="#64647a">Extract / parse</text>

          {/* External deps */}
          <rect x="60" y="280" width="160" height="60" rx="10" fill="#e2e4ea" stroke="#c0c3cc" strokeWidth="1.5"/>
          <text x="140" y="305" textAnchor="middle" fontSize="11" fontWeight="600" fill="#64647a">pi-agent-core</text>
          <text x="140" y="322" textAnchor="middle" fontSize="9" fill="#999">Agent, AgentTool, types</text>

          <rect x="250" y="280" width="160" height="60" rx="10" fill="#e2e4ea" stroke="#c0c3cc" strokeWidth="1.5"/>
          <text x="330" y="305" textAnchor="middle" fontSize="11" fontWeight="600" fill="#64647a">pi-ai</text>
          <text x="330" y="322" textAnchor="middle" fontSize="9" fill="#999">getModel, UserMessage</text>

          <rect x="440" y="280" width="120" height="60" rx="10" fill="#e2e4ea" stroke="#c0c3cc" strokeWidth="1.5"/>
          <text x="500" y="305" textAnchor="middle" fontSize="11" fontWeight="600" fill="#64647a">typebox</text>
          <text x="500" y="322" textAnchor="middle" fontSize="9" fill="#999">Type.Object({})</text>

          {/* Arrows */}
          <line x1="290" y1="80" x2="120" y2="140" stroke="#6c5ce7" strokeWidth="1.5" markerEnd="url(#arrow)"/>
          <line x1="290" y1="80" x2="330" y2="140" stroke="#6c5ce7" strokeWidth="1.5" markerEnd="url(#arrow)"/>
          <line x1="330" y1="200" x2="505" y2="140" stroke="#10b981" strokeWidth="1.5" strokeDasharray="4,3" markerEnd="url(#arrow)"/>
          <line x1="120" y1="200" x2="140" y2="280" stroke="#3b82f6" strokeWidth="1.5" markerEnd="url(#arrow)"/>
          <line x1="330" y1="200" x2="330" y2="280" stroke="#10b981" strokeWidth="1.5" strokeDasharray="4,3" markerEnd="url(#arrow)"/>
          <line x1="505" y1="200" x2="500" y2="280" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4,3" markerEnd="url(#arrow)"/>

          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#999"/>
            </marker>
          </defs>
        </svg>
      </Diagram>

      <h3>File Structure</h3>
      <CodeBlock
        language="text"
        filename="Project layout"
        code={`simple-pi-mono-agent-ts/
├── src/
│   └── index.ts          ← All source code (agent, tool, utilities, main)
├── package.json          ← Dependencies & scripts
├── tsconfig.json         ← TypeScript config (ESM, NodeNext)
├── .env.example          ← Environment variable template
├── .gitignore            ← Excludes node_modules/, dist/, .env
└── README.md             ← Setup & usage documentation`}
      />

      <Callout type="tip" title="Single-file design">
        This project deliberately keeps everything in one file for simplicity and readability.
        In production, you'd extract utilities into <code>src/utils.ts</code>, tools into
        <code>src/tools/</code>, and agent setup into <code>src/agent.ts</code>.
      </Callout>
    </>
  ),
  quiz: [
    {
      question: 'Which package provides the Agent class and tool type definitions?',
      options: [
        '@mariozechner/pi-ai',
        '@mariozechner/pi-agent-core',
        '@sinclair/typebox',
        'typescript',
      ],
      correctIndex: 1,
      explanation: 'The Agent class, AgentTool type, and message types all come from @mariozechner/pi-agent-core. The pi-ai package handles LLM provider abstraction.',
    },
    {
      question: 'What is the purpose of @sinclair/typebox in this project?',
      options: [
        'Runtime type validation of API responses',
        'Defining JSON Schema for tool parameters in a TypeScript-first way',
        'Generating TypeScript declaration files',
        'Polyfilling ES2022 features',
      ],
      correctIndex: 1,
      explanation: 'TypeBox (Type.Object({})) creates JSON Schema objects that describe tool parameter shapes. The agent runtime uses these schemas to validate tool call arguments from the LLM.',
    },
    {
      question: 'Why is the entire source code in a single file (src/index.ts)?',
      options: [
        'It\'s a TypeScript limitation with ESM modules',
        'The project is designed as a minimal reference — separating into modules would be over-engineering',
        'The pi-agent-core package requires a single entry point',
        'It improves build performance',
      ],
      correctIndex: 1,
      explanation: 'This is a minimal demo project. The single-file approach keeps things simple and easy to read. Production agents would split into separate modules for utilities, tools, and agent configuration.',
    },
  ],
}
