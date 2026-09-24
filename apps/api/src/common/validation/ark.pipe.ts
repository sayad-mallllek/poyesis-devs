import { BadRequestException, type PipeTransform } from "@nestjs/common";
import { type, type Type } from "arktype";

/** Converts ArkType errors into `{ "dotted.path": ["message"] }`. */
export function issuesFromArk(errors: type.errors): Record<string, string[]> {
  const issues: Record<string, string[]> = {};
  for (const error of errors) {
    const key = error.path.length ? error.path.join(".") : "_";
    (issues[key] ??= []).push(error.message);
  }
  return issues;
}

export class ValidationException extends BadRequestException {
  constructor(readonly issues: Record<string, string[]>) {
    super({ message: "Validation failed", issues });
  }
}

/** Validates (and morphs) an input against an ArkType schema. */
export function validate<T extends Type>(schema: T, input: unknown): T["infer"] {
  const out = schema(input);
  if (out instanceof type.errors) throw new ValidationException(issuesFromArk(out));
  return out as T["infer"];
}

class ArkValidationPipe<T extends Type> implements PipeTransform<unknown, T["infer"]> {
  constructor(private readonly schema: T) {}
  transform(value: unknown): T["infer"] {
    return validate(this.schema, value ?? {});
  }
}

/**
 * Parameter pipe: `@Body(ark(createProjectSchema)) input: CreateProjectInput`.
 * The same schemas are used by the web app's forms, so client and server agree.
 */
export const ark = <T extends Type>(schema: T) => new ArkValidationPipe(schema);
