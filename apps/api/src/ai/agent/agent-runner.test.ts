import { AIMessage, AIMessageChunk, HumanMessage, ToolMessage, type BaseMessage } from "@langchain/core/messages";
import type { Principal } from "@repo/contracts";
import { type } from "arktype";
import { describe, expect, it, vi } from "vitest";
import { AssistantModel } from "../model/assistant-model.js";
import { defineTool, type AssistantTool } from "../tools/tool-kit.js";
import { runAgentTurn, type AgentEvent } from "./agent-runner.js";
import { repairToolPairs } from "./history.js";

/** Replays one scripted response (a list of chunks) per model call. */
class ScriptedModel extends AssistantModel {
  readonly enabled = true;
  readonly calls: BaseMessage[][] = [];
  constructor(private readonly script: AIMessageChunk[][]) {
    super();
  }
  async stream(messages: BaseMessage[]) {
    this.calls.push([...messages]);
    const chunks = this.script.shift() ?? [new AIMessageChunk("")];
    return (async function* () {
      yield* chunks;
    })();
  }
}

const principal: Principal = { id: "u1", role: "ADMIN", memberProjectIds: [], managedProjectIds: [] };
const toolCall = (id: string, name: string, args: Record<string, unknown>) =>
  new AIMessageChunk({ content: "", tool_call_chunks: [{ id, name, args: JSON.stringify(args), index: 0, type: "tool_call_chunk" }] });

function run(model: AssistantModel, tools: AssistantTool[]) {
  const events: AgentEvent[] = [];
  const result = runAgentTurn({
    model,
    tools,
    messages: [new HumanMessage("hi")],
    context: { actor: { principal, origin: "ai" }, today: "2026-09-24" },
    signal: new AbortController().signal,
    onEvent: (e) => events.push(e),
  });
  return { events, result };
}

const echo = defineTool({
  name: "echo",
  label: "Echoing",
  description: "echo",
  schema: type({ value: "number" }),
  run: async (_ctx, { value }) => ({ doubled: value * 2 }),
});

describe("runAgentTurn", () => {
  it("streams a plain answer as text deltas merged into one part", async () => {
    const model = new ScriptedModel([[new AIMessageChunk("Hel"), new AIMessageChunk("lo")]]);
    const { events, result } = run(model, []);
    const { parts, trace } = await result;
    expect(events.filter((e) => e.type === "text.delta").map((e) => (e as { delta: string }).delta)).toEqual(["Hel", "lo"]);
    expect(parts).toEqual([{ type: "text", text: "Hello" }]);
    expect(trace).toHaveLength(1);
  });

  it("executes tools and feeds results back to the model", async () => {
    const model = new ScriptedModel([[toolCall("c1", "echo", { value: 21 })], [new AIMessageChunk("It is 42.")]]);
    const { events, result } = run(model, [echo]);
    const { parts, trace } = await result;

    expect(parts.map((p) => p.type)).toEqual(["tool", "text"]);
    expect(parts[0]).toMatchObject({ type: "tool", name: "echo", status: "success", label: "Echoing" });
    expect(events.map((e) => e.type)).toEqual(["tool.start", "tool.end", "text.delta"]);
    const toolResult = trace.find((m) => m instanceof ToolMessage) as ToolMessage;
    expect(toolResult.content).toBe('{"doubled":42}');
    expect(model.calls[1]!.at(-1)).toBeInstanceOf(ToolMessage);
  });

  it("reports invalid arguments to the model so it can retry", async () => {
    const spy = vi.fn(echo.run);
    const model = new ScriptedModel([
      [toolCall("c1", "echo", { value: "nope" })],
      [toolCall("c2", "echo", { value: 1 })],
      [new AIMessageChunk("ok")],
    ]);
    const { result } = run(model, [{ ...echo, run: spy }]);
    const { parts } = await result;
    expect(parts[0]).toMatchObject({ status: "error" });
    expect((parts[0] as { error: string }).error).toContain("Invalid arguments");
    expect(parts[1]).toMatchObject({ status: "success" });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("does not execute confirm-mode tools; asks the user and stops", async () => {
    const destroy = vi.fn();
    const dangerous = defineTool({
      name: "delete_thing",
      label: "Delete thing",
      description: "",
      mode: "confirm",
      schema: type({ id: "string" }),
      describe: ({ id }) => `Delete ${id}`,
      run: destroy,
    });
    const model = new ScriptedModel([[toolCall("c9", "delete_thing", { id: "t1" })], [new AIMessageChunk("never")]]);
    const { result } = run(model, [dangerous]);
    const { parts, trace } = await result;

    expect(destroy).not.toHaveBeenCalled();
    expect(model.calls).toHaveLength(1);
    expect(parts).toEqual([
      { type: "ui", block: expect.objectContaining({ kind: "confirm", id: "c9", description: "Delete t1" }) },
    ]);
    // The dangling tool call is answered so the transcript stays valid.
    expect(trace.at(-1)).toBeInstanceOf(ToolMessage);
  });

  it("stops after an awaitUser tool so the user can answer", async () => {
    const ask = defineTool({
      name: "ask_user",
      label: "Asking",
      description: "",
      mode: "awaitUser",
      schema: type({ title: "string" }),
      run: async ({ emit, callId }, { title }) => {
        emit({ kind: "form", id: callId, title, fields: [] });
        return { shown: true };
      },
    });
    const model = new ScriptedModel([[toolCall("f1", "ask_user", { title: "Details" })], [new AIMessageChunk("never")]]);
    const { result } = run(model, [ask]);
    const { parts } = await result;
    expect(model.calls).toHaveLength(1);
    expect(parts.map((p) => p.type)).toEqual(["tool", "ui"]);
    expect(parts[1]).toMatchObject({ block: { kind: "form", id: "f1" } });
  });
});

describe("repairToolPairs", () => {
  it("answers dangling tool calls", () => {
    const repaired = repairToolPairs([
      new AIMessage({ content: "", tool_calls: [{ id: "a", name: "x", args: {} }, { id: "b", name: "y", args: {} }] }),
      new ToolMessage({ tool_call_id: "a", content: "done" }),
      new HumanMessage("next"),
    ]);
    expect(repaired.map((m) => m.getType())).toEqual(["ai", "tool", "tool", "human"]);
    expect((repaired[2] as ToolMessage).tool_call_id).toBe("b");
  });
});
