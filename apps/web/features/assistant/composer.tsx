"use client";

import { ArrowUp, Square } from "lucide-react";
import { useRef, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";

export function Composer({
  onSend,
  onStop,
  isStreaming,
  disabled,
}: {
  onSend: (text: string) => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
}) {
  const [text, setText] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  const submit = () => {
    const value = text.trim();
    if (!value || isStreaming || disabled) return;
    onSend(value);
    setText("");
    requestAnimationFrame(() => ref.current?.focus());
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <form
      className="border-t bg-background p-3"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="flex items-end gap-2 rounded-xl border bg-card p-2 shadow-xs focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/30">
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
          placeholder={disabled ? "The assistant is not configured" : "Ask anything, or tell me what to do…"}
          className="field-sizing-content max-h-40 min-h-9 flex-1 resize-none bg-transparent px-1.5 py-1.5 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
        />
        {isStreaming ? (
          <Button type="button" size="icon" variant="secondary" className="size-8 shrink-0 rounded-lg" onClick={onStop}>
            <Square className="size-3.5 fill-current" />
            <span className="sr-only">Stop</span>
          </Button>
        ) : (
          <Button type="submit" size="icon" className="size-8 shrink-0 rounded-lg" disabled={!text.trim() || disabled}>
            <ArrowUp />
            <span className="sr-only">Send</span>
          </Button>
        )}
      </div>
      <p className="mt-1.5 px-1 text-[11px] text-muted-foreground">
        Actions run with your permissions. Destructive ones ask for confirmation.
      </p>
    </form>
  );
}
