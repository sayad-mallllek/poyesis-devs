import { describe, expect, it } from "vitest";
import {
  MAX_EXTRACTED_CHARS,
  contentDisposition,
  normalizeExtractedText,
  normalizeMimeType,
  sanitizeFileName,
  textKind,
} from "./attachment-files.js";

describe("attachment files", () => {
  it("sanitizes file names", () => {
    expect(sanitizeFileName("../../etc/passwd")).toBe("passwd");
    expect(sanitizeFileName("C:\\Users\\me\\brief.pdf")).toBe("brief.pdf");
    expect(sanitizeFileName("a\u0000b\nc.txt")).toBe("abc.txt");
    expect(sanitizeFileName("..")).toBe("file");
    const long = sanitizeFileName(`${"x".repeat(400)}.md`);
    expect(long).toHaveLength(255);
    expect(long.endsWith(".md")).toBe(true);
  });

  it("infers generic mime types from the extension", () => {
    expect(normalizeMimeType("application/octet-stream", "notes.MD")).toBe("text/markdown");
    expect(normalizeMimeType(undefined, "data.csv")).toBe("text/csv");
    expect(normalizeMimeType("Text/Plain; charset=utf-8", "x.bin")).toBe("text/plain");
    expect(normalizeMimeType("", "archive.zip")).toBe("application/octet-stream");
  });

  it("classifies extractable types", () => {
    expect(textKind("text/markdown")).toBe("text");
    expect(textKind("application/json")).toBe("text");
    expect(textKind("application/ld+json")).toBe("text");
    expect(textKind("application/pdf")).toBe("pdf");
    expect(textKind("image/png")).toBeNull();
  });

  it("normalizes and caps extracted text", () => {
    expect(normalizeExtractedText("a  \r\nb\n\n\n\nc\u0000")).toBe("a\nb\n\nc");
    expect(normalizeExtractedText(" \n ")).toBeNull();
    expect(normalizeExtractedText("x".repeat(MAX_EXTRACTED_CHARS + 10))).toHaveLength(MAX_EXTRACTED_CHARS);
  });

  it("builds RFC 6266 Content-Disposition headers", () => {
    expect(contentDisposition("report.pdf")).toBe(`attachment; filename="report.pdf"; filename*=UTF-8''report.pdf`);
    expect(contentDisposition('Budget "Q3" (final).xlsx')).toBe(
      `attachment; filename="Budget _Q3_ (final).xlsx"; filename*=UTF-8''Budget%20%22Q3%22%20%28final%29.xlsx`,
    );
    expect(contentDisposition("Café.txt")).toBe(`attachment; filename="Caf_.txt"; filename*=UTF-8''Caf%C3%A9.txt`);
  });
});
