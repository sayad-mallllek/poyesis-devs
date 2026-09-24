"use client";

import { NOTE_TYPES, type NoteType } from "@repo/contracts";
import { NOTE_TONE, TONE_DOT } from "@/components/app/status-badges";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { humanize } from "@/lib/format";
import { cn } from "@/lib/utils";

export function NoteTypeSelect({
  value,
  onChange,
  className,
}: {
  value: NoteType;
  onChange: (type: NoteType) => void;
  className?: string;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as NoteType)}>
      <SelectTrigger className={cn("w-36", className)} aria-label="Note type">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {NOTE_TYPES.map((type) => (
          <SelectItem key={type} value={type}>
            <span className={cn("size-2 rounded-full", TONE_DOT[NOTE_TONE[type]])} />
            {humanize(type)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
