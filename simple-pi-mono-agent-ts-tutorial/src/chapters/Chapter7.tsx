import React from 'react'
import CodeBlock from '../components/CodeBlock'
import Callout from '../components/Callout'
import Quiz from '../components/Quiz'
import type { ChapterData } from '../data/types'

export const chapter7: ChapterData = {
  id: 'typescript-patterns',
  number: 7,
  title: 'TypeScript Patterns',
  subtitle: 'Type guards, generics, const assertions, and closure-based design',
  sourceFiles: ['src/index.ts', 'tsconfig.json'],
  render: () => (
    <>
      <h2>TypeScript Patterns</h2>
      <p className="chapter-subtitle">Advanced TypeScript techniques used throughout the codebase</p>

      <p>
        Despite being a single file, <code>src/index.ts</code> demonstrates several important TypeScript
        patterns that are common in well-typed agent applications. Let's examine each one.
      </p>

      <h3>1. Type Guard Functions</h3>
      <p>
        Type guards narrow a union type at runtime. The project defines two custom type guards
        using the <code>is</code> return type annotation:
      </p>
      <CodeBlock
        language="typescript"
        filename="src/index.ts"
        code={`import { type AgentMessage } from "@mariozechner/pi-agent-core";
import { type UserMessage } from "@mariozechner/pi-ai";

function isUserMessage(m: AgentMessage): m is UserMessage {
  return (m as UserMessage).role === "user";
}

function isAssistantMessage(
  m: AgentMessage,
): m is Extract<AgentMessage, { role: "assistant" }> {
  return (m as { role?: string }).role === "assistant";
}`}
      />
      <p>
        The <code>m is UserMessage</code> return type tells TypeScript: "if this function returns
        <code>true</code>, you can safely treat <code>m</code> as a <code>UserMessage</code>."
        This enables safe property access in the narrowed branch:
      </p>
      <CodeBlock
        language="typescript"
        filename="Type narrowing in action"
        code={`// Without type guard — TypeScript error:
// Property 'content' does not exist on type 'AgentMessage'
if (m.role === "user") {
  console.log(m.content); // ← may still be union-typed
}

// With type guard — fully narrowed:
if (isUserMessage(m)) {
  console.log(m.content); // ← TypeScript knows this is UserMessage["content"]
}`}
      />

      <Callout type="info" title="Extract utility type">
        <code>Extract&lt;AgentMessage, &#123; role: "assistant" &#125;&gt;</code> is a built-in TypeScript
        utility that extracts the member of the <code>AgentMessage</code> union that has
        <code>role: "assistant"</code>. This is more precise than manually casting.
      </Callout>

      <h3>2. Generic Tool Types</h3>
      <CodeBlock
        language="typescript"
        filename="AgentTool generic parameter"
        code={`const emptyParams = Type.Object({});

function createSumNumbersTool(agent: Agent): AgentTool<typeof emptyParams> {
  return {
    name: "sum_numbers_in_last_user_message",
    // ...
    parameters: emptyParams,
    execute: async () => { /* ... */ },
  };
}`}
      />
      <p>
        <code>AgentTool&lt;TSchema&gt;</code> is a generic type parameterized by the TypeBox schema.
        The schema determines the shape of the <code>parameters</code> field and the argument type
        passed to <code>execute()</code>. Using <code>typeof emptyParams</code> connects the schema
        definition to the tool's type signature.
      </p>

      <h3>3. Const Assertions</h3>
      <CodeBlock
        language="typescript"
        filename="Literal types with 'as const'"
        code={`return {
  content: [
    { type: "text" as const, text: "Found 3 number(s)..." },
  ],
  details: { numbers, sum },
};`}
      />
      <p>
        The <code>as const</code> assertion on <code>"text"</code> narrows the type from
        <code>string</code> to the literal <code>"text"</code>. This is required because the
        <code>content</code> array discriminated union uses <code>type: "text"</code> as its
        discriminator — without <code>as const</code>, TypeScript would infer <code>string</code>,
        which doesn't match the expected literal type.
      </p>

      <h3>4. Closure-Based Tool Factory</h3>
      <CodeBlock
        language="typescript"
        filename="Factory pattern"
        code={`// Factory function that creates a tool closing over the agent
function createSumNumbersTool(agent: Agent): AgentTool<typeof emptyParams> {
  return {
    execute: async () => {
      // 'agent' is captured from the enclosing scope
      const text = getLastUserMessageText(agent.state.messages);
      // ...
    },
  };
}

// Usage: pass the agent to its own tool factory
agent.setTools([createSumNumbersTool(agent)]);`}
      />
      <p>
        This pattern solves a circular dependency problem: the <code>Agent</code> needs the tool
        to be fully configured, but the tool needs the <code>Agent</code> to access state. The
        factory function breaks the cycle by creating the tool after the agent exists.
      </p>

      <h3>5. Never-Type Assertion for Model IDs</h3>
      <CodeBlock
        language="typescript"
        filename="Type-safe model selection"
        code={`const openRouterModelId = process.env.OPENROUTER_MODEL?.trim() || "openrouter/auto";

const agent = new Agent({
  initialState: {
    model: getModel("openrouter", openRouterModelId as never),
    // ...
  },
});`}
      />
      <Callout type="warning" title="as never — a pragmatic escape hatch">
        <code>as never</code> is used here because <code>getModel()</code> expects a specific union
        of known model IDs (generated from the provider catalog), but the model ID comes from an
        environment variable (a free-form string). The <code>as never</code> cast bypasses the
        literal type check — it's a conscious trade-off for runtime flexibility.
      </Callout>

      <h3>6. Strict TypeScript Configuration</h3>
      <CodeBlock
        language="json"
        filename="tsconfig.json"
        code={`{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noEmitOnError": true
  }
}`}
      />
      <ul>
        <li><strong><code>strict: true</code></strong> — Enables all strict checks (no implicit any, strict null checks, etc.)</li>
        <li><strong><code>noEmitOnError: true</code></strong> — Prevents emitting JS if there are type errors</li>
        <li><strong><code>NodeNext</code></strong> — Full ESM module resolution with <code>.js</code> extensions in imports</li>
      </ul>

      <h3>Pattern Summary</h3>
      <table>
        <thead>
          <tr><th>Pattern</th><th>Where Used</th><th>Why</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>Type guards (<code>is</code>)</td>
            <td><code>isUserMessage</code>, <code>isAssistantMessage</code></td>
            <td>Safe narrowing of discriminated union types</td>
          </tr>
          <tr>
            <td>Generics</td>
            <td><code>AgentTool&lt;TSchema&gt;</code></td>
            <td>Connect schema definition to tool parameter types</td>
          </tr>
          <tr>
            <td><code>as const</code></td>
            <td>Tool return <code>type: "text"</code></td>
            <td>Satisfy discriminated union literal type requirements</td>
          </tr>
          <tr>
            <td>Closure factory</td>
            <td><code>createSumNumbersTool(agent)</code></td>
            <td>Break circular dependency between Agent and tools</td>
          </tr>
          <tr>
            <td><code>as never</code></td>
            <td>Model ID from env var</td>
            <td>Escape hatch for dynamic values that should be typed as literals</td>
          </tr>
          <tr>
            <td><code>Extract&lt;T, U&gt;</code></td>
            <td>Assistant message type guard</td>
            <td>Precise union member extraction</td>
          </tr>
        </tbody>
      </table>
    </>
  ),
  quiz: [
    {
      question: 'What does the "m is UserMessage" return type annotation do?',
      options: [
        'It casts m to UserMessage unconditionally',
        'It tells TypeScript that if the function returns true, m can be safely treated as UserMessage',
        'It validates the message against the UserMessage schema at runtime',
        'It replaces the need for a runtime check',
      ],
      correctIndex: 1,
      explanation: 'A type guard (using the "is" keyword) is a runtime function that returns a boolean. When true, TypeScript narrows the type in the subsequent code block. It doesn\'t replace the runtime check — it enhances it with compile-time type narrowing.',
    },
    {
      question: 'Why is "as const" used in the tool return value?',
      options: [
        'To make the return value immutable at runtime',
        'To narrow the "type" field from string to the literal "text" for discriminated union matching',
        'To improve performance',
        'To prevent the value from being reassigned',
      ],
      correctIndex: 1,
      explanation: '"text" as const narrows the type from string to the literal "text". The content array uses a discriminated union where the "type" field determines the shape — TypeScript needs the literal type, not just string.',
    },
    {
      question: 'Why does the code use "as never" for the model ID?',
      options: [
        'The model ID is always undefined',
        'It\'s a TypeScript error suppression technique for when a dynamic string is passed to a function expecting a specific literal union type',
        'It makes the code run faster',
        'It tells the bundler to tree-shake the import',
      ],
      correctIndex: 1,
      explanation: 'getModel() expects a specific union of known model IDs (literal types). Since the model ID comes from an environment variable (a free-form string), "as never" bypasses the type check — a pragmatic trade-off for runtime flexibility.',
    },
  ],
}
