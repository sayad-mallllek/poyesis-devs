import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import type { ChatAttachment } from "@repo/contracts";
import type { Actor } from "../authz/actor.js";
import { notFound } from "../common/http/errors.js";
import type { Prisma } from "../generated/prisma/client.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { normalizeMimeType, sanitizeFileName } from "../projects/attachment-files.js";
import type { AttachmentDownload, UploadFile } from "../projects/attachments.service.js";
import { TextExtractorService } from "../projects/text-extractor.service.js";
import { createStorageKey } from "../storage/storage-keys.js";
import { StorageObjectNotFoundError, StorageService } from "../storage/storage.service.js";

/** Attachment content as handed to the model for one turn. */
export interface ChatAttachmentText extends ChatAttachment {
  text: string | null;
}

const select = {
  id: true,
  fileName: true,
  mimeType: true,
  sizeBytes: true,
  extractedText: true,
} as const satisfies Prisma.ChatAttachmentSelect;

/** Uploads never sent within this window are abandoned and swept. */
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

type Row = Prisma.ChatAttachmentGetPayload<{ select: typeof select }>;

const toAttachment = ({ extractedText, ...row }: Row): ChatAttachment => ({ ...row, hasText: extractedText !== null });

/**
 * Chat uploads belong to the user who made them. They are drafts until a sent
 * message claims them, and are deleted with that message's conversation.
 */
@Injectable()
export class ChatAttachmentsService {
  private readonly logger = new Logger(ChatAttachmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly extractor: TextExtractorService,
  ) {}

  async upload(actor: Actor, file: UploadFile | undefined): Promise<ChatAttachment> {
    if (!file) throw new BadRequestException("Attach a file");
    const userId = actor.principal.id;
    await this.sweepStaleDrafts(userId);

    const fileName = sanitizeFileName(file.fileName);
    const mimeType = normalizeMimeType(file.mimeType, fileName);
    const storageKey = createStorageKey("chat", userId, "attachments");
    const extractedText = await this.extractor.extract(file.data, mimeType, fileName);

    await this.storage.put(storageKey, file.data);
    try {
      const row = await this.prisma.chatAttachment.create({
        data: { userId, fileName, mimeType, sizeBytes: file.data.byteLength, storageKey, extractedText },
        select,
      });
      return toAttachment(row);
    } catch (error) {
      await this.deleteObjects([storageKey]);
      throw error;
    }
  }

  /** Only unsent drafts can be removed; sent ones go with their conversation. */
  async removeDraft(actor: Actor, id: string): Promise<void> {
    const row = await this.prisma.chatAttachment.findFirst({
      where: { id, userId: actor.principal.id, messageId: null },
      select: { storageKey: true },
    });
    if (!row) throw notFound("Attachment", id);
    await this.prisma.chatAttachment.delete({ where: { id } });
    await this.deleteObjects([row.storageKey]);
  }

  async download(actor: Actor, id: string): Promise<AttachmentDownload> {
    const row = await this.prisma.chatAttachment.findFirst({
      where: { id, userId: actor.principal.id },
      select: { fileName: true, mimeType: true, sizeBytes: true, storageKey: true },
    });
    if (!row) throw notFound("Attachment", id);
    try {
      return { ...row, stream: await this.storage.read(row.storageKey) };
    } catch (error) {
      if (error instanceof StorageObjectNotFoundError) {
        this.logger.error({ attachmentId: id, key: error.key }, "Chat attachment content is missing from storage");
        throw notFound("Attachment content", id);
      }
      throw error;
    }
  }

  /** The actor's unsent drafts among `ids`, in the given order; any other id is rejected. */
  async claimable(actor: Actor, ids: string[]): Promise<ChatAttachmentText[]> {
    const unique = [...new Set(ids)];
    if (!unique.length) return [];
    const rows = await this.prisma.chatAttachment.findMany({
      where: { id: { in: unique }, userId: actor.principal.id, messageId: null },
      select,
    });
    const byId = new Map(rows.map((row) => [row.id, row]));
    const missing = unique.find((id) => !byId.has(id));
    if (missing) throw new BadRequestException("An attachment is missing or was already sent");
    return unique.map((id) => {
      const row = byId.get(id)!;
      return { ...toAttachment(row), text: row.extractedText };
    });
  }

  /** Links drafts to the message that carries them; fails if any was claimed meanwhile. */
  async attach(tx: Prisma.TransactionClient, actor: Actor, ids: string[], messageId: string): Promise<void> {
    if (!ids.length) return;
    const { count } = await tx.chatAttachment.updateMany({
      where: { id: { in: ids }, userId: actor.principal.id, messageId: null },
      data: { messageId },
    });
    if (count !== ids.length) throw new BadRequestException("An attachment is missing or was already sent");
  }

  /** Storage keys of every attachment in a conversation, read before it is deleted. */
  async keysOfSession(sessionId: string): Promise<string[]> {
    const rows = await this.prisma.chatAttachment.findMany({
      where: { message: { sessionId } },
      select: { storageKey: true },
    });
    return rows.map((r) => r.storageKey);
  }

  private async sweepStaleDrafts(userId: string): Promise<void> {
    const where = { userId, messageId: null, createdAt: { lt: new Date(Date.now() - DRAFT_TTL_MS) } };
    const stale = await this.prisma.chatAttachment.findMany({ where, select: { id: true, storageKey: true } });
    if (!stale.length) return;
    await this.prisma.chatAttachment.deleteMany({ where: { id: { in: stale.map((s) => s.id) }, messageId: null } });
    await this.deleteObjects(stale.map((s) => s.storageKey));
  }

  async deleteObjects(keys: string[]): Promise<void> {
    await Promise.all(
      keys.map((key) =>
        this.storage.delete(key).catch((error: unknown) => {
          this.logger.warn({ err: error, key }, "Failed to delete storage object");
        }),
      ),
    );
  }
}
