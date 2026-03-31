import CodeBlock from '../components/CodeBlock';
import Callout from '../components/Callout';
import type { ChapterData } from './types';

export const entryConfigChapter: ChapterData = {
  id: 'entry-points-config',
  title: 'Entry Points and Configuration',
  description:
    'Learn how the daemon is started, what must be configured, and which runtime policies affect behavior.',
  files: ['bin/agent.php', 'composer.json', '.env.example', 'README.md', 'src/AgentDaemon.php'],
  content: (
    <>
      <h2>Execution entry points</h2>
      <p>There are two equivalent ways to start the daemon.</p>

      <CodeBlock
        filename="composer.json"
        language="json"
        code={`{
  "scripts": {
    "agent": "php bin/agent.php"
  }
}`}
      />

      <CodeBlock
        filename="CLI"
        language="bash"
        code={`php bin/agent.php
# or
composer run agent`}
      />

      <h3>Required environment variables</h3>
      <CodeBlock
        filename=".env.example"
        language="bash"
        code={`SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_APP_TOKEN=xapp-your-app-token
SLACK_USER_ID=U0123456789
ANTHROPIC_API_KEY=sk-ant-api03-your-key

# Optional: strict (default) or relaxed
EXECUTE_BASH_POLICY=strict`}
      />

      <p>
        <code>validateEnvironment()</code> fails fast if required variables are missing or if
        <code>EXECUTE_BASH_POLICY</code> is not one of <code>strict</code>/<code>relaxed</code>.
      </p>

      <CodeBlock
        filename="src/AgentDaemon.php"
        language="php"
        code={`if ($missing !== []) {
    throw new RuntimeException('Missing required environment variables: ' . implode(', ', $missing));
}

if (!in_array($this->executeBashPolicy, ['strict', 'relaxed'], true)) {
    throw new RuntimeException('Invalid EXECUTE_BASH_POLICY. Expected "strict" or "relaxed".');
}`}
      />

      <h3>Runtime directories</h3>
      <ul>
        <li><code>~/.picobot/workspace</code> — working directory for tools and prompt files</li>
        <li><code>~/.picobot/threads</code> — thread transcript JSON persistence</li>
        <li><code>~/.picobot/workspace/.agents/skills</code> — optional custom skill packs</li>
      </ul>

      <h3>Configuration behavior knobs</h3>
      <table className="content-table">
        <thead>
          <tr>
            <th>Setting</th>
            <th>Impact</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>EXECUTE_BASH_POLICY=strict</code></td>
            <td>Allows only a command allowlist plus blocks unsafe shell operators.</td>
          </tr>
          <tr>
            <td><code>EXECUTE_BASH_POLICY=relaxed</code></td>
            <td>Disables allowlist but still blocks unsafe operators (<code>;</code>, <code>|</code>, <code>$()</code>, redirects).</td>
          </tr>
          <tr>
            <td>Workspace prompt files</td>
            <td>System prompt composition includes IDENTITY.md, AGENTS.md, BOOTSTRAP.md, HEARTBEAT.md (if present).</td>
          </tr>
        </tbody>
      </table>

      <Callout tone="warning" title="Operational caution">
        Relaxed bash policy is intentionally less safe. Keep strict policy for unattended or multi-user environments.
      </Callout>
    </>
  ),
  quiz: [
    {
      question: 'Which environment variable limits who can chat with the bot?',
      options: ['SLACK_BOT_TOKEN', 'SLACK_APP_TOKEN', 'SLACK_USER_ID', 'ANTHROPIC_MODEL'],
      correctIndex: 2,
      explanation:
        'handleSlackMessageEvent() compares incoming event.user against SLACK_USER_ID and rejects unauthorized users.',
    },
    {
      question: 'What happens if a required env var is missing at startup?',
      options: [
        'The daemon logs a warning and continues',
        'validateEnvironment() throws a RuntimeException and startup fails',
        'Composer auto-fills missing values',
        'Slack prompts for missing values',
      ],
      correctIndex: 1,
      explanation:
        'The daemon is designed to fail fast so runtime errors are surfaced immediately.',
    },
    {
      question: 'Where are persisted thread conversations stored?',
      options: [
        '/tmp/threads',
        '~/.picobot/threads/*.json',
        'vendor/threads',
        'src/storage',
      ],
      correctIndex: 1,
      explanation:
        'saveThread() writes JSON files into ~/.picobot/threads, keyed by thread timestamp.',
    },
  ],
};
