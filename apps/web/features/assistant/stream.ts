import type { ChatStreamEvent, MessagePart } from "@repo/contracts";

/** Applies one streaming event to the in-progress assistant parts (pure). */
export function applyEvent(parts: MessagePart[], event: ChatStreamEvent): MessagePart[] {
  switch (event.type) {
    case "text.delta": {
      const last = parts.at(-1);
      if (last?.type === "text") return [...parts.slice(0, -1), { ...last, text: last.text + event.delta }];
      return [...parts, { type: "text", text: event.delta }];
    }
    case "tool.start":
      return [
        ...parts,
        {
          type: "tool",
          toolCallId: event.toolCallId,
          name: event.name,
          label: event.label,
          args: event.args,
          status: "running",
        },
      ];
    case "tool.end":
      return parts.map((p) =>
        p.type === "tool" && p.toolCallId === event.toolCallId
          ? { ...p, status: event.status, ...(event.error && { error: event.error }) }
          : p,
      );
    case "ui":
      return [...parts, { type: "ui", block: event.block }];
    default:
      return parts;
  }
}

/** Parses a `text/event-stream` body into events; tolerant of chunk boundaries. */
export async function* readEventStream(body: ReadableStream<Uint8Array>): AsyncGenerator<ChatStreamEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let boundary: number;
      while ((boundary = buffer.indexOf("\n\n")) !== -1) {
        const frame = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        const data = frame
          .split("\n")
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trimStart())
          .join("\n");
        if (data) yield JSON.parse(data) as ChatStreamEvent;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/** Tools whose success means workspace data changed and cached queries are stale. */
export const isMutatingTool = (name: string) =>
  /^(create|update|delete|archive|add|remove|suspend|set|rate|post|link)_/.test(name);
