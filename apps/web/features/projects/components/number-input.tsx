"use client";

import type { ComponentProps } from "react";
import { Input } from "@/components/ui/input";

/** A numeric input bound to `number | null`, where blank means null. */
export function NumberInput({
  value,
  onChange,
  ...props
}: Omit<ComponentProps<typeof Input>, "value" | "onChange" | "type"> & {
  value: number | null | undefined;
  onChange: (value: number | null) => void;
}) {
  return (
    <Input
      {...props}
      type="number"
      inputMode="decimal"
      value={value ?? ""}
      onChange={(e) => onChange(Number.isNaN(e.target.valueAsNumber) ? null : e.target.valueAsNumber)}
    />
  );
}
