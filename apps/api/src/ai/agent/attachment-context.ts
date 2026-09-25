/** Total attachment text handed to the model in one turn (~30k tokens). */
export const TURN_ATTACHMENT_CHAR_BUDGET = 120_000;

export interface AttachmentForModel {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  text: string | null;
}

const escapeAttr = (value: string) => value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/**
 * Splits the budget fairly: short files are kept whole and what they leave
 * unused goes to the longer ones.
 */
export function allocateBudget(lengths: number[], budget: number): number[] {
  const order = lengths.map((length, index) => ({ length, index })).sort((a, b) => a.length - b.length);
  const allocation = new Array<number>(lengths.length).fill(0);
  let remaining = budget;
  order.forEach(({ length, index }, i) => {
    const share = Math.floor(remaining / (order.length - i));
    allocation[index] = Math.min(length, share);
    remaining -= allocation[index]!;
  });
  return allocation;
}

/** One `<attachment>` element per file, as the model sees them. */
export function describeAttachments(files: AttachmentForModel[], budget = TURN_ATTACHMENT_CHAR_BUDGET): string {
  const allocation = allocateBudget(
    files.map((f) => f.text?.length ?? 0),
    budget,
  );
  return files
    .map((file, i) => {
      const attrs = `name="${escapeAttr(file.fileName)}" type="${escapeAttr(file.mimeType)}" bytes="${file.sizeBytes}"`;
      if (!file.text) return `<attachment ${attrs} readable="false">No text could be extracted from this file.</attachment>`;
      const kept = allocation[i]!;
      const body = kept < file.text.length ? `${file.text.slice(0, kept)}\n… [truncated: file too long]` : file.text;
      return `<attachment ${attrs}>\n${body}\n</attachment>`;
    })
    .join("\n\n");
}

const ATTACHMENT_ELEMENT = /<attachment ([^>]*)>[\s\S]*?<\/attachment>/g;

/** Keeps which files were attached but drops their content (for older turns). */
export const omitAttachmentBodies = (content: string) =>
  content.replace(ATTACHMENT_ELEMENT, "<attachment $1>[content omitted from an older turn]</attachment>");
