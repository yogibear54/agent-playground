import React from 'react'
import CodeBlock from '../components/CodeBlock'
import Diagram from '../components/Diagram'
import Callout from '../components/Callout'
import Quiz from '../components/Quiz'
import type { ChapterData } from '../data/types'

export const chapter4: ChapterData = {
  id: 'agent-tool-definition',
  number: 4,
  title: 'Agent Tool Definition',
  subtitle: 'Defining and registering the sum_numbers_in_last_user_message tool',
  sourceFiles: ['src/index.ts'],
  render: () => (
    <>
      <h2>Agent Tool Definition</h2>
      <p className="chapter-subtitle">How tools are defined, parameterized, and connected to the agent</p>

      <p>
        The heart of this project is the <strong>tool</strong> — a self-contained unit that the LLM can
        invoke during a conversation. In the pi-agent-core framework, tools implement the
        <code>AgentTool</code> interface and are registered via <code>agent.setTools()</code>.
      </p>

      <h3>The AgentTool Interface</h3>
      <p>
        Every tool in the pi-agent-core framework requires four things:
      </p>
      <table>
        <thead>
          <tr><th>Field</th><th>Type</th><th>Purpose</th></tr>
        </thead>
        <tbody>
          <tr>
            <td><code>name</code></td>
            <td><code>string</code></td>
            <td>Unique identifier the LLM uses to call this tool</td>
          </tr>
          <tr>
            <td><code>label</code></td>
            <td><code>string</code></td>
            <td>Human-readable display name</td>
          </tr>
          <tr>
            <td><code>description</code></td>
            <td><code>string</code></td>
            <td>Tells the LLM <em>when</em> and <em>how</em> to use the tool</td>
          </tr>
          <tr>
            <td><code>parameters</code></td>
            <td><code>TypeBox schema</code></td>
            <td>JSON Schema describing the tool's input shape</td>
          </tr>
          <tr>
            <td><code>execute</code></td>
            <td><code>(params) =&gt; Promise&lt;result&gt;</code></td>
            <td>The actual function that runs when the LLM calls the tool</td>
          </tr>
        </tbody>
      </table>

      <h3>Parameter Schema with TypeBox</h3>
      <CodeBlock
        language="typescript"
        filename="src/index.ts"
        code={`import { Type } from "@sinclair/typebox";

const emptyParams = Type.Object({});`}
      />
      <p>
        This tool takes <strong>no parameters</strong> — its behavior is entirely determined by the
        conversation state (it reads the last user message from <code>agent.state.messages</code>).
        <code>Type.Object({})</code> creates a JSON Schema that validates an empty object.
      </p>

      <Callout type="info" title="Why use Type.Object({}) for no parameters?">
        The pi-agent-core framework uses the JSON Schema to communicate the tool's parameter shape to
        the LLM. Even when there are no parameters, a valid schema is required so the framework can
        properly describe the tool in the API call.
      </Callout>

      <h3>The Closure Pattern</h3>
      <CodeBlock
        language="typescript"
        filename="src/index.ts"
        code={`function createSumNumbersTool(agent: Agent): AgentTool<typeof emptyParams> {
\treturn {
\t\tname: "sum_numbers_in_last_user_message",
\t\tlabel: "Sum numbers in last user message",
\t\tdescription:
\t\t\t"Sums every numeric literal in the most recent user message in the conversation. " +
\t\t\t"Call this when the user asks for a sum of numbers they wrote.",
\t\tparameters: emptyParams,
\t\texecute: async () => {
\t\t\t// ... reads agent.state.messages ...
\t\t\treturn {
\t\t\t\tcontent: [{ type: "text" as const, text: \`Found \${numbers.length} number(s): ...\` }],
\t\t\t\tdetails: { numbers, sum },
\t\t\t};
\t\t},
\t};
}`}
      />

      <Callout type="tip" title="Why a factory function instead of a plain object?">
        The tool's <code>execute</code> handler needs access to <code>agent.state.messages</code>
        to find the last user message. By wrapping it in <code>createSumNumbersTool(agent)</code>,
        the tool <strong>closes over</strong> the agent instance. This avoids circular dependency
        issues — the <code>Agent</code> constructor can't reference a tool that references the
        <code>Agent</code> before it exists.
      </Callout>

      <h3>Tool Return Shape</h3>
      <p>The <code>execute</code> function returns an object with two fields:</p>
      <CodeBlock
        language="typescript"
        filename="Tool return type"
        code={`return {
  content: [
    { type: "text" as const, text: "Found 3 number(s): [12.5, 8, 3.25]. Sum = 23.75." },
  ],
  details: { numbers: [12.5, 8, 3.25], sum: 23.75 },
};`}
      />
      <ul>
        <li><strong><code>content</code></strong> — Array of content parts sent back to the LLM as the tool result. The model uses this to formulate its response.</li>
        <li><strong><code>details</code></strong> — Optional structured data for debugging/logging. Not sent to the model.</li>
      </ul>

      <h3>Registration: Why setTools() After Construction?</h3>
      <CodeBlock
        language="typescript"
        filename="src/index.ts"
        code={`// Step 1: Create agent with empty tools array
const agent = new Agent({
  initialState: {
    systemPrompt: "You are a helpful assistant...",
    model: getModel("openrouter", openRouterModelId as never),
    tools: [],
  },
});

// Step 2: Register tools AFTER construction (closure has agent reference)
agent.setTools([createSumNumbersTool(agent)]);`}
      />

      <Diagram title="Two-Phase Tool Registration">
        <svg width="500" height="200" viewBox="0 0 500 200" xmlns="http://www.w3.org/2000/svg">
          {/* Phase 1 */}
          <rect x="20" y="40" width="200" height="120" rx="10" fill="#6c5ce7" opacity="0.08" stroke="#6c5ce7" strokeWidth="1.5" strokeDasharray="6,3"/>
          <text x="120" y="65" textAnchor="middle" fontSize="12" fontWeight="700" fill="#6c5ce7">Phase 1: Construct</text>
          <rect x="40" y="80" width="160" height="30" rx="6" fill="#6c5ce7" opacity="0.15"/>
          <text x="120" y="100" textAnchor="middle" fontSize="10" fontWeight="600" fill="#6c5ce7">{`new Agent({ tools: [] })`}</text>
          <text x="120" y="145" textAnchor="middle" fontSize="9" fill="#64647a">Agent instance now exists</text>

          {/* Arrow */}
          <line x1="220" y1="100" x2="270" y2="100" stroke="#999" strokeWidth="2" markerEnd="url(#arrow4)"/>
          <text x="245" y="92" textAnchor="middle" fontSize="9" fill="#999">then</text>

          {/* Phase 2 */}
          <rect x="270" y="40" width="210" height="120" rx="10" fill="#10b981" opacity="0.08" stroke="#10b981" strokeWidth="1.5"/>
          <text x="375" y="65" textAnchor="middle" fontSize="12" fontWeight="700" fill="#10b981">Phase 2: Register</text>
          <rect x="285" y="80" width="180" height="30" rx="6" fill="#10b981" opacity="0.15"/>
          <text x="375" y="100" textAnchor="middle" fontSize="10" fontWeight="600" fill="#10b981">agent.setTools([tool(agent)])</text>
          <text x="375" y="145" textAnchor="middle" fontSize="9" fill="#64647a">Tool closes over agent ↩</text>

          <defs>
            <marker id="arrow4" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#999"/>
            </marker>
          </defs>
        </svg>
      </Diagram>
    </>
  ),
  quiz: [
    {
      question: 'Why does createSumNumbersTool take the agent as a parameter?',
      options: [
        'The Agent class requires it',
        'So the tool can close over the agent instance and read agent.state.messages at execution time',
        'To register the tool automatically',
        'To pass the model configuration to the tool',
      ],
      correctIndex: 1,
      explanation: 'The factory function creates a closure. The returned tool object captures the agent reference so its execute() handler can read agent.state.messages when the LLM calls it.',
    },
    {
      question: 'What does Type.Object({}) create?',
      options: [
        'An empty TypeScript interface',
        'A JSON Schema that validates an empty object (no properties)',
        'A runtime type error',
        'A TypeScript compile error',
      ],
      correctIndex: 1,
      explanation: 'Type.Object({}) generates a JSON Schema { "type": "object", "properties": {} } which validates that the input is an object with no required properties — perfect for a tool that takes no arguments.',
    },
    {
      question: 'What is the difference between the content and details fields in the tool return value?',
      options: [
        'content is for errors, details is for success data',
        'content is sent to the LLM as the tool result; details is optional structured data for debugging',
        'They are the same thing',
        'content is a string, details is an array',
      ],
      correctIndex: 1,
      explanation: 'The content array is sent back to the LLM so it can incorporate the result in its response. The details object is for developer use — logging, debugging, or further processing — and is not sent to the model.',
    },
  ],
}
