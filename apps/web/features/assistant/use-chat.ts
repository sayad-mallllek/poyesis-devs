"use client";

import type { ChatAttachment, ChatMessage, ChatSession, MessagePart, SendChatMessageInput } from "@repo/contracts";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ApiError, errorMessage } from "@/lib/api/client";
import { assistantKeys, chatMessagesQuery } from "@/lib/api/assistant";
import { applyEvent, isMutatingTool, readEventStream } from "./stream";
import { usePageContext } from "./use-page-context";

interface StreamingTurn {
  sessionId: string;
  user: ChatMessage;
  parts: MessagePart[];
}

const DRAFT_ID = "streaming";

export type ChatPayload = Omit<SendChatMessageInput, "context" | "attachmentIds"> & { attachments?: ChatAttachment[] };

async function openStream(sessionId: string, body: SendChatMessageInput, signal: AbortSignal) {
  const response = await fetch(`/api/ai/sessions/${sessionId}/messages`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "text/event-stream" },
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok || !response.body) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new ApiError(response.status, { statusCode: response.status, error: "ERROR", ...error });
  }
  return response.body;
}

/**
 * Sends user turns and folds the SSE stream into a live assistant message.
 * Persisted messages live in the query cache; the in-flight turn is local.
 */
export function useChat(sessionId: string | null) {
  const queryClient = useQueryClient();
  const context = usePageContext();
  const [turn, setTurn] = useState<StreamingTurn | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const history = useQuery({ ...chatMessagesQuery(sessionId ?? ""), enabled: !!sessionId });

  // Only unmounting cancels: a turn keeps streaming into its own session even
  // if the user switches conversations (or a new session just got its id).
  useEffect(() => () => abortRef.current?.abort(), []);

  const send = useCallback(
    /** `targetId` may differ from the viewed session when a new one was just created. */
    async (targetId: string, { attachments = [], ...payload }: ChatPayload) => {
      if (abortRef.current) return;
      const sessionId = targetId;
      const controller = new AbortController();
      abortRef.current = controller;

      const parts: MessagePart[] = [];
      if (payload.content) parts.push({ type: "text", text: payload.content });
      if (payload.formResponse) parts.push({ type: "formResponse", ...payload.formResponse });
      for (const attachment of attachments) parts.push({ type: "attachment", attachment });
      let user: ChatMessage = { id: `${DRAFT_ID}-user`, sessionId, role: "user", parts, createdAt: new Date().toISOString() };
      setTurn({ sessionId, user, parts: [] });

      const toolNames = new Map<string, string>();
      let changedData = false;
      try {
        const attachmentIds = attachments.length ? attachments.map((a) => a.id) : undefined;
        const stream = await openStream(sessionId, { ...payload, attachmentIds, context }, controller.signal);
        for await (const event of readEventStream(stream)) {
          switch (event.type) {
            case "message.start":
              user = event.userMessage;
              setTurn((t) => t && { ...t, user });
              break;
            case "session.updated":
              queryClient.setQueryData<ChatSession[]>(assistantKeys.sessions(), (list) => [
                event.session,
                ...(list ?? []).filter((s) => s.id !== event.session.id),
              ]);
              break;
            case "message.end":
              queryClient.setQueryData<ChatMessage[]>(assistantKeys.messages(sessionId), (list) => [
                ...(list ?? []),
                user,
                event.message,
              ]);
              break;
            case "error":
              toast.error("The assistant hit an error", { description: event.message });
              break;
            default:
              if (event.type === "tool.start") toolNames.set(event.toolCallId, event.name);
              if (event.type === "tool.end" && event.status === "success") {
                changedData ||= isMutatingTool(toolNames.get(event.toolCallId) ?? "");
              }
              setTurn((t) => t && { ...t, parts: applyEvent(t.parts, event) });
          }
        }
      } catch (error) {
        if (!controller.signal.aborted) toast.error(errorMessage(error));
      } finally {
        abortRef.current = null;
        setTurn(null);
        // An interrupted turn is still persisted server-side; resync with it.
        if (controller.signal.aborted) {
          void queryClient.invalidateQueries({ queryKey: assistantKeys.messages(sessionId) });
        }
        // The assistant changed workspace data: every other screen may be stale.
        if (changedData) {
          void queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] !== assistantKeys.all[0] });
        }
      }
    },
    [context, queryClient],
  );

  const stop = useCallback(() => abortRef.current?.abort(), []);

  const messages = useMemo(() => {
    const persisted = history.data ?? [];
    if (!turn || turn.sessionId !== sessionId) return persisted;
    const draft: ChatMessage = {
      id: DRAFT_ID,
      sessionId: sessionId ?? "",
      role: "assistant",
      parts: turn.parts,
      createdAt: turn.user.createdAt,
    };
    return [...persisted, turn.user, draft];
  }, [history.data, sessionId, turn]);

  return {
    messages,
    isLoading: history.isPending && !!sessionId,
    /** Any turn in flight (sending is blocked until it finishes). */
    isStreaming: turn !== null,
    send,
    stop,
  };
}
