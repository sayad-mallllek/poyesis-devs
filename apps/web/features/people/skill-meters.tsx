"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export const LEVEL_LABELS = ["Novice", "Beginner", "Competent", "Proficient", "Expert"] as const;
const SCALE = [1, 2, 3, 4, 5] as const;

export const levelLabel = (level: number): string => LEVEL_LABELS[Math.min(Math.max(Math.round(level), 1), 5) - 1] ?? LEVEL_LABELS[0];

/** Read-only self-assessment meter: five segments, filled up to the level. */
export function LevelMeter({ level, className }: { level: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="flex gap-0.5" role="img" aria-label={`Level ${level} of 5 (${levelLabel(level)})`}>
        {SCALE.map((n) => (
          <span key={n} className={cn("h-2 w-4 rounded-full", n <= level ? "bg-primary" : "bg-muted")} />
        ))}
      </span>
      <span className="text-xs text-muted-foreground">{levelLabel(level)}</span>
    </span>
  );
}

/** Segmented 1–5 picker with the level names, keyboard-usable as a radio group. */
export function LevelPicker({ value, onChange, id }: { value: number; onChange: (level: number) => void; id?: string }) {
  return (
    <div id={id} role="radiogroup" className="grid grid-cols-5 gap-1">
      {SCALE.map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          onClick={() => onChange(n)}
          className={cn(
            "flex flex-col items-center gap-1 rounded-md border px-1 py-2 text-xs transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
            n <= value ? "border-primary/40 bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent",
            value === n && "border-primary bg-primary/15 font-medium",
          )}
        >
          <span className="text-sm font-semibold tabular-nums">{n}</span>
          <span className="truncate">{LEVEL_LABELS[n - 1]}</span>
        </button>
      ))}
    </div>
  );
}

export function StarRating({ value, className }: { value: number | null | undefined; className?: string }) {
  if (!value) return <span className={cn("text-xs text-muted-foreground", className)}>Not rated</span>;
  return (
    <span className={cn("inline-flex gap-0.5", className)} role="img" aria-label={`Rated ${value} of 5`}>
      {SCALE.map((n) => (
        <Star key={n} className={cn("size-3.5", n <= value ? "fill-warning text-warning" : "text-muted-foreground/30")} />
      ))}
    </span>
  );
}

export function StarInput({ value, onChange }: { value: number | null; onChange: (value: number | null) => void }) {
  return (
    <div role="radiogroup" aria-label="Rating" className="flex gap-1">
      {SCALE.map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          // Clicking the current rating clears it, since the API accepts null.
          onClick={() => onChange(value === n ? null : n)}
          className="rounded-sm p-0.5 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <Star
            className={cn(
              "size-7 transition-colors",
              value && n <= value ? "fill-warning text-warning" : "text-muted-foreground/40 hover:text-warning",
            )}
          />
        </button>
      ))}
    </div>
  );
}
