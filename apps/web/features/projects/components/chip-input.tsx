"use client";

import { X } from "lucide-react";
import { useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

/** Free-form list of short labels (tags, technologies). Enter or comma adds; Backspace on empty removes the last. */
export function ChipInput({
  id,
  value,
  onChange,
  placeholder,
  suggestions = [],
  max,
  maxLength = 40,
  "aria-invalid": invalid,
}: {
  id?: string;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  suggestions?: readonly string[];
  max?: number;
  maxLength?: number;
  "aria-invalid"?: boolean;
}) {
  const [draft, setDraft] = useState("");
  const full = max !== undefined && value.length >= max;

  const add = (raw: string) => {
    const label = raw.trim().slice(0, maxLength);
    if (!label || full || value.some((v) => v.toLowerCase() === label.toLowerCase())) return;
    onChange([...value, label]);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      add(draft);
      setDraft("");
    } else if (event.key === "Backspace" && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  const remaining = suggestions.filter((s) => !value.some((v) => v.toLowerCase() === s.toLowerCase()));

  return (
    <div className="space-y-2">
      <div
        className={cn(
          "flex min-h-9 w-full flex-wrap items-center gap-1.5 rounded-md border border-input bg-transparent px-2 py-1.5 shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 dark:bg-input/30",
          invalid && "border-destructive ring-destructive/20",
        )}
      >
        {value.map((chip) => (
          <span
            key={chip}
            className="inline-flex items-center gap-1 rounded-md bg-secondary py-0.5 pr-1 pl-2 text-xs font-medium text-secondary-foreground"
          >
            {chip}
            <button
              type="button"
              onClick={() => onChange(value.filter((v) => v !== chip))}
              className="rounded-sm p-0.5 text-muted-foreground hover:bg-background hover:text-foreground"
            >
              <X className="size-3" />
              <span className="sr-only">Remove {chip}</span>
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          disabled={full}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => {
            add(draft);
            setDraft("");
          }}
          placeholder={value.length ? undefined : placeholder}
          aria-invalid={invalid}
          className="h-6 min-w-24 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
        />
      </div>
      {remaining.length > 0 && !full && (
        <div className="flex flex-wrap gap-1.5" aria-label="Suggestions">
          {remaining.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="rounded-md border border-dashed px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:border-solid hover:bg-accent hover:text-accent-foreground"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
