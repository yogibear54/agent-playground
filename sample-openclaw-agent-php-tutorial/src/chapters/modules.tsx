import CodeBlock from '../components/CodeBlock';
import Callout from '../components/Callout';
import type { ChapterData } from './types';

export const modulesChapter: ChapterData = {
  id: 'key-modules',
  title: 'Key Modules and Their Purposes',
  description:
    'Break down the major runtime modules and the responsibilities of the most important methods.',
  files: ['src/AgentDaemon.php', 'bin/agent.php', 'index.ts', 'composer.json'],
  content: (
    <>
      <h2>Module map</h2>
      <p>
        Most behavior lives in <code>src/AgentDaemon.php</code>, but responsibilities are still segmented by method
        clusters. Think of each cluster as a module boundary inside one class.
      </p>

      <table className="content-table">
        <thead>
          <tr>
            <th>Area</th>
            <th>Purpose</th>
            <th>Main methods</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Startup & validation</td>
            <td>Load env vars, validate policy, initialize workspace directories</td>
            <td><code>__construct()</code>, <code>validateEnvironment()</code>, <code>bootstrapWorkspace()</code></td>
          </tr>
          <tr>
            <td>Socket event ingestion</td>
            <td>Open Slack Socket Mode, ack envelopes, route message events</td>
            <td><code>openSocketModeConnection()</code>, <code>handleSocketEnvelope()</code>, <code>handleSlackMessageEvent()</code></td>
          </tr>
          <tr>
            <td>Conversation engine</td>
            <td>Maintain thread loop, detect rest condition, generate assistant turns</td>
            <td><code>runThreadLoop()</code>, <code>isConversationAtRest()</code>, <code>generateMessages()</code></td>
          </tr>
          <tr>
            <td>Tool runtime</td>
            <td>Expose tool contracts and execute them safely</td>
            <td><code>createTools()</code>, <code>assertSafeCommand()</code>, <code>resolveWorkspacePath()</code></td>
          </tr>
          <tr>
            <td>Persistence + heartbeat</td>
            <td>Store thread history and periodic workspace follow-up checks</td>
            <td><code>saveThread()</code>, <code>loadThread()</code>, <code>runHeartbeatTick()</code></td>
          </tr>
        </tbody>
      </table>

      <h3>Tool module details</h3>
      <p>
        The daemon defines tools as data objects with JSON schema + execute closures. This mirrors the TypeScript version's
        <code>ToolWithExecute</code> pattern.
      </p>

      <CodeBlock
        filename="src/AgentDaemon.php"
        language="php"
        code={`private function createTools(string $channel, string $threadTs): array
{
    return [
        [
            'name' => 'send_slack_message',
            'input_schema' => [...],
            'execute' => function (array $input) use ($channel, $threadTs): string {
                $this->postSlackMessage($channel, $threadTs, (string) $input['text']);
                return 'Message sent.';
            },
        ],
        [
            'name' => 'execute_bash',
            'input_schema' => [...],
            'execute' => function (array $input): string {
                $command = trim((string) ($input['command'] ?? ''));
                $this->assertSafeCommand($command);
                return $this->runCommandWithTimeout($command, 120);
            },
        ],
    ];
}`}
      />

      <h3>Dependency-level module boundaries</h3>
      <p>
        <code>composer.json</code> declares the external collaborators that form clear boundary points:
      </p>
      <ul>
        <li><code>guzzlehttp/guzzle</code> for Anthropic + Slack HTTP requests</li>
        <li><code>textalk/websocket</code> for Socket Mode event stream</li>
        <li><code>symfony/yaml</code> for skill frontmatter parsing</li>
      </ul>

      <Callout tone="warning" title="Monolithic file, modular intent">
        Even though functionality is in a single class file, method-level boundaries are intentional. If you later split
        the class, the easiest seams are: Slack adapter, Anthropic adapter, tool execution service, and thread repository.
      </Callout>
    </>
  ),
  quiz: [
    {
      question: 'Which method cluster is responsible for safe tool execution?',
      options: [
        'loadThread() + saveThread()',
        'handleSocketEnvelope() + postSlackMessage()',
        'createTools() + assertSafeCommand() + resolveWorkspacePath()',
        'validateEnvironment() + bootstrapWorkspace()',
      ],
      correctIndex: 2,
      explanation:
        'Those methods define tool contracts, enforce workspace path boundaries, and restrict dangerous shell operators.',
    },
    {
      question: 'What dependency powers Socket Mode communication?',
      options: ['symfony/yaml', 'textalk/websocket', 'psr/log', 'composer-runtime-api'],
      correctIndex: 1,
      explanation:
        'textalk/websocket is used by openSocketModeConnection() to receive Slack envelopes.',
    },
    {
      question: 'How are tool handlers represented in AgentDaemon?',
      options: [
        'As static class methods only',
        'As array entries containing name/schema plus execute closures',
        'As YAML definitions loaded at runtime only',
        'As Slack slash commands',
      ],
      correctIndex: 1,
      explanation:
        'createTools() returns arrays where each tool has metadata and an execute closure invoked for tool_use blocks.',
    },
  ],
};
