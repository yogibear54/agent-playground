import { ArchitectureOverviewChapter } from "../chapters/ArchitectureOverviewChapter";
import { ConfigAndEntrypointsChapter } from "../chapters/ConfigAndEntrypointsChapter";
import { DataFlowChapter } from "../chapters/DataFlowChapter";
import { KeyModulesChapter } from "../chapters/KeyModulesChapter";
import { TypeScriptPatternsChapter } from "../chapters/TypeScriptPatternsChapter";
import type { Chapter } from "../types";

export const chapters: Chapter[] = [
  {
    id: "architecture-overview",
    title: "Architecture Overview",
    overview: [
      "This chapter maps the project at a high level so you can quickly orient yourself. The codebase is intentionally small, but it still demonstrates a practical architecture split between runtime logic, tool behavior, configuration, and prompt setup.",
      "In this surface pass, focus on where code lives and how modules connect. In deep-dive, we will expand each section with line-by-line reasoning and design tradeoffs.",
    ],
    filesCovered: [
      "src/index.ts",
      "dist/index.js",
      "dist/agent/*.js",
      "dist/tools/*.js",
      "dist/lib/*.js",
      "dist/config/*.js",
      "dist/prompts/*.js",
    ],
    component: ArchitectureOverviewChapter,
  },
  {
    id: "key-modules",
    title: "Key Modules",
    overview: [
      "The project centers around one core executable flow plus supporting modules: agent creation, event logging, message parsing, and the sum tool itself. Even with a compact codebase, these boundaries model common production concerns.",
      "This chapter identifies what each module is responsible for without deep implementation details.",
    ],
    filesCovered: [
      "src/index.ts",
      "dist/agent/createAgent.js",
      "dist/agent/events.js",
      "dist/tools/sumNumbers.js",
      "dist/lib/messages.js",
      "dist/prompts/system.js",
    ],
    component: KeyModulesChapter,
  },
  {
    id: "data-flow",
    title: "Data Flow",
    overview: [
      "At a surface level, data starts as user message text, is passed through the agent runtime, optionally routed into a tool call, then transformed into an assistant response. This chapter traces that path end to end.",
      "You will also see where extraction, summation, and event streaming happen so debugging later is easier.",
    ],
    filesCovered: [
      "src/index.ts",
      "dist/lib/messages.js",
      "dist/tools/sumNumbers.js",
      "dist/agent/events.js",
    ],
    component: DataFlowChapter,
  },
  {
    id: "typescript-patterns",
    title: "TypeScript Patterns",
    overview: [
      "This codebase demonstrates practical TypeScript patterns for agent applications: explicit type imports, type guards, typed tool schemas, and strongly typed helper functions.",
      "In this pass we only catalog the patterns and where they appear. Deep-dive will explain why each pattern improves reliability.",
    ],
    filesCovered: ["src/index.ts", "tsconfig.json", "package.json"],
    component: TypeScriptPatternsChapter,
  },
  {
    id: "configuration-and-entry-points",
    title: "Configuration & Entry Points",
    overview: [
      "This chapter lists the files and environment variables that control runtime behavior. Understanding these entry points helps you run, tweak, and troubleshoot the project quickly.",
      "We cover scripts, TypeScript compiler settings, required environment variables, and startup flow from the main entry file.",
    ],
    filesCovered: [
      "package.json",
      "tsconfig.json",
      ".env.example",
      "README.md",
      "src/index.ts",
      "dist/config/env.js",
      "dist/index.js",
    ],
    component: ConfigAndEntrypointsChapter,
  },
];
