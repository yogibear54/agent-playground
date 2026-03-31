import React from 'react'
import CodeBlock from '../components/CodeBlock'
import Diagram from '../components/Diagram'
import Callout from '../components/Callout'
import Quiz from '../components/Quiz'
import type { ChapterData } from '../data/types'

export const chapter6: ChapterData = {
  id: 'end-to-end-data-flow',
  number: 6,
  title: 'End-to-End Data Flow',
  subtitle: 'Tracing a prompt from user input to final response through every layer',
  sourceFiles: ['src/index.ts'],
  render: () => (
    <>
      <h2>End-to-End Data Flow</h2>
      <p className="chapter-subtitle">Following data through the complete agent loop</p>

      <p>
        Let's trace the exact path data takes when you run <code>npm run dev</code> with the demo
        prompt. This chapter connects all the pieces we've studied into one complete picture.
      </p>

      <h3>The Demo Prompt</h3>
      <CodeBlock
        language="typescript"
        filename="src/index.ts"
        code={`const DEMO_PROMPT =
  "I bought items for 12.50, 8, and 3.25 dollars. " +
  "What is the sum of those amounts? Use the tool to sum the numbers in my message.";`}
      />

      <h3>Full Sequence Diagram</h3>
      <Diagram title="Complete Data Flow">
        <svg width="600" height="640" viewBox="0 0 600 640" xmlns="http://www.w3.org/2000/svg">
          {/* Column headers */}
          <rect x="30" y="5" width="100" height="30" rx="5" fill="#6c5ce7" opacity="0.15"/>
          <text x="80" y="25" textAnchor="middle" fontSize="11" fontWeight="700" fill="#6c5ce7">main()</text>

          <rect x="170" y="5" width="100" height="30" rx="5" fill="#3b82f6" opacity="0.15"/>
          <text x="220" y="25" textAnchor="middle" fontSize="11" fontWeight="700" fill="#3b82f6">Agent</text>

          <rect x="310" y="5" width="100" height="30" rx="5" fill="#e2e4ea" stroke="#c0c3cc" strokeWidth="1"/>
          <text x="360" y="25" textAnchor="middle" fontSize="11" fontWeight="700" fill="#64647a">OpenRouter</text>

          <rect x="450" y="5" width="130" height="30" rx="5" fill="#10b981" opacity="0.15"/>
          <text x="515" y="25" textAnchor="middle" fontSize="11" fontWeight="700" fill="#10b981">sum_numbers tool</text>

          {/* Lifelines */}
          <line x1="80" y1="35" x2="80" y2="620" stroke="#ddd" strokeWidth="1" strokeDasharray="4,3"/>
          <line x1="220" y1="35" x2="220" y2="620" stroke="#ddd" strokeWidth="1" strokeDasharray="4,3"/>
          <line x1="360" y1="35" x2="360" y2="620" stroke="#ddd" strokeWidth="1" strokeDasharray="4,3"/>
          <line x1="515" y1="35" x2="515" y2="620" stroke="#ddd" strokeWidth="1" strokeDasharray="4,3"/>

          {/* Step 1: prompt */}
          <line x1="80" y1="60" x2="220" y2="60" stroke="#6c5ce7" strokeWidth="1.5" markerEnd="url(#seq-arrow)"/>
          <text x="150" y="55" textAnchor="middle" fontSize="9" fill="#6c5ce7">1. prompt(DEMO_PROMPT)</text>

          {/* Step 2: Agent → LLM */}
          <line x1="220" y1="85" x2="360" y2="85" stroke="#3b82f6" strokeWidth="1.5" markerEnd="url(#seq-arrow)"/>
          <text x="290" y="80" textAnchor="middle" fontSize="9" fill="#3b82f6">2. messages + tools schema</text>

          {/* Step 3: LLM streams back */}
          <line x1="360" y1="110" x2="220" y2="110" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="5,3" markerEnd="url(#seq-arrow)"/>
          <text x="290" y="105" textAnchor="middle" fontSize="9" fill="#3b82f6">3. text_delta events</text>

          {/* Step 4: subscriber gets text */}
          <line x1="220" y1="135" x2="80" y2="135" stroke="#999" strokeWidth="1" strokeDasharray="3,3" markerEnd="url(#seq-arrow)"/>
          <text x="150" y="130" textAnchor="middle" fontSize="9" fill="#64647a">4. subscriber prints delta</text>

          {/* Step 5: tool call */}
          <line x1="360" y1="165" x2="220" y2="165" stroke="#3b82f6" strokeWidth="1.5" markerEnd="url(#seq-arrow)"/>
          <text x="290" y="160" textAnchor="middle" fontSize="9" fill="#3b82f6">5. tool_call: sum_numbers...</text>

          {/* Step 6: Agent dispatches to tool */}
          <line x1="220" y1="195" x2="515" y2="195" stroke="#10b981" strokeWidth="1.5" markerEnd="url(#seq-arrow)"/>
          <text x="367" y="190" textAnchor="middle" fontSize="9" fill="#10b981">6. execute()</text>

          {/* Step 7: tool reads state */}
          <rect x="435" y="210" width="160" height="80" rx="6" fill="#10b981" opacity="0.08" stroke="#10b981" strokeWidth="1"/>
          <text x="515" y="230" textAnchor="middle" fontSize="9" fill="#10b981">getLastUserMessageText()</text>
          <text x="515" y="248" textAnchor="middle" fontSize="9" fill="#10b981">→ "12.50, 8, and 3.25"</text>
          <text x="515" y="266" textAnchor="middle" fontSize="9" fill="#10b981">extractNumbersFromText()</text>
          <text x="515" y="284" textAnchor="middle" fontSize="9" fill="#10b981">→ [12.5, 8, 3.25] → sum=23.75</text>

          {/* Step 8: tool returns */}
          <line x1="515" y1="305" x2="220" y2="305" stroke="#10b981" strokeWidth="1.5" strokeDasharray="5,3" markerEnd="url(#seq-arrow)"/>
          <text x="367" y="300" textAnchor="middle" fontSize="9" fill="#10b981">{`7. return { content, details }`}</text>

          {/* Step 9: Agent sends tool result to LLM */}
          <line x1="220" y1="335" x2="360" y2="335" stroke="#3b82f6" strokeWidth="1.5" markerEnd="url(#seq-arrow)"/>
          <text x="290" y="330" textAnchor="middle" fontSize="9" fill="#3b82f6">8. tool_result: "Sum = 23.75"</text>

          {/* Step 10: LLM final response */}
          <line x1="360" y1="365" x2="220" y2="365" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="5,3" markerEnd="url(#seq-arrow)"/>
          <text x="290" y="360" textAnchor="middle" fontSize="9" fill="#3b82f6">9. text_delta: "The sum is..."</text>

          {/* Step 11: subscriber prints */}
          <line x1="220" y1="395" x2="80" y2="395" stroke="#999" strokeWidth="1" strokeDasharray="3,3" markerEnd="url(#seq-arrow)"/>
          <text x="150" y="390" textAnchor="middle" fontSize="9" fill="#64647a">10. subscriber prints delta</text>

          {/* Step 12: message_end */}
          <line x1="360" y1="425" x2="220" y2="425" stroke="#3b82f6" strokeWidth="1.5" markerEnd="url(#seq-arrow)"/>
          <text x="290" y="420" textAnchor="middle" fontSize="9" fill="#3b82f6">11. message_end</text>

          {/* Step 13: subscriber logs */}
          <line x1="220" y1="455" x2="80" y2="455" stroke="#999" strokeWidth="1" strokeDasharray="3,3" markerEnd="url(#seq-arrow)"/>
          <text x="150" y="450" textAnchor="middle" fontSize="9" fill="#64647a">12. logs "finished"</text>

          {/* Step 14: waitForIdle resolves */}
          <rect x="150" y="485" width="140" height="30" rx="6" fill="#6c5ce7" opacity="0.12"/>
          <text x="220" y="505" textAnchor="middle" fontSize="10" fontWeight="600" fill="#6c5ce7">waitForIdle() resolves</text>

          {/* Console output */}
          <rect x="30" y="535" width="540" height="90" rx="8" fill="#1e1e2e"/>
          <text x="45" y="555" fontSize="10" fill="#10b981" fontFamily="Source Code Pro, monospace">$ tsx src/index.ts</text>
          <text x="45" y="572" fontSize="10" fill="#f59e0b" fontFamily="Source Code Pro, monospace">[MAIN] Sending demo prompt to agent...</text>
          <text x="45" y="589" fontSize="10" fill="#e2e8f0" fontFamily="Source Code Pro, monospace">[TOOL] Found numbers: [12.5, 8, 3.25]</text>
          <text x="45" y="606" fontSize="10" fill="#e2e8f0" fontFamily="Source Code Pro, monospace">The sum of your amounts is 23.75 dollars.</text>
          <text x="45" y="620" fontSize="10" fill="#6c5ce7" fontFamily="Source Code Pro, monospace">[MAIN] Agent finished. Exiting.</text>

          <defs>
            <marker id="seq-arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#666"/>
            </marker>
          </defs>
        </svg>
      </Diagram>

      <h3>Message State Transitions</h3>
      <p>Here's what the <code>agent.state.messages</code> array looks like at each stage:</p>
      <CodeBlock
        language="typescript"
        filename="Messages array evolution"
        code={`// After agent.prompt(DEMO_PROMPT):
[
  { role: "system", content: "You are a helpful assistant..." },
  { role: "user",   content: "I bought items for 12.50, 8, and 3.25..." },
]

// After LLM responds with tool_call:
[
  { role: "system",    content: "..." },
  { role: "user",      content: "I bought items..." },
  { role: "assistant", content: [], tool_calls: [{ name: "sum_numbers..." }] },
]

// After tool executes and LLM gives final answer:
[
  { role: "system",    content: "..." },
  { role: "user",      content: "I bought items..." },
  { role: "assistant", content: [], tool_calls: [...] },
  { role: "tool",      content: "Found 3 number(s): [12.5, 8, 3.25]. Sum = 23.75." },
  { role: "assistant", content: [{ type: "text", text: "The sum is 23.75 dollars." }] },
]`}
      />

      <Callout type="info" title="Agent state is immutable-ish">
        The agent manages its own message history. Your code reads from <code>agent.state.messages</code>
        (e.g., in the tool's execute handler) but should never mutate it directly. The agent appends
        messages as the conversation progresses.
      </Callout>
    </>
  ),
  quiz: [
    {
      question: 'In the demo, how many LLM API calls does the agent make for a single prompt?',
      options: [
        '1 — the agent batches everything into one call',
        '2 — one to decide to use the tool, one to generate the final answer after the tool result',
        '3 — system setup, tool call, and final answer',
        'It depends on the model',
      ],
      correctIndex: 1,
      explanation: 'The agent makes exactly 2 LLM calls: (1) the initial response where the LLM decides to call the tool, and (2) a follow-up call after the tool result is injected into the conversation, where the LLM generates its final answer.',
    },
    {
      question: 'What does the tool\'s execute() function read from the agent state?',
      options: [
        'agent.state.systemPrompt',
        'agent.state.model',
        'agent.state.messages (specifically the last user message)',
        'agent.state.tools',
      ],
      correctIndex: 2,
      explanation: 'The tool reads agent.state.messages to find the last user message via getLastUserMessageText(). This is why the tool needs the closure pattern — it accesses the agent instance at execution time.',
    },
    {
      question: 'After the tool returns its result, what happens next?',
      options: [
        'The result is printed to the console and the program exits',
        'The agent adds the tool result to the message history and sends the updated conversation back to the LLM',
        'The tool result is sent directly to the subscriber',
        'The agent creates a new prompt with the tool result',
      ],
      correctIndex: 1,
      explanation: 'The agent framework automatically appends the tool result as a tool message to the conversation history, then sends the full updated message array back to the LLM for a follow-up response.',
    },
  ],
}
