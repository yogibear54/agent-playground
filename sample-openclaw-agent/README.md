# Sample Agent (PHP)

Native PHP CLI daemon that mirrors the TypeScript Slack + Anthropic agent behavior from `index.ts`.

**Origin.** The TypeScript agent in `index.ts` is based on [How to build OpenClaw in 400 lines of code](https://hugodutka.com/posts/openclaw-400-loc/) by Hugo Dutka. The PHP daemon in this repo is a port of that design.

## Requirements

- PHP 8.2+
- Composer
- Slack app configured for Socket Mode
- Anthropic API key

For Slack app creation and tokens (app-level token with `connections:write`, bot token from Install App), see the [tutorial](https://hugodutka.com/posts/openclaw-400-loc/).

## Install

```bash
composer install
```

## Environment

Set the following variables before running:

- `SLACK_BOT_TOKEN`
- `SLACK_APP_TOKEN`
- `SLACK_USER_ID`
- `ANTHROPIC_API_KEY`
- `EXECUTE_BASH_POLICY` (optional: `strict` or `relaxed`, default `strict`)

You can copy the template and edit values:

```bash
cp .env.example .env
```

## Run

```bash
php bin/agent.php
```

or:

```bash
composer run agent
```

## Notes

- Runtime files live in `~/.picobot`.
- Workspace root is `~/.picobot/workspace`.
- Thread state is saved to `~/.picobot/threads/*.json`.
- Tool execution is restricted to workspace file access and an allowlisted command set.
- `EXECUTE_BASH_POLICY=strict` keeps the command allowlist enabled.
- `EXECUTE_BASH_POLICY=relaxed` disables the command allowlist (unsafe operators are still blocked).

**Workspace and prompt files.** The daemon builds the system prompt from workspace files when present: `IDENTITY.md`, `AGENTS.md`, `BOOTSTRAP.md`, and optionally `HEARTBEAT.md`. Skills are loaded from `~/.picobot/workspace/.agents/skills/` (each skill is a directory containing `SKILL.md` with YAML frontmatter). See the [tutorial](https://hugodutka.com/posts/openclaw-400-loc/) for templates and usage.

## Smoke Test Checklist

- Start without env vars and confirm it fails fast with missing-variable errors:
  - `php bin/agent.php`
- Set valid env vars and start daemon:
  - `php bin/agent.php`
- Send a DM from the authorized Slack user and verify:
  - typing status appears
  - agent replies in-thread via tool call
  - a thread file is written under `~/.picobot/threads`
- Send a DM from a different Slack user and verify unauthorized response.
- Leave daemon running for at least one heartbeat interval and verify heartbeat logs continue even when no thread files exist.

## Intentional Changes from TypeScript Version

- Added startup validation for required environment variables.
- Fixed heartbeat reliability: no-thread condition now skips the tick without terminating the heartbeat loop.
- Corrected conversation stop semantics to check for pending `tool_use` blocks instead of `tool_result`.
- Hardened tool safety with workspace path confinement and command allowlisting for shell execution.
