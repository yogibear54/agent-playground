import { Agent, type AgentMessage, type AgentTool } from "@mariozechner/pi-agent-core";
import { getModel, type UserMessage } from "@mariozechner/pi-ai";
import { Type } from "@sinclair/typebox";

/** Matches integer and decimal literals (e.g. -3, 42, 1.5). */
const NUMBER_PATTERN = /-?\d+(?:\.\d+)?/g;

export function extractNumbersFromText(text: string): number[] {
	const out: number[] = [];
	for (const m of text.matchAll(NUMBER_PATTERN)) {
		const n = Number.parseFloat(m[0]);
		if (Number.isFinite(n)) out.push(n);
	}
	return out;
}

function isUserMessage(m: AgentMessage): m is UserMessage {
	return (m as UserMessage).role === "user";
}

export function stringifyUserContent(msg: UserMessage): string {
	const c = msg.content;
	if (typeof c === "string") return c;
	return c
		.map((part) => {
			if (part.type === "text") return part.text;
			return "";
		})
		.join("");
}

export function getLastUserMessageText(messages: AgentMessage[]): string | null {
	for (let i = messages.length - 1; i >= 0; i--) {
		const m = messages[i];
		if (isUserMessage(m)) return stringifyUserContent(m);
	}
	return null;
}

const emptyParams = Type.Object({});

function createSumNumbersTool(agent: Agent): AgentTool<typeof emptyParams> {
	return {
		name: "sum_numbers_in_last_user_message",
		label: "Sum numbers in last user message",
		description:
			"Sums every numeric literal in the most recent user message in the conversation. Call this when the user asks for a sum of numbers they wrote.",
		parameters: emptyParams,
		execute: async () => {
			const text = getLastUserMessageText(agent.state.messages);
			if (text === null) {
				return {
					content: [{ type: "text", text: "No user message found in context." }],
					details: { numbers: [] as number[], sum: 0 },
				};
			}
			const numbers = extractNumbersFromText(text);
			const sum = numbers.reduce((a, b) => a + b, 0);
			return {
				content: [
					{
						type: "text",
						text: `Found ${numbers.length} number(s): [${numbers.join(", ")}]. Sum = ${sum}.`,
					},
				],
				details: { numbers, sum },
			};
		},
	};
}

const DEMO_PROMPT =
	"I bought items for 12.50, 8, and 3.25 dollars. What is the sum of those amounts? Use the tool to sum the numbers in my message.";

/** OpenRouter model id (see https://openrouter.ai/models). Override with OPENROUTER_MODEL. */
const DEFAULT_OPENROUTER_MODEL = "openrouter/auto";

function isAssistantMessage(m: AgentMessage): m is Extract<AgentMessage, { role: "assistant" }> {
	return (m as { role?: string }).role === "assistant";
}

function getAssistantText(m: Extract<AgentMessage, { role: "assistant" }>): string {
	return m.content
		.map((part) => (part.type === "text" ? part.text : ""))
		.join("")
		.trim();
}

async function main(): Promise<void> {
	if (!process.env.OPENROUTER_API_KEY?.trim()) {
		console.error("Set OPENROUTER_API_KEY in the environment. See README.md.");
		process.exitCode = 1;
		return;
	}

	const openRouterModelId = process.env.OPENROUTER_MODEL?.trim() || DEFAULT_OPENROUTER_MODEL;

	const agent = new Agent({
		initialState: {
			systemPrompt:
				"You are a helpful assistant. When the user asks to sum numbers that appear in their message, call the tool sum_numbers_in_last_user_message exactly once and answer using its result.",
			// getModel expects a catalog model id; OPENROUTER_MODEL must match @mariozechner/pi-ai's generated list.
			model: getModel("openrouter", openRouterModelId as never),
			tools: [],
		},
	});

	agent.setTools([createSumNumbersTool(agent)]);
	let sawTextDelta = false;

	agent.subscribe((event) => {
		if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
			sawTextDelta = true;
			process.stdout.write(event.assistantMessageEvent.delta);
		}
		if (event.type === "message_end" && isAssistantMessage(event.message)) {
			const text = getAssistantText(event.message);
			if (!sawTextDelta && text) process.stdout.write(`${text}\n`);
			if (event.message.stopReason === "error" && event.message.errorMessage) {
				console.error(`Model error: ${event.message.errorMessage}`);
			}
		}
	});

	await agent.prompt(DEMO_PROMPT);
	process.stdout.write("\n");
	await agent.waitForIdle();
}

main().catch((err) => {
	console.error(err);
	process.exitCode = 1;
});
