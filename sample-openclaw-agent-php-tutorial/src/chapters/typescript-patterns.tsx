import CodeBlock from '../components/CodeBlock';
import Callout from '../components/Callout';
import type { ChapterData } from './types';

export const typeScriptPatternsChapter: ChapterData = {
  id: 'typescript-patterns',
  title: 'TypeScript Patterns in the Reference Port',
  description:
    'Understand the strongly typed patterns in index.ts and how they map to the PHP implementation.',
  files: ['index.ts', 'src/AgentDaemon.php'],
  content: (
    <>
      <h2>Why this chapter matters in a PHP project</h2>
      <p>
        The PHP daemon is intentionally a port of <code>index.ts</code>. The TypeScript file captures design intent with
        explicit types. Reading those patterns helps you reason about the PHP equivalent.
      </p>

      <h3>Pattern 1: intersection type for executable tools</h3>
      <CodeBlock
        filename="index.ts"
        language="ts"
        code={`type ToolWithExecute = Anthropic.Tool & {
  execute: (input: any) => Promise<any>;
};`}
        caption="Tool metadata and runtime behavior are combined in one type-safe contract."
      />

      <p>
        The PHP port mirrors this with associative arrays containing <code>name</code>, <code>input_schema</code>, and an
        <code>execute</code> closure.
      </p>

      <h3>Pattern 2: typed domain records</h3>
      <CodeBlock
        filename="index.ts"
        language="ts"
        code={`interface Thread {
  threadTs: string;
  channel: string;
  messages: Anthropic.MessageParam[];
}

interface Skill {
  name: string;
  description: string;
  location: string;
}`}
      />

      <p>
        In PHP, equivalent shapes are represented with docblocks such as
        <code>array&lt;string, mixed&gt;</code> and <code>array&lt;int, array&lt;string, mixed&gt;&gt;</code>.
      </p>

      <CodeBlock
        filename="src/AgentDaemon.php"
        language="php"
        code={`/** @var array<string, bool> */
private array $activeThreadLoops = [];

/** @var array<string, array<int, array<string, mixed>>> */
private array $pendingUserMessages = [];

/**
 * @param array<int, array<string, mixed>> $messages
 */
private function isConversationAtRest(array $messages): bool { ... }`}
        caption="PHP adopts static-shape hints through typed properties plus phpdoc generics."
      />

      <h3>Pattern 3: runtime narrowing and safe defaults</h3>
      <p>
        <code>index.ts</code> and <code>AgentDaemon.php</code> both aggressively narrow unknown input before using it
        (e.g., checking event type, array shape, and optional fields).
      </p>

      <CodeBlock
        filename="index.ts"
        language="ts"
        code={`const event = payload.payload?.event;
if (!event || event.type !== 'message') return;
if (event.subtype || event.channel_type !== 'im') return;`}
      />

      <CodeBlock
        filename="src/AgentDaemon.php"
        language="php"
        code={`$event = $payload['payload']['event'] ?? null;
if (!is_array($event)) {
    return;
}
if (($event['type'] ?? '') !== 'message') {
    return;
}`}
      />

      <Callout tone="tip" title="Porting heuristic">
        Keep the <strong>state machine semantics</strong> identical even if the language type system changes. The biggest
        wins are preserving behavior boundaries: event filtering, tool dispatch loop, and stop-condition checks.
      </Callout>
    </>
  ),
  quiz: [
    {
      question: 'What does ToolWithExecute model in index.ts?',
      options: [
        'A Slack message payload',
        'An Anthropic tool definition combined with an execute handler',
        'A database repository interface',
        'A build-time TypeScript plugin',
      ],
      correctIndex: 1,
      explanation:
        'It extends Anthropic.Tool with an execute() function so each tool has both schema metadata and runtime logic.',
    },
    {
      question: 'How does the PHP port express nested typed collections?',
      options: [
        'Only with dynamic arrays and no hints',
        'Through phpdoc generics plus typed properties',
        'By importing TypeScript declaration files',
        'Using YAML schema files',
      ],
      correctIndex: 1,
      explanation:
        'AgentDaemon uses phpdoc array generics and typed property declarations to communicate expected structures.',
    },
    {
      question: 'Which shared pattern appears in both TS and PHP implementations?',
      options: [
        'Skipping input validation for performance',
        'Aggressive runtime narrowing before processing events',
        'Ignoring unknown Slack event payload fields',
        'Always assuming tool input is valid',
      ],
      correctIndex: 1,
      explanation:
        'Both implementations guard on event shape/type and default optional values to safe fallbacks.',
    },
  ],
};
