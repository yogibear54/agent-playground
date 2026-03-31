import React from 'react'
import CodeBlock from '../components/CodeBlock'
import Diagram from '../components/Diagram'
import Callout from '../components/Callout'
import Quiz from '../components/Quiz'
import type { ChapterData } from '../data/types'

export const chapter5: ChapterData = {
  id: 'agent-lifecycle-events',
  number: 5,
  title: 'Agent Lifecycle & Events',
  subtitle: 'subscribe(), prompt(), and waitForIdle() — the agent runtime loop',
  sourceFiles: ['src/index.ts'],
  render: () => (
    <>
      <h2>Agent Lifecycle & Events</h2>
      <p className="chapter-subtitle">How the agent processes prompts and emits real-time events</p>

      <p>
        The pi-agent-core <code>Agent</code> class manages the entire lifecycle of an AI conversation.
        It provides a reactive event system that lets you observe and respond to streaming LLM output,
        tool calls, and message completions in real time.
      </p>

      <h3>The Three-Phase Lifecycle</h3>
      <table>
        <thead>
          <tr><th>Phase</th><th>Method</th><th>Purpose</th></tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Listen</strong></td>
            <td><code>agent.subscribe(callback)</code></td>
            <td>Register an event listener before prompting</td>
          </tr>
          <tr>
            <td><strong>Prompt</strong></td>
            <td><code>agent.prompt(text)</code></td>
            <td>Send a user message and trigger the LLM loop</td>
          </tr>
          <tr>
            <td><strong>Wait</strong></td>
            <td><code>agent.waitForIdle()</code></td>
            <td>Block until the agent finishes all processing</td>
          </tr>
        </tbody>
      </table>

      <h3>Subscribing to Events</h3>
      <CodeBlock
        language="typescript"
        filename="src/index.ts"
        code={`let sawTextDelta = false;

agent.subscribe((event) => {
  if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
    sawTextDelta = true;
    process.stdout.write(event.assistantMessageEvent.delta);
  }
  if (event.type === "message_end" && isAssistantMessage(event.message)) {
    const text = getAssistantText(event.message);
    if (!sawTextDelta && text) process.stdout.write(\`\${text}\\n\`);
    if (event.message.stopReason === "error" && event.message.errorMessage) {
      console.error(\`Model error: \${event.message.errorMessage}\`);
    }
    console.log("[EVENT] message_end - Assistant finished responding");
  }
});`}
      />

      <Callout type="tip" title="Streaming vs batch output">
        The subscribe callback handles two scenarios:
        <br /><br />
        <strong>Streaming:</strong> If the provider sends <code>text_delta</code> events, each chunk is
        printed immediately via <code>process.stdout.write()</code> — no newlines, so the output
        appears to "type out" like ChatGPT.
        <br /><br />
        <strong>Batch fallback:</strong> If no <code>text_delta</code> events were received (some
        providers/models don't stream), the full text is printed once on <code>message_end</code>.
      </Callout>

      <h3>Event Types</h3>
      <p>The agent emits several event types during a conversation turn:</p>
      <CodeBlock
        language="typescript"
        filename="Event types (conceptual)"
        code={`// Event flow during a single prompt:

// 1. LLM starts responding
{ type: "message_update", assistantMessageEvent: { type: "text_delta", delta: "I'll" } }
{ type: "message_update", assistantMessageEvent: { type: "text_delta", delta: " sum" } }
// ... more deltas ...

// 2. LLM requests a tool call
{ type: "message_update", assistantMessageEvent: { type: "tool_call", ... } }

// 3. Tool executes and returns
// (internal - tool result added to messages)

// 4. LLM continues with final answer
{ type: "message_update", assistantMessageEvent: { type: "text_delta", delta: "The sum is 23.75." } }

// 5. LLM finishes
{ type: "message_end", message: { role: "assistant", content: [...], stopReason: "end_turn" } }`}
      />

      <h3>Sending the Prompt</h3>
      <CodeBlock
        language="typescript"
        filename="src/index.ts"
        code={`const DEMO_PROMPT =
  "I bought items for 12.50, 8, and 3.25 dollars. " +
  "What is the sum of those amounts? Use the tool to sum the numbers in my message.";

console.log("[MAIN] Sending demo prompt to agent...\\n");
await agent.prompt(DEMO_PROMPT);
process.stdout.write("\\n");
console.log("[MAIN] Waiting for agent to finish...");

await agent.waitForIdle();
console.log("[MAIN] Agent finished. Exiting.");`}
      />

      <Callout type="info" title="prompt() vs waitForIdle()">
        <code>agent.prompt()</code> is async but returns before the agent finishes — it enqueues the
        user message and starts the LLM loop. <code>agent.waitForIdle()</code> returns a Promise that
        resolves only when all processing is complete, including tool calls and follow-up LLM turns.
      </Callout>

      <h3>Complete Lifecycle Diagram</h3>
      <Diagram title="Agent Lifecycle: Subscribe → Prompt → Wait">
        <svg width="560" height="420" viewBox="0 0 560 420" xmlns="http://www.w3.org/2000/svg">
          {/* Subscribe */}
          <rect x="180" y="10" width="200" height="40" rx="8" fill="#6c5ce7" opacity="0.15" stroke="#6c5ce7" strokeWidth="1.5"/>
          <text x="280" y="35" textAnchor="middle" fontSize="12" fontWeight="600" fill="#6c5ce7">agent.subscribe(cb)</text>

          <line x1="280" y1="50" x2="280" y2="70" stroke="#999" strokeWidth="1.5" markerEnd="url(#arrow5)"/>

          {/* Prompt */}
          <rect x="180" y="70" width="200" height="40" rx="8" fill="#3b82f6" opacity="0.15" stroke="#3b82f6" strokeWidth="1.5"/>
          <text x="280" y="95" textAnchor="middle" fontSize="12" fontWeight="600" fill="#3b82f6">agent.prompt(text)</text>

          <line x1="280" y1="110" x2="280" y2="130" stroke="#999" strokeWidth="1.5" markerEnd="url(#arrow5)"/>

          {/* LLM call */}
          <rect x="140" y="130" width="280" height="40" rx="8" fill="#e2e4ea" stroke="#c0c3cc" strokeWidth="1.5"/>
          <text x="280" y="155" textAnchor="middle" fontSize="12" fontWeight="600" fill="#64647a">LLM processes → streams text_delta events</text>

          <line x1="280" y1="170" x2="280" y2="190" stroke="#999" strokeWidth="1.5" markerEnd="url(#arrow5)"/>

          {/* Tool call decision */}
          <polygon points="280,190 360,220 280,250 200,220" fill="#f59e0b" opacity="0.15" stroke="#f59e0b" strokeWidth="1.5"/>
          <text x="280" y="224" textAnchor="middle" fontSize="11" fontWeight="600" fill="#d97706">Tool call?</text>

          {/* Yes branch */}
          <line x1="200" y1="220" x2="100" y2="220" stroke="#999" strokeWidth="1.5" markerEnd="url(#arrow5)"/>
          <text x="150" y="212" textAnchor="middle" fontSize="10" fill="#10b981">Yes</text>

          <rect x="10" y="200" width="90" height="40" rx="8" fill="#10b981" opacity="0.15" stroke="#10b981" strokeWidth="1.5"/>
          <text x="55" y="225" textAnchor="middle" fontSize="11" fontWeight="600" fill="#10b981">execute()</text>

          <line x1="55" y1="240" x2="55" y2="280" stroke="#999" strokeWidth="1.5" markerEnd="url(#arrow5)"/>
          <line x1="55" y1="280" x2="140" y2="280" stroke="#999" strokeWidth="1.5" markerEnd="url(#arrow5)"/>

          <rect x="140" y="260" width="280" height="40" rx="8" fill="#e2e4ea" stroke="#c0c3cc" strokeWidth="1.5"/>
          <text x="280" y="285" textAnchor="middle" fontSize="12" fontWeight="600" fill="#64647a">LLM continues with tool result</text>

          {/* No branch */}
          <line x1="280" y1="250" x2="280" y2="280" stroke="#999" strokeWidth="1.5" markerEnd="url(#arrow5)"/>
          <text x="295" y="268" textAnchor="start" fontSize="10" fill="#999">No</text>

          <line x1="280" y1="300" x2="280" y2="320" stroke="#999" strokeWidth="1.5" markerEnd="url(#arrow5)"/>

          {/* message_end */}
          <rect x="160" y="320" width="240" height="40" rx="8" fill="#ef4444" opacity="0.12" stroke="#ef4444" strokeWidth="1.5"/>
          <text x="280" y="345" textAnchor="middle" fontSize="12" fontWeight="600" fill="#dc2626">message_end event</text>

          <line x1="280" y1="360" x2="280" y2="380" stroke="#999" strokeWidth="1.5" markerEnd="url(#arrow5)"/>

          {/* waitForIdle resolves */}
          <rect x="160" y="380" width="240" height="30" rx="8" fill="#6c5ce7" opacity="0.15" stroke="#6c5ce7" strokeWidth="1.5"/>
          <text x="280" y="400" textAnchor="middle" fontSize="12" fontWeight="600" fill="#6c5ce7">waitForIdle() resolves</text>

          <defs>
            <marker id="arrow5" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#999"/>
            </marker>
          </defs>
        </svg>
      </Diagram>
    </>
  ),
  quiz: [
    {
      question: 'What is the correct order of the three agent lifecycle phases?',
      options: [
        'prompt() → subscribe() → waitForIdle()',
        'waitForIdle() → prompt() → subscribe()',
        'subscribe() → prompt() → waitForIdle()',
        'subscribe() → waitForIdle() → prompt()',
      ],
      correctIndex: 2,
      explanation: 'You must subscribe first (to receive events), then send the prompt, and finally wait for the agent to become idle. If you subscribe after prompting, you may miss early events.',
    },
    {
      question: 'Why does the code check both text_delta events and message_end for printing assistant text?',
      options: [
        'It\'s redundant — only one is needed',
        'Some providers don\'t stream text_delta events, so the code falls back to printing the full text on message_end',
        'The message_end event is unreliable',
        'text_delta only contains partial text',
      ],
      correctIndex: 1,
      explanation: 'The sawTextDelta flag tracks whether any streaming chunks were received. If the provider doesn\'t support streaming, the full response is printed once on message_end as a fallback.',
    },
    {
      question: 'When does waitForIdle() resolve?',
      options: [
        'Immediately after prompt() returns',
        'When the first text_delta event is received',
        'When the agent has finished all processing, including tool calls and follow-up turns',
        'When an error occurs',
      ],
      correctIndex: 2,
      explanation: 'waitForIdle() blocks until the agent\'s internal loop completes — which may involve multiple LLM calls (initial response → tool call → tool result → follow-up response). It resolves only when everything is done.',
    },
  ],
}
