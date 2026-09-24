import { extname } from "node:path";

/** Upper bound of text kept per attachment for AI context. */
export const MAX_EXTRACTED_CHARS = 200_000;
const MAX_FILE_NAME_LENGTH = 255;
const GENERIC_MIME_TYPES = new Set(["", "application/octet-stream", "binary/octet-stream"]);

const MIME_BY_EXTENSION: Record<string, string> = {
  ".txt": "text/plain",
  ".md": "text/markdown",
  ".markdown": "text/markdown",
  ".csv": "text/csv",
  ".tsv": "text/tab-separated-values",
  ".json": "application/json",
  ".pdf": "application/pdf",
};

const TEXT_MIME_TYPES = new Set(["application/json", "application/x-ndjson", "application/csv", "application/markdown"]);

/** Keeps only the base name, without control characters, within a sane length. */
export function sanitizeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  // eslint-disable-next-line no-control-regex -- stripping control characters is the point
  const clean = base.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  if (!clean || clean === "." || clean === "..") return "file";
  if (clean.length <= MAX_FILE_NAME_LENGTH) return clean;
  const ext = extname(clean).slice(0, 16);
  return clean.slice(0, MAX_FILE_NAME_LENGTH - ext.length) + ext;
}

/** Browsers often send `application/octet-stream` for `.md`/`.csv`; infer from the extension then. */
export function normalizeMimeType(declared: string | undefined, fileName: string): string {
  const mime = (declared ?? "").split(";")[0]!.trim().toLowerCase();
  if (!GENERIC_MIME_TYPES.has(mime)) return mime;
  return MIME_BY_EXTENSION[extname(fileName).toLowerCase()] ?? "application/octet-stream";
}

export type TextKind = "text" | "pdf" | null;

export function textKind(mimeType: string): TextKind {
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.startsWith("text/") || TEXT_MIME_TYPES.has(mimeType) || mimeType.endsWith("+json")) return "text";
  return null;
}

/** Collapses excess whitespace and caps the length; `null` when nothing useful remains. */
export function normalizeExtractedText(text: string): string | null {
  const normalized = text
    // eslint-disable-next-line no-control-regex -- NUL bytes break Postgres text columns
    .replace(/\u0000/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return normalized ? normalized.slice(0, MAX_EXTRACTED_CHARS) : null;
}

/**
 * RFC 6266 `Content-Disposition`: an ASCII `filename` fallback plus an RFC 5987
 * `filename*` carrying the exact UTF-8 name.
 */
export function contentDisposition(fileName: string, type: "attachment" | "inline" = "attachment"): string {
  const fallback = fileName.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  const encoded = encodeURIComponent(fileName).replace(
    /['()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `${type}; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}
