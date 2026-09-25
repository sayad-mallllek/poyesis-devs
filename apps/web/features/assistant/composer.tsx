"use client";

import { MAX_CHAT_ATTACHMENT_BYTES, MAX_CHAT_ATTACHMENTS, type ChatAttachment } from "@repo/contracts";
import { ArrowUp, Paperclip, Square } from "lucide-react";
import { useRef, useState, type ClipboardEvent, type DragEvent, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";
import { DraftAttachmentChip } from "./attachment-chip";
import { useAttachments } from "./use-attachments";

const hasFiles = (event: DragEvent) => event.dataTransfer.types.includes("Files");

export function Composer({
  onSend,
  onStop,
  isStreaming,
  disabled,
}: {
  onSend: (text: string, attachments: ChatAttachment[]) => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
}) {
  const [text, setText] = useState("");
  const [dragging, setDragging] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const attachments = useAttachments();

  const canSend = (!!text.trim() || attachments.ready.length > 0) && !attachments.isUploading && !disabled;
  const full = attachments.drafts.length >= MAX_CHAT_ATTACHMENTS;

  const submit = () => {
    if (!canSend || isStreaming) return;
    onSend(text.trim(), attachments.ready);
    setText("");
    attachments.clear();
    requestAnimationFrame(() => ref.current?.focus());
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  };

  const onPaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const files = Array.from(event.clipboardData.files);
    if (!files.length || disabled) return;
    event.preventDefault();
    attachments.add(files);
  };

  const onDrop = (event: DragEvent) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    setDragging(false);
    if (!disabled) attachments.add(Array.from(event.dataTransfer.files));
  };

  return (
    <form
      className="border-t bg-background p-3"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      onDragOver={(e) => {
        if (!hasFiles(e) || disabled) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
      }}
      onDrop={onDrop}
    >
      <div
        className={cn(
          "rounded-xl border bg-card p-2 shadow-xs focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/30",
          dragging && "border-primary bg-primary/5 ring-[3px] ring-primary/20",
        )}
      >
        {attachments.drafts.length > 0 && (
          <ul className="mb-2 flex max-h-32 flex-wrap gap-1.5 overflow-y-auto" aria-label="Attachments">
            {attachments.drafts.map((draft) => (
              <li key={draft.key} className="min-w-0">
                <DraftAttachmentChip draft={draft} onRemove={() => attachments.remove(draft.key)} />
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-end gap-2">
          <input
            ref={fileInput}
            type="file"
            multiple
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(e) => {
              attachments.add(Array.from(e.target.files ?? []));
              e.target.value = "";
            }}
          />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-8 shrink-0 rounded-lg text-muted-foreground"
                disabled={disabled || full}
                onClick={() => fileInput.current?.click()}
              >
                <Paperclip />
                <span className="sr-only">Attach files</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {full
                ? `Up to ${MAX_CHAT_ATTACHMENTS} files per message`
                : `Attach files (up to ${MAX_CHAT_ATTACHMENTS}, ${formatBytes(MAX_CHAT_ATTACHMENT_BYTES)} each)`}
            </TooltipContent>
          </Tooltip>
          <label htmlFor="assistant-input" className="sr-only">
            Message the assistant
          </label>
          <textarea
            id="assistant-input"
            ref={ref}
            rows={1}
            value={text}
            disabled={disabled}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            placeholder={disabled ? "The assistant is not configured" : "Ask anything, or tell me what to do…"}
            className="field-sizing-content max-h-40 min-h-9 flex-1 resize-none bg-transparent px-1.5 py-1.5 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
          />
          {isStreaming ? (
            <Button type="button" size="icon" variant="secondary" className="size-8 shrink-0 rounded-lg" onClick={onStop}>
              <Square className="size-3.5 fill-current" />
              <span className="sr-only">Stop</span>
            </Button>
          ) : (
            <Button type="submit" size="icon" className="size-8 shrink-0 rounded-lg" disabled={!canSend}>
              <ArrowUp />
              <span className="sr-only">{attachments.isUploading ? "Waiting for uploads" : "Send"}</span>
            </Button>
          )}
        </div>
      </div>
      <p className="mt-1.5 px-1 text-[11px] text-muted-foreground">
        Actions run with your permissions. Destructive ones ask for confirmation.
      </p>
    </form>
  );
}
