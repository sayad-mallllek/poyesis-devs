"use client";

import { Eye, PencilLine } from "lucide-react";
import { useState, type ComponentProps } from "react";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Markdown } from "./markdown";

type Mode = "write" | "preview";

/** Markdown textarea with a Write / Preview toggle. */
export function MarkdownEditor({
  value,
  onChange,
  rows = 10,
  ...props
}: Omit<ComponentProps<typeof Textarea>, "value" | "onChange"> & {
  value: string | null | undefined;
  onChange: (value: string) => void;
}) {
  const [mode, setMode] = useState<Mode>("write");

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">Markdown supported: headings, lists, tables, links.</span>
        <ToggleGroup
          type="single"
          size="sm"
          variant="outline"
          value={mode}
          onValueChange={(v) => v && setMode(v as Mode)}
          aria-label="Editor mode"
        >
          <ToggleGroupItem value="write" className="px-2.5 text-xs">
            <PencilLine /> Write
          </ToggleGroupItem>
          <ToggleGroupItem value="preview" className="px-2.5 text-xs">
            <Eye /> Preview
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      {mode === "write" ? (
        <Textarea
          {...props}
          rows={rows}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className="font-mono text-[13px] leading-relaxed"
        />
      ) : (
        <div className="min-h-40 rounded-md border bg-muted/20 px-3 py-2">
          {value?.trim() ? (
            <Markdown>{value}</Markdown>
          ) : (
            <p className="text-sm text-muted-foreground">Nothing to preview yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
