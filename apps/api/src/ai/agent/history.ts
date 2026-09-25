import {
  AIMessage,
  HumanMessage,
  mapChatMessagesToStoredMessages,
  mapStoredMessagesToChatMessages,
  ToolMessage,
  type BaseMessage,
  type StoredMessage,
} from "@langchain/core/messages";
import { omitAttachmentBodies } from "./attachment-context.js";

/** Tool results older than the most recent turns are trimmed to save context. */
const RECENT_TURNS_KEPT_VERBATIM = 3;
const TRIMMED_TOOL_RESULT_CHARS = 1_500;
/** Attachment contents are large; only the previous turn's are replayed. */
const TURNS_WITH_ATTACHMENTS_KEPT = 1;

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

const withoutAttachmentBodies = (m: BaseMessage) =>
  m instanceof HumanMessage && typeof m.content === "string" && m.content.includes("<attachment ")
    ? new HumanMessage(omitAttachmentBodies(m.content))
    : m;

/** Flattens stored turns into model messages, trimming bulky old tool output and attachments. */
export function buildHistory(turnTraces: BaseMessage[][]): BaseMessage[] {
  const cutoff = turnTraces.length - RECENT_TURNS_KEPT_VERBATIM * 2;
  const attachmentCutoff = turnTraces.length - TURNS_WITH_ATTACHMENTS_KEPT * 2;
  const messages = turnTraces.flatMap((raw, index) => {
    const trace = index >= attachmentCutoff ? raw : raw.map(withoutAttachmentBodies);
    return index >= cutoff
      ? trace
      : trace.map((m) =>
          m instanceof ToolMessage && typeof m.content === "string" && m.content.length > TRIMMED_TOOL_RESULT_CHARS
            ? new ToolMessage({
                tool_call_id: m.tool_call_id,
                content: `${m.content.slice(0, TRIMMED_TOOL_RESULT_CHARS)}… [older result trimmed]`,
              })
            : m,
        );
  });
  return repairToolPairs(messages);
}
