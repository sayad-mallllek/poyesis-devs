import type { Action, Subject, UiBlock } from "@repo/contracts";
import { type, type Type } from "arktype";
import type { Actor } from "../../authz/actor.js";

/** Everything a tool may use while running; bound to one request. */
export interface ToolContext {
  actor: Actor;
  /** Streams a generative-UI block to the client (and persists it in the turn). */
  emit: (block: UiBlock) => void;
  /** Today's date (`YYYY-MM-DD`) in the company timezone, for relative dates. */
  today: string;
  /** Id of the tool call being executed (used as the id of forms it renders). */
  callId: string;
}

/**
 * How a tool influences the agent loop:
 * - `continue`: the result goes back to the model (default);
 * - `awaitUser`: the turn ends after this call — the user answers in the UI;
 * - `confirm`: the call is *not* executed; the user must approve it first.
 */
export type ToolMode = "continue" | "awaitUser" | "confirm";

export interface AssistantTool<S extends Type = Type> {
  name: string;
  /** Present-progressive label shown in the UI, e.g. "Creating project". */
  label: string;
  description: string;
  schema: S;
  mode?: ToolMode;
  /**
   * Coarse ABAC gate: the tool is only offered to principals who may perform
   * this action on *some* resource of the subject. Services still enforce
   * resource-level rules on every call.
   */
  requires?: { action: Action; subject: Subject };
  /** One-line human summary of what a confirm-mode call will do. */
  describe?: (input: S["infer"]) => string;
  run: (ctx: ToolContext, input: S["infer"]) => Promise<unknown>;
}

export const defineTool = <S extends Type>(tool: AssistantTool<S>): AssistantTool => tool as unknown as AssistantTool;

export interface OpenAiToolDefinition {
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
}

/** ArkType → JSON Schema for the model. Narrows/morphs degrade to their base type. */
export function toOpenAiTool(tool: AssistantTool): OpenAiToolDefinition {
  const { $schema: _ignored, ...parameters } = tool.schema.toJsonSchema({
    fallback: (ctx) => ctx.base,
  }) as Record<string, unknown>;
  return { type: "function", function: { name: tool.name, description: tool.description, parameters } };
}

/** Validates model-produced arguments; returns a message the model can act on. */
export function parseToolInput(tool: AssistantTool, args: unknown): { ok: true; value: unknown } | { ok: false; error: string } {
  const out = tool.schema(args ?? {});
  if (out instanceof type.errors) return { ok: false, error: `Invalid arguments: ${out.summary}` };
  return { ok: true, value: out };
}

/** Shared argument schemas. */
export const idArg = type("string > 0").describe("an id returned by a previous tool call");
export const noArgs = type({});
