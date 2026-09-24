"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/** Project identity colors: distinct hues that read on both light and dark surfaces. */
export const PROJECT_COLORS = [
  { value: "#4f46e5", name: "Indigo" },
  { value: "#0ea5e9", name: "Sky" },
  { value: "#14b8a6", name: "Teal" },
  { value: "#22c55e", name: "Green" },
  { value: "#eab308", name: "Amber" },
  { value: "#f97316", name: "Orange" },
  { value: "#ef4444", name: "Red" },
  { value: "#ec4899", name: "Pink" },
  { value: "#a855f7", name: "Purple" },
  { value: "#64748b", name: "Slate" },
] as const;

export function ColorSwatches({
  id,
  value,
  onChange,
}: {
  id?: string;
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <div id={id} role="radiogroup" aria-label="Project color" className="flex flex-wrap gap-2">
      {PROJECT_COLORS.map((color) => {
        const selected = value.toLowerCase() === color.value;
        return (
          <button
            key={color.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={color.name}
            title={color.name}
            onClick={() => onChange(color.value)}
            className={cn(
              "flex size-7 items-center justify-center rounded-full ring-offset-2 ring-offset-background transition-shadow outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selected && "ring-2 ring-foreground/70",
            )}
            style={{ backgroundColor: color.value }}
          >
            {selected && <Check className="size-3.5 text-white" strokeWidth={3} />}
          </button>
        );
      })}
    </div>
  );
}
