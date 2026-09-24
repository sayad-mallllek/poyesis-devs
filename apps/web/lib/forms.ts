import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import { ApiError } from "./api/client";

/**
 * Maps API validation issues (`{ "dotted.path": [messages] }`) onto form fields.
 * Returns true when at least one issue was attached to a field.
 */
export function applyServerErrors<T extends FieldValues>(form: UseFormReturn<T>, error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;
  let applied = false;
  for (const [path, messages] of Object.entries(error.issues)) {
    if (path === "_") continue;
    form.setError(path as Path<T>, { type: "server", message: messages.join(", ") });
    applied = true;
  }
  return applied;
}

/** Empty strings from inputs become `null` so optional columns are cleared, not set to "". */
export function emptyToNull<T extends Record<string, unknown>>(values: T): T {
  return Object.fromEntries(
    Object.entries(values).map(([k, v]) => [k, typeof v === "string" && v.trim() === "" ? null : v]),
  ) as T;
}
