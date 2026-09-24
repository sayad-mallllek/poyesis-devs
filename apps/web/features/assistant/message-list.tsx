"use client";

import type { ChatMessage, MessagePart } from "@repo/contracts";
import { CheckCircle2, CircleAlert, ClipboardCheck, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { UiBlockView } from "./blocks/ui-block";
import type { BlockAnswer, RespondToBlock } from "./blocks/types";
import { Markdown } from "./markdown";

type ToolPart = Extract<MessagePart, { type: "tool" }>;

/** Presentation tools speak through the block they render; only failures are worth a chip. */
const isPresentationTool = (name: string) => name.startsWith("render_") || name === "ask_user";

function ToolStatus({ part }: { part: ToolPart }) {
  return (
    <div
      className={cn(
        "flex w-fit max-w-full items-center gap-1.5 rounded-full border bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground",
        part.status === "error" && "border-destructive/30 text-destructive",
      )}
      title={part.error}
    >
      {part.status === "running" ? (
        <Spinner className="size-3" />
      ) : part.status === "success" ? (
        <CheckCircle2 className="size-3 text-success" />
      ) : (
        <CircleAlert className="size-3" />
      )}
      <span className="truncate">
        {part.label}
        {part.status === "running" && "…"}
        {part.status === "error" && part.error && ` — ${part.error}`}
      </span>
    </div>
  );
}

function AssistantMessage({
  message,
  answers,
  onRespond,
  streaming,
}: {
  message: ChatMessage;
  answers: Map<string, BlockAnswer>;
  onRespond: RespondToBlock;
  streaming: boolean;
}) {
  if (streaming && message.parts.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner className="size-3.5" /> Thinking…
      </div>
    );
  }
  return (
    <div className="space-y-2.5">
      {message.parts.map((part, i) => {
        switch (part.type) {
          case "text":
            return <Markdown key={i} text={part.text} />;
          case "tool":
            return isPresentationTool(part.name) && part.status !== "error" ? null : (
              <ToolStatus key={part.toolCallId} part={part} />
            );
          case "ui":
            return (
              <UiBlockView
                key={i}
                block={part.block}
                answer={"id" in part.block ? answers.get(part.block.id) : undefined}
                onRespond={onRespond}
              />
            );
          default:
            return null;
        }
      })}
    </div>
  );
}

function UserMessage({ message }: { message: ChatMessage }) {
  return (
    <div className="flex flex-col items-end gap-1.5">
      {message.parts.map((part, i) =>
        part.type === "text" ? (
          <div key={i} className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-sm whitespace-pre-wrap text-primary-foreground">
            {part.text}
          </div>
        ) : part.type === "formResponse" ? (
          <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ClipboardCheck className="size-3.5" />
            {part.values === null ? "Skipped the form" : "confirmed" in part.values ? (part.values.confirmed ? "Confirmed" : "Declined") : "Answered the form"}
          </div>
        ) : null,
      )}
    </div>
  );
}

export function MessageList({
  messages,
  isStreaming,
  onRespond,
  empty,
}: {
  messages: ChatMessage[];
  isStreaming: boolean;
  onRespond: RespondToBlock;
  empty: React.ReactNode;
}) {
  const endRef = useRef<HTMLDivElement>(null);

  const answers = useMemo(() => {
    const map = new Map<string, BlockAnswer>();
    for (const message of messages) {
      for (const part of message.parts) if (part.type === "formResponse") map.set(part.formId, part.values);
    }
    return map;
  }, [messages]);

  // Follow the conversation as it grows, including while text streams in.
  const last = messages.at(-1);
  const tail = last?.parts.at(-1);
  const scrollKey = `${messages.length}:${last?.parts.length ?? 0}:${tail?.type === "text" ? tail.text.length : ""}`;
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [scrollKey]);

  if (messages.length === 0) return <>{empty}</>;

  return (
    <div className="space-y-5 px-4 py-4">
      {messages.map((message, index) =>
        message.role === "user" ? (
          <UserMessage key={message.id} message={message} />
        ) : (
          <div key={message.id} className="flex gap-2.5">
            <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Sparkles className="size-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <AssistantMessage
                message={message}
                answers={answers}
                // Only the latest turn's forms can be answered, and not mid-stream.
                onRespond={!isStreaming && index === messages.length - 1 ? onRespond : undefined}
                streaming={isStreaming && index === messages.length - 1}
              />
            </div>
          </div>
        ),
      )}
      <div ref={endRef} />
    </div>
  );
}
