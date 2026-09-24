import { AIMessage, ToolMessage, type AIMessageChunk, type BaseMessage } from "@langchain/core/messages";
import { concat } from "@langchain/core/utils/stream";
import type { ChatStreamEvent, MessagePart, UiBlock } from "@repo/contracts";
import type { AssistantModel } from "../model/assistant-model.js";
import {
  parseToolInput,
  toOpenAiTool,
  type AssistantTool,
  type ToolContext,
} from "../tools/tool-kit.js";

/** Upper bound on model round-trips per user turn. */
const MAX_STEPS = 10;
/** Tool results larger than this are truncated before reaching the model. */
const MAX_TOOL_RESULT_CHARS = 16_000;

export type AgentEvent = Extract<ChatStreamEvent, { type: "text.delta" | "tool.start" | "tool.end" | "ui" }>;

export interface AgentTurnInput {
  model: AssistantModel;
  /** System prompt + prior turns + the new human message. */
  messages: BaseMessage[];
  tools: AssistantTool[];
  context: Omit<ToolContext, "emit" | "callId">;
  signal: AbortSignal;
  onEvent: (event: AgentEvent) => void;
}

export interface AgentTurnResult {
  parts: MessagePart[];
  /** Messages produced during the turn (AI + tool), replayed on later turns. */
  trace: BaseMessage[];
}

/**
 * Collects the UI-facing parts of a turn in display order, merging
 * consecutive text deltas into one text part.
 */
export class TurnRecorder {
  readonly parts: MessagePart[] = [];

  constructor(private readonly onEvent: (event: AgentEvent) => void) {}

  text(delta: string) {
    if (!delta) return;
    const last = this.parts.at(-1);
    if (last?.type === "text") last.text += delta;
    else this.parts.push({ type: "text", text: delta });
    this.onEvent({ type: "text.delta", delta });
  }

  ui(block: UiBlock) {
    this.parts.push({ type: "ui", block });
    this.onEvent({ type: "ui", block });
  }

  toolStart(toolCallId: string, name: string, label: string, args: unknown) {
    this.parts.push({ type: "tool", toolCallId, name, label, args, status: "running" });
    this.onEvent({ type: "tool.start", toolCallId, name, label, args });
  }

  toolEnd(toolCallId: string, error?: string) {
    const part = this.parts.find((p) => p.type === "tool" && p.toolCallId === toolCallId);
    const status = error ? "error" : "success";
    if (part?.type === "tool") {
      part.status = status;
      if (error) part.error = error;
    }
    this.onEvent({ type: "tool.end", toolCallId, status, ...(error && { error }) });
  }
}

export function serializeToolResult(result: unknown): string {
  const json = typeof result === "string" ? result : JSON.stringify(result ?? { ok: true });
  return json.length > MAX_TOOL_RESULT_CHARS
    ? `${json.slice(0, MAX_TOOL_RESULT_CHARS)}… [truncated ${json.length - MAX_TOOL_RESULT_CHARS} chars]`
    : json;
}

export const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** Runs one tool call and records it; returns the message for the model. */
export async function executeTool(
  tool: AssistantTool,
  toolCallId: string,
  input: unknown,
  ctx: Omit<ToolContext, "callId">,
  recorder: TurnRecorder,
): Promise<ToolMessage> {
  recorder.toolStart(toolCallId, tool.name, tool.label, input);
  try {
    const result = await tool.run({ ...ctx, callId: toolCallId }, input);
    recorder.toolEnd(toolCallId);
    return new ToolMessage({ tool_call_id: toolCallId, content: serializeToolResult(result) });
  } catch (error) {
    const message = errorText(error);
    recorder.toolEnd(toolCallId, message);
    return new ToolMessage({ tool_call_id: toolCallId, content: `Error: ${message}`, status: "error" });
  }
}

/**
 * The agent loop: stream the model, execute requested tools, feed results
 * back, until the model answers without tools, a tool hands control to the
 * user (`awaitUser` / `confirm`), or the step budget is exhausted.
 */
export async function runAgentTurn(input: AgentTurnInput, recorder = new TurnRecorder(input.onEvent)): Promise<AgentTurnResult> {
  const { model, tools, signal } = input;
  const messages = [...input.messages];
  const trace: BaseMessage[] = [];
  const byName = new Map(tools.map((t) => [t.name, t]));
  const definitions = tools.map(toOpenAiTool);
  const ctx = { ...input.context, emit: (block: UiBlock) => recorder.ui(block) };

  for (let step = 0; step < MAX_STEPS; step++) {
    let full: AIMessageChunk | undefined;
    for await (const chunk of await model.stream(messages, definitions, signal)) {
      full = full ? concat(full, chunk) : chunk;
      recorder.text(chunk.text);
    }

    const toolCalls = full?.tool_calls ?? [];
    const ai = new AIMessage({ content: full?.content ?? "", tool_calls: toolCalls });
    messages.push(ai);
    trace.push(ai);
    if (toolCalls.length === 0) return { parts: recorder.parts, trace };

    let handOff = false;
    for (const call of toolCalls) {
      const id = call.id ?? `call_${step}_${call.name}`;
      const tool = byName.get(call.name);
      const parsed = tool ? parseToolInput(tool, call.args) : { ok: false as const, error: `Unknown tool "${call.name}"` };

      let result: ToolMessage;
      if (!tool || !parsed.ok) {
        const error = parsed.ok ? "Unknown tool" : parsed.error;
        recorder.toolStart(id, call.name, tool?.label ?? call.name, call.args);
        recorder.toolEnd(id, error);
        result = new ToolMessage({ tool_call_id: id, content: `Error: ${error}`, status: "error" });
      } else if (tool.mode === "confirm") {
        recorder.ui({
          kind: "confirm",
          id,
          title: tool.label,
          description: tool.describe?.(parsed.value) ?? `Run ${tool.name}`,
          confirmLabel: "Confirm",
          danger: true,
        });
        result = new ToolMessage({
          tool_call_id: id,
          content: "Awaiting the user's confirmation in the UI. Do not retry; the answer arrives in the next message.",
        });
        handOff = true;
      } else {
        result = await executeTool(tool, id, parsed.value, ctx, recorder);
        if (tool.mode === "awaitUser") handOff = true;
      }
      messages.push(result);
      trace.push(result);
    }
    if (handOff) return { parts: recorder.parts, trace };
  }

  recorder.text("\n\n_I stopped here to avoid running too many steps. Tell me how you'd like to continue._");
  return { parts: recorder.parts, trace };
}
