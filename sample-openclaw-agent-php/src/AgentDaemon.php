<?php

declare(strict_types=1);

namespace SampleAgent;

use GuzzleHttp\Client as HttpClient;
use GuzzleHttp\Exception\GuzzleException;
use Symfony\Component\Yaml\Yaml;
use WebSocket\Client as WebSocketClient;
use WebSocket\ConnectionException;
use WebSocket\TimeoutException;

final class AgentDaemon
{
    private const HEARTBEAT_INTERVAL_SECONDS = 1800;
    private const ANTHROPIC_MODEL = 'claude-opus-4-1-20250805';
    private const ANTHROPIC_VERSION = '2023-06-01';
    private const EXECUTE_BASH_POLICY_STRICT = 'strict';
    private const EXECUTE_BASH_POLICY_RELAXED = 'relaxed';

    private HttpClient $http;
    private string $slackBotToken;
    private string $slackAppToken;
    private string $slackUserId;
    private string $anthropicApiKey;
    private string $executeBashPolicy;
    private string $configDir;
    private string $threadsDir;
    private string $workspaceDir;

    /** @var array<string, bool> */
    private array $activeThreadLoops = [];
    /** @var array<string, array<int, array<string, mixed>>> */
    private array $pendingUserMessages = [];

    public function __construct()
    {
        $this->slackBotToken = (string) getenv('SLACK_BOT_TOKEN');
        $this->slackAppToken = (string) getenv('SLACK_APP_TOKEN');
        $this->slackUserId = (string) getenv('SLACK_USER_ID');
        $this->anthropicApiKey = (string) getenv('ANTHROPIC_API_KEY');
        $this->executeBashPolicy = strtolower((string) (getenv('EXECUTE_BASH_POLICY') ?: self::EXECUTE_BASH_POLICY_STRICT));

        $home = rtrim((string) getenv('HOME'), '/');
        $this->configDir = $home . '/.picobot';
        $this->threadsDir = $this->configDir . '/threads';
        $this->workspaceDir = $this->configDir . '/workspace';

        $this->http = new HttpClient([
            'timeout' => 30,
            'http_errors' => true,
        ]);
    }

    public function run(): void
    {
        $this->validateEnvironment();
        $this->bootstrapWorkspace();
        chdir($this->workspaceDir);

        echo "Slack agent running\n";
        $nextHeartbeatAt = time() + self::HEARTBEAT_INTERVAL_SECONDS;

        while (true) {
            try {
                $socket = $this->openSocketModeConnection();
                while (true) {
                    if (time() >= $nextHeartbeatAt) {
                        $this->runHeartbeatTick();
                        $nextHeartbeatAt = time() + self::HEARTBEAT_INTERVAL_SECONDS;
                    }

                    try {
                        $raw = $socket->receive();
                        if (!is_string($raw) || trim($raw) === '') {
                            continue;
                        }
                        $payload = json_decode($raw, true);
                        if (!is_array($payload)) {
                            continue;
                        }
                        $this->handleSocketEnvelope($socket, $payload);
                    } catch (TimeoutException) {
                        continue;
                    }
                }
            } catch (ConnectionException $e) {
                fwrite(STDERR, "Socket disconnected: {$e->getMessage()}\n");
                sleep(2);
            } catch (\Throwable $e) {
                fwrite(STDERR, "Fatal loop error: {$e->getMessage()}\n");
                sleep(2);
            }
        }
    }

    private function validateEnvironment(): void
    {
        $missing = [];
        foreach ([
            'SLACK_BOT_TOKEN' => $this->slackBotToken,
            'SLACK_APP_TOKEN' => $this->slackAppToken,
            'SLACK_USER_ID' => $this->slackUserId,
            'ANTHROPIC_API_KEY' => $this->anthropicApiKey,
        ] as $key => $value) {
            if ($value === '') {
                $missing[] = $key;
            }
        }

        if ($missing !== []) {
            throw new \RuntimeException('Missing required environment variables: ' . implode(', ', $missing));
        }

        if (!in_array($this->executeBashPolicy, [self::EXECUTE_BASH_POLICY_STRICT, self::EXECUTE_BASH_POLICY_RELAXED], true)) {
            throw new \RuntimeException(
                'Invalid EXECUTE_BASH_POLICY. Expected "strict" or "relaxed".'
            );
        }
    }

    private function bootstrapWorkspace(): void
    {
        if (!is_dir($this->workspaceDir)) {
            mkdir($this->workspaceDir, 0777, true);
        }
        $entries = array_values(array_diff(scandir($this->workspaceDir) ?: [], ['.', '..']));
        if ($entries !== []) {
            return;
        }

        $templateDir = getcwd() . '/workspace_template';
        if (is_dir($templateDir)) {
            $this->copyDirectoryRecursive($templateDir, $this->workspaceDir);
        }
    }

    private function copyDirectoryRecursive(string $src, string $dest): void
    {
        if (!is_dir($dest)) {
            mkdir($dest, 0777, true);
        }

        $items = scandir($src) ?: [];
        foreach ($items as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }
            $srcPath = $src . '/' . $item;
            $destPath = $dest . '/' . $item;
            if (is_dir($srcPath)) {
                $this->copyDirectoryRecursive($srcPath, $destPath);
            } else {
                copy($srcPath, $destPath);
            }
        }
    }

    private function openSocketModeConnection(): WebSocketClient
    {
        $response = $this->slackApiRequest('apps.connections.open', [], $this->slackAppToken);
        $url = (string) ($response['url'] ?? '');
        if ($url === '') {
            throw new \RuntimeException('Slack Socket Mode did not return a websocket URL');
        }

        return new WebSocketClient($url, ['timeout' => 2]);
    }

    /**
     * @param array<string, mixed> $payload
     */
    private function handleSocketEnvelope(WebSocketClient $socket, array $payload): void
    {
        if (isset($payload['envelope_id']) && is_string($payload['envelope_id'])) {
            $socket->send(json_encode(['envelope_id' => $payload['envelope_id']], JSON_THROW_ON_ERROR));
        }

        if (($payload['type'] ?? '') !== 'events_api') {
            return;
        }
        $event = $payload['payload']['event'] ?? null;
        if (!is_array($event)) {
            return;
        }
        $this->handleSlackMessageEvent($event);
    }

    /**
     * @param array<string, mixed> $event
     */
    private function handleSlackMessageEvent(array $event): void
    {
        if (($event['type'] ?? '') !== 'message') {
            return;
        }
        if (isset($event['subtype']) || ($event['channel_type'] ?? '') !== 'im') {
            return;
        }

        $threadTs = (string) ($event['thread_ts'] ?? $event['ts'] ?? '');
        $channel = (string) ($event['channel'] ?? '');
        $user = (string) ($event['user'] ?? '');
        $text = (string) ($event['text'] ?? '');
        $ts = (string) ($event['ts'] ?? '');
        if ($threadTs === '' || $channel === '' || $user === '') {
            return;
        }

        if ($user !== $this->slackUserId) {
            $this->postSlackMessage($channel, $threadTs, "I'm sorry, I'm not authorized to respond to messages from you. Set the `SLACK_USER_ID` environment variable to `{$user}` to allow me to respond to your messages.");
            return;
        }

        $this->setTypingStatus($channel, $threadTs);

        $pending = $this->pendingUserMessages[$threadTs] ?? [];
        $pending[] = [
            'role' => 'user',
            'content' => "User <@{$user}> sent this message (timestamp: {$ts}) in Slack:\n```\n{$text}\n```\n\nYou must respond using the `send_slack_message` tool.",
        ];
        $this->pendingUserMessages[$threadTs] = $pending;

        try {
            $this->runThreadLoop($threadTs, $channel);
        } catch (\Throwable $e) {
            fwrite(STDERR, "runThreadLoop failed for {$threadTs}: {$e->getMessage()}\n");
        }
    }

    private function runThreadLoop(string $threadTs, string $channel): void
    {
        if (($this->activeThreadLoops[$threadTs] ?? false) === true) {
            return;
        }
        $this->activeThreadLoops[$threadTs] = true;

        try {
            while (true) {
                $thread = $this->loadThread($threadTs) ?? [
                    'threadTs' => $threadTs,
                    'channel' => $channel,
                    'messages' => [],
                ];

                $pending = $this->pendingUserMessages[$threadTs] ?? [];
                if ($pending !== []) {
                    $thread['messages'] = array_merge($thread['messages'], $pending);
                    unset($this->pendingUserMessages[$threadTs]);
                }

                if ($this->isConversationAtRest($thread['messages'])) {
                    break;
                }

                $messages = $this->generateMessages(
                    $channel,
                    $threadTs,
                    $this->systemPrompt(),
                    $thread['messages']
                );

                $thread['messages'] = $messages;
                $this->saveThread($threadTs, $thread);
            }
        } finally {
            unset($this->activeThreadLoops[$threadTs]);
        }
    }

    /**
     * @param array<int, array<string, mixed>> $messages
     */
    private function isConversationAtRest(array $messages): bool
    {
        if ($messages === []) {
            return true;
        }
        $last = $messages[array_key_last($messages)];
        if (($last['role'] ?? '') !== 'assistant') {
            return false;
        }
        $content = $last['content'] ?? null;
        if (!is_array($content)) {
            return false;
        }
        foreach ($content as $block) {
            if (is_array($block) && ($block['type'] ?? '') === 'tool_use') {
                return false;
            }
        }
        return true;
    }

    /**
     * @param array<int, array<string, mixed>> $messages
     * @return array<int, array<string, mixed>>
     */
    private function generateMessages(string $channel, string $threadTs, string $system, array $messages): array
    {
        $tools = $this->createTools($channel, $threadTs);
        $toolsForApi = array_map(
            static fn (array $tool): array => [
                'name' => $tool['name'],
                'description' => $tool['description'],
                'input_schema' => $tool['input_schema'],
            ],
            $tools
        );

        echo "Generating messages for thread {$threadTs}\n";
        $response = $this->anthropicRequest([
            'model' => self::ANTHROPIC_MODEL,
            'max_tokens' => 8096,
            'system' => $system,
            'messages' => $messages,
            'tools' => $toolsForApi,
        ]);

        $content = $response['content'] ?? [];
        if (!is_array($content)) {
            $content = [];
        }

        $toolsByName = [];
        foreach ($tools as $tool) {
            $toolsByName[$tool['name']] = $tool;
        }

        $toolResults = [];
        foreach ($content as $block) {
            if (!is_array($block) || ($block['type'] ?? '') !== 'tool_use') {
                continue;
            }
            $toolName = (string) ($block['name'] ?? '');
            $toolInput = is_array($block['input'] ?? null) ? $block['input'] : [];
            $toolUseId = (string) ($block['id'] ?? '');
            try {
                $tool = $toolsByName[$toolName] ?? null;
                if ($tool === null) {
                    throw new \RuntimeException("tool \"{$toolName}\" not found");
                }
                $result = ($tool['execute'])($toolInput);
                $toolResults[] = [
                    'type' => 'tool_result',
                    'tool_use_id' => $toolUseId,
                    'content' => is_string($result) ? $result : json_encode($result, JSON_THROW_ON_ERROR),
                ];
            } catch (\Throwable $e) {
                fwrite(STDERR, "Tool {$toolName} failed: {$e->getMessage()}\n");
                $toolResults[] = [
                    'type' => 'tool_result',
                    'tool_use_id' => $toolUseId,
                    'content' => 'Error: ' . $e->getMessage(),
                    'is_error' => true,
                ];
            }
        }

        $messages[] = ['role' => 'assistant', 'content' => $content];
        if ($toolResults !== []) {
            $messages[] = ['role' => 'user', 'content' => $toolResults];
        }

        return $messages;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function createTools(string $channel, string $threadTs): array
    {
        return [
            [
                'name' => 'send_slack_message',
                'description' => 'Send a message to the user in Slack. This is the only way to communicate with the user.',
                'input_schema' => [
                    'type' => 'object',
                    'properties' => [
                        'text' => [
                            'type' => 'string',
                            'description' => 'The message text (supports Slack mrkdwn formatting)',
                        ],
                    ],
                    'required' => ['text'],
                ],
                'execute' => function (array $input) use ($channel, $threadTs): string {
                    $text = (string) ($input['text'] ?? '');
                    if ($text === '') {
                        throw new \RuntimeException('text is required');
                    }
                    $this->postSlackMessage($channel, $threadTs, $text);
                    return 'Message sent.';
                },
            ],
            [
                'name' => 'read_file',
                'description' => 'Read the contents of a file at the given path.',
                'input_schema' => [
                    'type' => 'object',
                    'properties' => [
                        'path' => [
                            'type' => 'string',
                            'description' => 'The file path to read',
                        ],
                    ],
                    'required' => ['path'],
                ],
                'execute' => function (array $input): string {
                    $path = $this->resolveWorkspacePath((string) ($input['path'] ?? ''), true);
                    return (string) file_get_contents($path);
                },
            ],
            [
                'name' => 'write_file',
                'description' => "Write content to a file at the given path. Creates the file if it doesn't exist, overwrites if it does.",
                'input_schema' => [
                    'type' => 'object',
                    'properties' => [
                        'path' => [
                            'type' => 'string',
                            'description' => 'The file path to write',
                        ],
                        'content' => [
                            'type' => 'string',
                            'description' => 'The content to write',
                        ],
                    ],
                    'required' => ['path', 'content'],
                ],
                'execute' => function (array $input): string {
                    $path = $this->resolveWorkspacePath((string) ($input['path'] ?? ''), false);
                    $content = (string) ($input['content'] ?? '');
                    $dir = dirname($path);
                    if (!is_dir($dir)) {
                        mkdir($dir, 0777, true);
                    }
                    file_put_contents($path, $content);
                    return 'File written.';
                },
            ],
            [
                'name' => 'execute_bash',
                'description' => 'Execute a bash command and return its output.',
                'input_schema' => [
                    'type' => 'object',
                    'properties' => [
                        'command' => [
                            'type' => 'string',
                            'description' => 'The bash command to execute.',
                        ],
                    ],
                    'required' => ['command'],
                ],
                'execute' => function (array $input): string {
                    $command = trim((string) ($input['command'] ?? ''));
                    if ($command === '') {
                        throw new \RuntimeException('command is required');
                    }
                    $this->assertSafeCommand($command);
                    return $this->runCommandWithTimeout($command, 120);
                },
            ],
        ];
    }

    private function runHeartbeatTick(): void
    {
        echo 'Heartbeat at ' . date('c') . "\n";
        $lastThreadTs = $this->getLastThreadTs();
        if ($lastThreadTs === null) {
            echo "No threads found, skipping heartbeat\n";
            return;
        }

        $thread = $this->loadThread($lastThreadTs);
        if ($thread === null) {
            throw new \RuntimeException("Thread {$lastThreadTs} not found");
        }
        $pending = $this->pendingUserMessages[$lastThreadTs] ?? [];
        $pending[] = [
            'role' => 'user',
            'content' => 'Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.',
        ];
        $this->pendingUserMessages[$lastThreadTs] = $pending;
        $this->runThreadLoop($lastThreadTs, (string) $thread['channel']);
    }

    private function getLastThreadTs(): ?string
    {
        if (!is_dir($this->threadsDir)) {
            return null;
        }
        $matches = glob($this->threadsDir . '/*.json');
        if ($matches === false || $matches === []) {
            return null;
        }
        rsort($matches, SORT_STRING);
        $latest = $matches[0] ?? null;
        if ($latest === null) {
            return null;
        }
        return pathinfo($latest, PATHINFO_FILENAME);
    }

    /**
     * @return array<string, mixed>|null
     */
    private function loadThread(string $threadTs): ?array
    {
        $path = $this->threadsDir . '/' . $threadTs . '.json';
        if (!is_file($path)) {
            return null;
        }
        $decoded = json_decode((string) file_get_contents($path), true);
        return is_array($decoded) ? $decoded : null;
    }

    /**
     * @param array<string, mixed> $thread
     */
    private function saveThread(string $threadTs, array $thread): void
    {
        if (!is_dir($this->threadsDir)) {
            mkdir($this->threadsDir, 0777, true);
        }
        file_put_contents(
            $this->threadsDir . '/' . $threadTs . '.json',
            json_encode($thread, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR)
        );
    }

    private function systemPrompt(): string
    {
        $prompt = "Your workspace is in {$this->workspaceDir}.\n\n";

        $identityPath = $this->workspaceDir . '/IDENTITY.md';
        if (is_file($identityPath)) {
            $prompt .= (string) file_get_contents($identityPath);
            $prompt .= "\n\n";
        }

        $agentsPath = $this->workspaceDir . '/AGENTS.md';
        if (is_file($agentsPath)) {
            $prompt .= (string) file_get_contents($agentsPath);
        } else {
            $prompt .= 'Your AGENTS.md file is missing. Tell the user to create it.';
        }
        $prompt .= "\n\n";

        $bootstrapPath = $this->workspaceDir . '/BOOTSTRAP.md';
        if (is_file($bootstrapPath)) {
            $prompt .= (string) file_get_contents($bootstrapPath);
        }

        $skills = $this->loadSkills();
        if ($skills !== []) {
            $prompt .= "<available_skills>\n";
            foreach ($skills as $skill) {
                $name = (string) ($skill['name'] ?? '');
                $description = (string) ($skill['description'] ?? '');
                $location = (string) ($skill['location'] ?? '');
                $prompt .= "  <skill>\n";
                $prompt .= "    <name>{$name}</name>\n";
                $prompt .= "    <description>{$description}</description>\n";
                $prompt .= "    <location>{$location}</location>\n";
                $prompt .= "  </skill>\n";
            }
            $prompt .= "</available_skills>\n";
        }

        return $prompt;
    }

    /**
     * @return array<int, array<string, string>>
     */
    private function loadSkills(): array
    {
        $skillsDir = $this->workspaceDir . '/.agents/skills';
        if (!is_dir($skillsDir)) {
            return [];
        }

        $skills = [];
        $iter = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($skillsDir, \FilesystemIterator::SKIP_DOTS)
        );
        foreach ($iter as $file) {
            if (!$file->isFile() || $file->getFilename() !== 'SKILL.md') {
                continue;
            }
            $location = $file->getPathname();
            try {
                $content = (string) file_get_contents($location);
                if (!preg_match('/^---\R(.*?)\R---\R/s', $content, $matches)) {
                    continue;
                }
                $frontmatter = Yaml::parse($matches[1] ?? '');
                if (!is_array($frontmatter)) {
                    continue;
                }
                $skills[] = [
                    'name' => (string) ($frontmatter['name'] ?? ''),
                    'description' => (string) ($frontmatter['description'] ?? ''),
                    'location' => $location,
                ];
            } catch (\Throwable $e) {
                fwrite(STDERR, "Failed to load skill {$location}: {$e->getMessage()}\n");
            }
        }
        return $skills;
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    private function anthropicRequest(array $payload): array
    {
        try {
            $response = $this->http->request('POST', 'https://api.anthropic.com/v1/messages', [
                'headers' => [
                    'x-api-key' => $this->anthropicApiKey,
                    'anthropic-version' => self::ANTHROPIC_VERSION,
                    'content-type' => 'application/json',
                ],
                'json' => $payload,
            ]);
            $decoded = json_decode((string) $response->getBody(), true);
            if (!is_array($decoded)) {
                throw new \RuntimeException('Invalid Anthropic response body');
            }
            return $decoded;
        } catch (GuzzleException $e) {
            throw new \RuntimeException('Anthropic request failed: ' . $e->getMessage(), 0, $e);
        }
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    private function slackApiRequest(string $method, array $payload, ?string $tokenOverride = null): array
    {
        $token = $tokenOverride ?? $this->slackBotToken;
        try {
            $response = $this->http->request('POST', "https://slack.com/api/{$method}", [
                'headers' => [
                    'authorization' => 'Bearer ' . $token,
                    'content-type' => 'application/json; charset=utf-8',
                ],
                'json' => $payload,
            ]);
            $decoded = json_decode((string) $response->getBody(), true);
            if (!is_array($decoded)) {
                throw new \RuntimeException("Invalid Slack response for {$method}");
            }
            if (($decoded['ok'] ?? false) !== true) {
                $error = (string) ($decoded['error'] ?? 'unknown_error');
                throw new \RuntimeException("Slack API {$method} failed: {$error}");
            }
            return $decoded;
        } catch (GuzzleException $e) {
            throw new \RuntimeException("Slack API {$method} request failed: " . $e->getMessage(), 0, $e);
        }
    }

    private function postSlackMessage(string $channel, string $threadTs, string $text): void
    {
        $this->slackApiRequest('chat.postMessage', [
            'channel' => $channel,
            'thread_ts' => $threadTs,
            'text' => $text,
            'blocks' => [
                [
                    'type' => 'section',
                    'text' => [
                        'type' => 'mrkdwn',
                        'text' => $text,
                    ],
                ],
            ],
        ]);
    }

    private function setTypingStatus(string $channel, string $threadTs): void
    {
        try {
            $this->slackApiRequest('assistant.threads.setStatus', [
                'channel_id' => $channel,
                'thread_ts' => $threadTs,
                'status' => 'is typing...',
            ]);
        } catch (\Throwable $e) {
            fwrite(STDERR, "Typing status failed: {$e->getMessage()}\n");
        }
    }

    private function resolveWorkspacePath(string $path, bool $mustExist): string
    {
        if ($path === '') {
            throw new \RuntimeException('path is required');
        }

        $candidate = str_starts_with($path, '/')
            ? $path
            : $this->workspaceDir . '/' . $path;
        $normalized = $this->normalizePath($candidate);
        $workspaceRoot = rtrim($this->normalizePath($this->workspaceDir), '/');

        if ($normalized !== $workspaceRoot && !str_starts_with($normalized, $workspaceRoot . '/')) {
            throw new \RuntimeException('Path is outside workspace');
        }
        if ($mustExist && !is_file($normalized)) {
            throw new \RuntimeException('File does not exist');
        }
        return $normalized;
    }

    private function normalizePath(string $path): string
    {
        $prefix = str_starts_with($path, '/') ? '/' : '';
        $parts = explode('/', str_replace('\\', '/', $path));
        $out = [];
        foreach ($parts as $part) {
            if ($part === '' || $part === '.') {
                continue;
            }
            if ($part === '..') {
                array_pop($out);
                continue;
            }
            $out[] = $part;
        }
        return $prefix . implode('/', $out);
    }

    private function assertSafeCommand(string $command): void
    {
        if (preg_match('/[;&|`><\n\r]/', $command) === 1 || str_contains($command, '$(')) {
            throw new \RuntimeException('Command contains unsafe shell operators');
        }
        if ($this->executeBashPolicy === self::EXECUTE_BASH_POLICY_RELAXED) {
            return;
        }
        if (preg_match('/^(ls|pwd|echo|php|composer|cat|rg|sed|awk|wc|head|tail|stat|which|whoami|date|npm|node|python|python3|git)\b/', $command) !== 1) {
            throw new \RuntimeException('Command not in allowlist');
        }
    }

    private function runCommandWithTimeout(string $command, int $timeoutSeconds): string
    {
        $descriptors = [
            0 => ['pipe', 'r'],
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w'],
        ];
        $process = proc_open(['bash', '-lc', $command], $descriptors, $pipes, $this->workspaceDir);
        if (!is_resource($process)) {
            throw new \RuntimeException('Failed to start process');
        }

        fclose($pipes[0]);
        stream_set_blocking($pipes[1], false);
        stream_set_blocking($pipes[2], false);

        $stdout = '';
        $stderr = '';
        $start = time();
        while (true) {
            $status = proc_get_status($process);
            $stdout .= (string) stream_get_contents($pipes[1]);
            $stderr .= (string) stream_get_contents($pipes[2]);

            if (($status['running'] ?? false) === false) {
                break;
            }
            if ((time() - $start) >= $timeoutSeconds) {
                proc_terminate($process, 9);
                throw new \RuntimeException('command timed out');
            }
            usleep(100_000);
        }

        fclose($pipes[1]);
        fclose($pipes[2]);
        $exit = proc_close($process);

        if ($exit !== 0) {
            $parts = [];
            if (trim($stdout) !== '') {
                $parts[] = "stdout:\n" . trim($stdout);
            }
            if (trim($stderr) !== '') {
                $parts[] = "stderr:\n" . trim($stderr);
            }
            if ($parts !== []) {
                return implode("\n", $parts);
            }
            return "Error: command failed with exit code {$exit}";
        }

        $trimmed = trim($stdout);
        return $trimmed !== '' ? $trimmed : '(no output)';
    }
}
