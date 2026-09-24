"use client";

import type { ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type NativeProps = Omit<ComponentProps<"input">, "type" | "value" | "onChange">;

/** Numeric input bound to `number | null` (blank = null) instead of strings. */
export function NumberInput({
  value,
  onChange,
  className,
  ...props
}: NativeProps & { value: number | null | undefined; onChange: (value: number | null) => void }) {
  return (
    <Input
      {...props}
      type="number"
      inputMode="decimal"
      className={cn("tabular-nums", className)}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? null : e.target.valueAsNumber)}
    />
  );
}

/** Native date input bound to `YYYY-MM-DD | null`, themed for dark mode. */
export function DateInput({
  value,
  onChange,
  className,
  ...props
}: NativeProps & { value: string | null | undefined; onChange: (value: string | null) => void }) {
  return (
    <Input
      {...props}
      type="date"
      className={cn("tabular-nums dark:[color-scheme:dark]", className)}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
    />
  );
}
