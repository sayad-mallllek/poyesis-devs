import {
  AIMessage,
  mapChatMessagesToStoredMessages,
  mapStoredMessagesToChatMessages,
  ToolMessage,
  type BaseMessage,
  type StoredMessage,
} from "@langchain/core/messages";

/** Tool results older than the most recent turns are trimmed to save context. */
const RECENT_TURNS_KEPT_VERBATIM = 3;
const TRIMMED_TOOL_RESULT_CHARS = 1_500;

export const serializeTrace = (messages: BaseMessage[]) => mapChatMessagesToStoredMessages(messages);

export function deserializeTrace(trace: unknown): BaseMessage[] {
  if (!Array.isArray(trace)) return [];
  return mapStoredMessagesToChatMessages(trace as StoredMessage[]);
}

/**
 * Chat-completion APIs reject an assistant tool call without a matching tool
 * result. Turns can be interrupted mid-call (client abort, crash), so answer
 * any dangling call with a synthetic "cancelled" result.
 */
export function repairToolPairs(messages: BaseMessage[]): BaseMessage[] {
  const repaired: BaseMessage[] = [];
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i]!;
    repaired.push(message);
    if (!(message instanceof AIMessage) || !message.tool_calls?.length) continue;

    const answered = new Set<string>();
    let j = i + 1;
    while (j < messages.length && messages[j] instanceof ToolMessage) {
      answered.add((messages[j] as ToolMessage).tool_call_id);
      repaired.push(messages[j]!);
      j++;
    }
    for (const call of message.tool_calls) {
      if (call.id && !answered.has(call.id)) {
        repaired.push(new ToolMessage({ tool_call_id: call.id, content: "Cancelled before completion.", status: "error" }));
      }
    }
    i = j - 1;
  }
  return repaired;
}

/** Flattens stored turns into model messages, trimming bulky old tool output. */
export function buildHistory(turnTraces: BaseMessage[][]): BaseMessage[] {
  const cutoff = turnTraces.length - RECENT_TURNS_KEPT_VERBATIM * 2;
  const messages = turnTraces.flatMap((trace, index) =>
    index >= cutoff
      ? trace
      : trace.map((m) =>
          m instanceof ToolMessage && typeof m.content === "string" && m.content.length > TRIMMED_TOOL_RESULT_CHARS
            ? new ToolMessage({
                tool_call_id: m.tool_call_id,
                content: `${m.content.slice(0, TRIMMED_TOOL_RESULT_CHARS)}… [older result trimmed]`,
              })
            : m,
        ),
  );
  return repairToolPairs(messages);
}
