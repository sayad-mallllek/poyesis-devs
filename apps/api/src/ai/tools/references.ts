import { BadRequestException, NotFoundException } from "@nestjs/common";

/**
 * Turns fuzzy references ("acme", "ACME-WEB", an email…) into exactly one
 * record, or explains to the model why it can't — listing candidates so it
 * can ask the user or retry with an id.
 */
export function pickOne<T>(
  candidates: T[],
  kind: string,
  reference: string,
  describe: (item: T) => string,
): T {
  if (candidates.length === 1) return candidates[0]!;
  if (candidates.length === 0) throw new NotFoundException(`No ${kind} matches "${reference}"`);
  throw new BadRequestException(
    `"${reference}" matches several ${kind}s: ${candidates.slice(0, 8).map(describe).join("; ")}. Use an id.`,
  );
}
