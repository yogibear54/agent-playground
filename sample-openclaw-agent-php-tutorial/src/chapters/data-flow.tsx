import CodeBlock from '../components/CodeBlock';
import Callout from '../components/Callout';
import type { ChapterData } from './types';

export const dataFlowChapter: ChapterData = {
  id: 'data-flow',
  title: 'Data Flow: Slack Event to Agent Reply',
  description:
    'Trace the end-to-end path of a user DM through event handling, tool calls, thread persistence, and final Slack output.',
  files: ['src/AgentDaemon.php', 'index.ts', 'README.md'],
  content: (
    <>
      <h2>Flow summary</h2>
      <ol>
        <li>Slack sends an <code>events_api</code> envelope over Socket Mode.</li>
        <li>The daemon ACKs the envelope and validates the message event.</li>
        <li>Authorized user message is converted into a structured pending prompt.</li>
        <li><code>runThreadLoop()</code> loads/saves thread state under <code>~/.picobot/threads</code>.</li>
        <li><code>generateMessages()</code> calls Anthropic with tool schemas.</li>
        <li>Any <code>tool_use</code> blocks are executed and converted into <code>tool_result</code>.</li>
        <li>The loop continues until the last assistant message has no pending tool calls.</li>
      </ol>

      <CodeBlock
        filename="src/AgentDaemon.php"
        language="php"
        code={`private function handleSlackMessageEvent(array $event): void
{
    $threadTs = (string) ($event['thread_ts'] ?? $event['ts'] ?? '');
    $channel = (string) ($event['channel'] ?? '');
    $user = (string) ($event['user'] ?? '');

    if ($user !== $this->slackUserId) {
        $this->postSlackMessage($channel, $threadTs, "I'm sorry, I'm not authorized...");
        return;
    }

    $this->setTypingStatus($channel, $threadTs);
    $this->pendingUserMessages[$threadTs][] = [
        'role' => 'user',
        'content' => "User <@{$user}> sent this message ...",
    ];

    $this->runThreadLoop($threadTs, $channel);
}`}
        caption="Incoming Slack messages are normalized into internal user message blocks and queued by thread timestamp."
      />

      <h3>Tool-call recursion loop</h3>
      <p>
        The model can request tools repeatedly. After each execution, the daemon appends <code>tool_result</code> blocks as
        a user turn and calls Anthropic again. This gives a deterministic cycle: <em>assistant tool request → tool execution → assistant follow-up</em>.
      </p>

      <CodeBlock
        filename="src/AgentDaemon.php"
        language="php"
        code={`$messages[] = ['role' => 'assistant', 'content' => $content];
if ($toolResults !== []) {
    $messages[] = ['role' => 'user', 'content' => $toolResults];
}

private function isConversationAtRest(array $messages): bool
{
    $last = $messages[array_key_last($messages)];
    if (($last['role'] ?? '') !== 'assistant') return false;

    foreach ($last['content'] ?? [] as $block) {
        if (($block['type'] ?? '') === 'tool_use') return false;
    }

    return true;
}`}
      />

      <Callout tone="info" title="Heartbeat flow">
        Every 30 minutes, <code>runHeartbeatTick()</code> finds the latest thread and injects a synthetic user message
        instructing the assistant to check <code>HEARTBEAT.md</code>. This keeps long-lived automation alive even without
        new human DMs.
      </Callout>

      <h3>Where state is kept</h3>
      <ul>
        <li><strong>In-memory:</strong> <code>activeThreadLoops</code> and <code>pendingUserMessages</code></li>
        <li><strong>On disk:</strong> per-thread JSON transcripts in <code>~/.picobot/threads</code></li>
        <li><strong>Prompt context:</strong> workspace files (<code>IDENTITY.md</code>, <code>AGENTS.md</code>, etc.)</li>
      </ul>
    </>
  ),
  diagram: 'data-flow',
  quiz: [
    {
      question: 'What key is used to group pending messages and thread state?',
      options: ['Slack channel ID', 'Thread timestamp (thread_ts)', 'User ID', 'Bot token'],
      correctIndex: 1,
      explanation:
        'pendingUserMessages and active loops are keyed by thread_ts, which maps directly to persisted thread JSON filenames.',
    },
    {
      question: 'When does runThreadLoop() stop iterating?',
      options: [
        'After exactly one Anthropic call',
        'When no thread file exists',
        'When the last assistant message has no tool_use blocks',
        'When execute_bash is called',
      ],
      correctIndex: 2,
      explanation:
        'isConversationAtRest() inspects the last assistant content blocks and exits only when no tool_use requests remain.',
    },
    {
      question: 'Why are tool results wrapped as a user message?',
      options: [
        'Slack requires it',
        'Anthropic requires tool_result blocks to be sent back in conversation history',
        'To bypass authorization checks',
        'To avoid saving threads',
      ],
      correctIndex: 1,
      explanation:
        'The daemon follows Anthropic tool-calling semantics by sending tool_result blocks back as the next user turn.',
    },
  ],
};
