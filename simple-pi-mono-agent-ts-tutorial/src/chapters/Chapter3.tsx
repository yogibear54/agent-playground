import React from 'react'
import CodeBlock from '../components/CodeBlock'
import Diagram from '../components/Diagram'
import Callout from '../components/Callout'
import Quiz from '../components/Quiz'
import type { ChapterData } from '../data/types'

export const chapter3: ChapterData = {
  id: 'number-extraction-utilities',
  number: 3,
  title: 'Number Extraction Utilities',
  subtitle: 'Pure functions for parsing numbers and user messages',
  sourceFiles: ['src/index.ts'],
  render: () => (
    <>
      <h2>Number Extraction Utilities</h2>
      <p className="chapter-subtitle">The pure function layer that powers the agent's tool</p>

      <p>
        Before the tool can sum numbers, it needs to extract them from raw text. The project defines
        three pure utility functions that handle this task. These functions are <strong>side-effect free</strong>
        and independently testable — a key principle of clean code design.
      </p>

      <h3>Regex-Based Number Extraction</h3>
      <CodeBlock
        language="typescript"
        filename="src/index.ts (lines 7–16)"
        code={`/** Matches integer and decimal literals (e.g. -3, 42, 1.5). */
const NUMBER_PATTERN = /-?\\d+(?:\\.\\d+)?/g;

export function extractNumbersFromText(text: string): number[] {
\tconst out: number[] = [];
\tfor (const m of text.matchAll(NUMBER_PATTERN)) {
\t\tconst n = Number.parseFloat(m[0]);
\t\tif (Number.isFinite(n)) out.push(n);
\t}
\treturn out;
}`}
      />
      <p>
        The regex <code>/-?\d+(?:\.\d+)?/g</code> captures:
      </p>
      <ul>
        <li><strong><code>-?</code></strong> — Optional negative sign</li>
        <li><strong><code>\d+</code></strong> — One or more digits</li>
        <li><strong><code>(?:\.\d+)?</code></strong> — Optional decimal part (non-capturing group)</li>
        <li><strong><code>/g</code></strong> — Global flag to find all matches</li>
      </ul>

      <Callout type="info" title="Why matchAll instead of match?">
        <code>String.prototype.matchAll()</code> returns an iterator of all matches (including overlapping
        capture groups), whereas <code>match()</code> with the <code>/g</code> flag returns an array of
        matched strings without capture group details. Using <code>matchAll</code> is cleaner for
        iteration patterns.
      </Callout>

      <Callout type="warning" title="Finite check">
        <code>Number.isFinite(n)</code> guards against <code>NaN</code> and <code>Infinity</code>.
        This is necessary because <code>parseFloat("...")</code> can return <code>NaN</code> for
        edge cases, even though the regex should prevent this.
      </Callout>

      <h3>User Message Stringification</h3>
      <p>
        User messages in the pi-ai format can have <code>content</code> as either a plain string or an
        array of content parts. The <code>stringifyUserContent</code> function normalizes this:
      </p>
      <CodeBlock
        language="typescript"
        filename="src/index.ts (lines 22–33)"
        code={`function isUserMessage(m: AgentMessage): m is UserMessage {
\treturn (m as UserMessage).role === "user";
}

export function stringifyUserContent(msg: UserMessage): string {
\tconst c = msg.content;
\tif (typeof c === "string") return c;
\treturn c
\t\t.map((part) => {
\t\t\tif (part.type === "text") return part.text;
\t\t\treturn "";
\t\t})
\t\t.join("");
}`}
      />
      <p>
        The function handles two content shapes:
      </p>
      <table>
        <thead>
          <tr><th>Content Type</th><th>Example</th><th>Handling</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>String</td>
            <td><code>"Hello, world!"</code></td>
            <td>Returned directly</td>
          </tr>
          <tr>
            <td>Array of parts</td>
            <td><code>{`[{ type: "text", text: "Hi" }, { type: "image", ... }]`}</code></td>
            <td>Concatenate only <code>text</code> parts</td>
          </tr>
        </tbody>
      </table>

      <h3>Finding the Last User Message</h3>
      <CodeBlock
        language="typescript"
        filename="src/index.ts (lines 35–42)"
        code={`export function getLastUserMessageText(messages: AgentMessage[]): string | null {
\tfor (let i = messages.length - 1; i >= 0; i--) {
\t\tconst m = messages[i];
\t\tif (isUserMessage(m)) return stringifyUserContent(m);
\t}
\treturn null;
}`}
      />
      <p>
        This function walks the message array <strong>backwards</strong> from the most recent message
        to find the last one with <code>role === "user"</code>. This is important because the agent's
        conversation history contains interleaved user, assistant, and tool messages — we want the
        <em>latest</em> user message specifically.
      </p>

      <h3>Utility Function Flow</h3>
      <Diagram title="How utilities transform raw messages into numbers">
        <svg width="520" height="180" viewBox="0 0 520 180" xmlns="http://www.w3.org/2000/svg">
          {/* Step 1 */}
          <rect x="10" y="50" width="120" height="60" rx="8" fill="#6c5ce7" opacity="0.12" stroke="#6c5ce7" strokeWidth="1.5"/>
          <text x="70" y="75" textAnchor="middle" fontSize="11" fontWeight="600" fill="#6c5ce7">AgentMessage[]</text>
          <text x="70" y="93" textAnchor="middle" fontSize="9" fill="#64647a">Full conversation</text>

          {/* Arrow */}
          <line x1="130" y1="80" x2="165" y2="80" stroke="#999" strokeWidth="1.5" markerEnd="url(#arrow3)"/>
          <text x="147" y="72" textAnchor="middle" fontSize="8" fill="#6c5ce7" fontWeight="600">getLast</text>

          {/* Step 2 */}
          <rect x="165" y="50" width="120" height="60" rx="8" fill="#3b82f6" opacity="0.12" stroke="#3b82f6" strokeWidth="1.5"/>
          <text x="225" y="75" textAnchor="middle" fontSize="11" fontWeight="600" fill="#3b82f6">string | null</text>
          <text x="225" y="93" textAnchor="middle" fontSize="9" fill="#64647a">stringifyContent()</text>

          {/* Arrow */}
          <line x1="285" y1="80" x2="320" y2="80" stroke="#999" strokeWidth="1.5" markerEnd="url(#arrow3)"/>
          <text x="302" y="72" textAnchor="middle" fontSize="8" fill="#3b82f6" fontWeight="600">extract</text>

          {/* Step 3 */}
          <rect x="320" y="50" width="80" height="60" rx="8" fill="#10b981" opacity="0.12" stroke="#10b981" strokeWidth="1.5"/>
          <text x="360" y="75" textAnchor="middle" fontSize="11" fontWeight="600" fill="#10b981">number[]</text>
          <text x="360" y="93" textAnchor="middle" fontSize="9" fill="#64647a">regex parse</text>

          {/* Arrow */}
          <line x1="400" y1="80" x2="435" y2="80" stroke="#999" strokeWidth="1.5" markerEnd="url(#arrow3)"/>
          <text x="417" y="72" textAnchor="middle" fontSize="8" fill="#10b981" fontWeight="600">reduce</text>

          {/* Step 4 */}
          <rect x="435" y="50" width="70" height="60" rx="8" fill="#f59e0b" opacity="0.12" stroke="#f59e0b" strokeWidth="1.5"/>
          <text x="470" y="75" textAnchor="middle" fontSize="11" fontWeight="600" fill="#d97706">sum</text>
          <text x="470" y="93" textAnchor="middle" fontSize="9" fill="#64647a">a + b</text>

          {/* Example row */}
          <text x="70" y="140" textAnchor="middle" fontSize="9" fill="#999">[sys, user, asst, user, ...]</text>
          <text x="225" y="140" textAnchor="middle" fontSize="9" fill="#999">"12.50, 8, and 3.25"</text>
          <text x="360" y="140" textAnchor="middle" fontSize="9" fill="#999">[12.5, 8, 3.25]</text>
          <text x="470" y="140" textAnchor="middle" fontSize="9" fill="#999">23.75</text>

          <defs>
            <marker id="arrow3" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#999"/>
            </marker>
          </defs>
        </svg>
      </Diagram>
    </>
  ),
  quiz: [
    {
      question: 'What does the NUMBER_PATTERN regex /-?\\d+(?:\\.\\d+)?/g NOT match?',
      options: [
        '-3',
        '42',
        '1.5',
        '1e10 (scientific notation)',
      ],
      correctIndex: 3,
      explanation: 'The regex handles negative signs, integers, and decimals but does not support scientific notation (e.g., 1e10). The (?:\\.\\d+)? group only handles decimal points.',
    },
    {
      question: 'Why does getLastUserMessageText iterate backwards through the messages array?',
      options: [
        'Forward iteration is slower',
        'To find the most recent (last) user message, not the first one',
        'The array is sorted in reverse chronological order',
        'It needs to skip the first system message',
      ],
      correctIndex: 1,
      explanation: 'The function starts from the end of the array and walks backwards to find the last (most recent) message with role === "user". A conversation may have many user messages; the tool should operate on the latest one.',
    },
    {
      question: 'Why does stringifyUserContent handle both string and array content types?',
      options: [
        'TypeScript requires exhaustive type checking',
        'The pi-ai UserMessage type allows content to be either a string or an array of content parts',
        'It\'s a performance optimization',
        'It handles backwards compatibility with older API versions',
      ],
      correctIndex: 1,
      explanation: 'In the pi-ai type system, UserMessage.content can be a plain string or an array of typed parts (text, image, etc.). The function normalizes both formats into a plain string for number extraction.',
    },
  ],
}
