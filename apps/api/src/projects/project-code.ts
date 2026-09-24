/** Mirrors the contract's `code` pattern: `^[A-Z][A-Z0-9-]{1,19}$`. */
export const MAX_CODE_LENGTH = 20;
const FALLBACK_CODE = "PRJ";
/** Room reserved for suffixes up to `-999` when querying existing codes. */
const MAX_SUFFIX_LENGTH = 4;

const trimDashes = (value: string) => value.replace(/^-+|-+$/g, "");

/** "Acme Website" → "ACME-WEBSITE"; accents are folded, other symbols become dashes. */
export function baseCodeFromName(name: string): string {
  const slug = trimDashes(
    name
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-"),
  );
  const prefixed = /^[0-9]/.test(slug) ? `P-${slug}` : slug;
  const code = trimDashes(prefixed.slice(0, MAX_CODE_LENGTH));
  return code.length >= 2 ? code : FALLBACK_CODE;
}

/** The n-th candidate for a base: n = 1 is the base itself, then `BASE-2`, `BASE-3`… */
export function codeCandidate(base: string, n: number): string {
  if (n <= 1) return base;
  const suffix = `-${n}`;
  return `${trimDashes(base.slice(0, MAX_CODE_LENGTH - suffix.length))}${suffix}`;
}

/** Every candidate for `base` starts with this, so one `startsWith` query finds all collisions. */
export const codeSearchPrefix = (base: string) =>
  trimDashes(base.slice(0, MAX_CODE_LENGTH - MAX_SUFFIX_LENGTH));

export function nextAvailableCode(base: string, taken: ReadonlySet<string>): string {
  for (let n = 1; ; n++) {
    const candidate = codeCandidate(base, n);
    if (!taken.has(candidate)) return candidate;
  }
}
