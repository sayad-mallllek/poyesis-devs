import { Injectable, Logger } from "@nestjs/common";
import { extractText } from "unpdf";
import { normalizeExtractedText, textKind } from "./attachment-files.js";

/** Pulls plain text out of uploads so the AI assistant can use them as context. */
@Injectable()
export class TextExtractorService {
  private readonly logger = new Logger(TextExtractorService.name);

  /** Never throws: extraction is best-effort and must not fail an upload. */
  async extract(data: Buffer, mimeType: string, fileName: string): Promise<string | null> {
    const kind = textKind(mimeType);
    if (!kind) return null;
    try {
      const text = kind === "pdf" ? await this.fromPdf(data) : new TextDecoder("utf-8").decode(data);
      return normalizeExtractedText(text);
    } catch (error) {
      this.logger.warn({ err: error, fileName, mimeType }, "Text extraction failed");
      return null;
    }
  }

  private async fromPdf(data: Buffer): Promise<string> {
    // pdf.js may detach the buffer it is given, so hand it a copy.
    const { text } = await extractText(new Uint8Array(data), { mergePages: true });
    return text;
  }
}
