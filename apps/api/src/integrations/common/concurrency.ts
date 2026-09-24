import type { Logger } from "@nestjs/common";

/** `Promise.all(items.map(fn))` with at most `limit` calls in flight; preserves order. */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]!);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/**
 * Runs `fn` for every source and flattens the results, skipping (and logging)
 * sources that fail so one broken link does not hide the others. When every
 * source fails the first error is rethrown: an empty list would otherwise
 * mask a misconfiguration such as a revoked token.
 */
export async function collectAcross<T, R>(
  sources: readonly T[],
  fn: (source: T) => Promise<R[]>,
  { limit, logger, describe }: { limit: number; logger: Logger; describe: (source: T) => string },
): Promise<R[]> {
  const settled = await mapWithConcurrency(sources, limit, (source) =>
    fn(source).then(
      (value) => ({ ok: true as const, value }),
      (error: unknown) => ({ ok: false as const, error, source }),
    ),
  );
  const failures = settled.filter((s) => !s.ok);
  for (const failure of failures) {
    logger.warn({ err: failure.error }, `Skipping ${describe(failure.source)}`);
  }
  if (failures.length && failures.length === sources.length) throw failures[0]!.error;
  return settled.flatMap((s) => (s.ok ? s.value : []));
}
