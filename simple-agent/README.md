# simple-agent

Minimal [pi-mono](https://github.com/badlogic/pi-mono) experiment: an `@mariozechner/pi-agent-core` agent with one tool that sums numeric literals in the **latest user message**.

## Setup

```bash
npm install
```

## Credentials

This demo uses [OpenRouter](https://openrouter.ai/) via `getModel("openrouter", ...)`. pi-ai reads the API key from:

| Variable | Purpose |
|----------|---------|
| `OPENROUTER_API_KEY` | Required. Your [OpenRouter API key](https://openrouter.ai/settings/keys). |
| `OPENROUTER_MODEL` | Optional. Model id (e.g. `anthropic/claude-sonnet-4`). Defaults to `anthropic/claude-sonnet-4` if unset. |

Copy `.env.example` to `.env` or export the variables in your shell.

## Run

```bash
npm run dev
```

Or build then run:

```bash
npm run build
npm start
```

The program sends a short demo prompt that includes several numbers and expects the model to call `sum_numbers_in_last_user_message`.

## Packages

- `@mariozechner/pi-agent-core` — agent runtime
- `@mariozechner/pi-ai` — `getModel` and provider wiring
- `@sinclair/typebox` — tool parameter schemas
