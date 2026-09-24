import type { FieldError, FieldValues, Resolver } from "react-hook-form";

/** Replaces schema wording for blank required fields (e.g. "projectId must be non-empty") with human messages. */
export function withMessages<T extends FieldValues>(
  resolver: Resolver<T>,
  messages: Partial<Record<keyof T & string, string>>,
): Resolver<T> {
  return async (values, context, options) => {
    const result = await resolver(values, context, options);
    const errors = result.errors as Record<string, FieldError | undefined>;
    for (const [name, message] of Object.entries(messages)) {
      const error = errors[name];
      if (error && message && !values[name]) error.message = message;
    }
    return result;
  };
}
