"use client";

import type { ReactNode } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { humanize } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Select over a contracts enum tuple, labelled with `humanize` unless `renderOption` says otherwise. */
export function EnumSelect<T extends string>({
  id,
  value,
  onChange,
  options,
  renderOption = humanize,
  className,
  size,
  "aria-label": ariaLabel,
  "aria-invalid": invalid,
}: {
  id?: string;
  value: T;
  onChange: (value: T) => void;
  options: readonly T[];
  renderOption?: (value: T) => ReactNode;
  className?: string;
  size?: "sm" | "default";
  "aria-label"?: string;
  "aria-invalid"?: boolean;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as T)}>
      <SelectTrigger id={id} size={size} aria-label={ariaLabel} aria-invalid={invalid} className={cn("w-full", className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {renderOption(option)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
