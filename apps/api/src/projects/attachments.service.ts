import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import type { Attachment } from "@repo/contracts";
import { createHash } from "node:crypto";
import type { Readable } from "node:stream";
import { AuditService } from "../audit/audit.service.js";
import type { Actor } from "../authz/actor.js";
import { AuthzService } from "../authz/authz.service.js";
import { notFound } from "../common/http/errors.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { createStorageKey } from "../storage/storage-keys.js";
import { StorageObjectNotFoundError, StorageService } from "../storage/storage.service.js";
import { normalizeMimeType, sanitizeFileName } from "./attachment-files.js";
import { requireActiveProject } from "./project-lookup.js";
import { attachmentSelect, toAttachment } from "./project.serializers.js";
import { TextExtractorService } from "./text-extractor.service.js";

export interface UploadFile {
  fileName: string;
  mimeType?: string;
  data: Buffer;
}

export interface AttachmentDownload {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  stream: Readable;
}

/** Attachment text, as fed to the AI assistant. */
export interface AttachmentText {
  id: string;
  fileName: string;
  mimeType: string;
  text: string | null;
}

@Injectable()
export class AttachmentsService {
  private readonly logger = new Logger(AttachmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly authz: AuthzService,
    private readonly audit: AuditService,
    private readonly storage: StorageService,
    private readonly extractor: TextExtractorService,
  ) {}

  /** Newest first. */
  async list(actor: Actor, projectId: string): Promise<Attachment[]> {
    this.authz.assert(actor.principal, "read", "Attachment", { projectId });
    await requireActiveProject(this.prisma, projectId);
    const [rows, withText] = await Promise.all([
      this.prisma.projectAttachment.findMany({
        where: { projectId },
        select: attachmentSelect,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.projectAttachment.findMany({
        where: { projectId, extractedText: { not: null } },
        select: { id: true },
      }),
    ]);
    const hasText = new Set(withText.map((a) => a.id));
    return rows.map((row) => toAttachment(row, hasText.has(row.id)));
  }

  /** Extracted text of every attachment of a project (for AI context). */
  async texts(actor: Actor, projectId: string): Promise<AttachmentText[]> {
    this.authz.assert(actor.principal, "read", "Attachment", { projectId });
    const rows = await this.prisma.projectAttachment.findMany({
      where: { projectId },
      select: { id: true, fileName: true, mimeType: true, extractedText: true },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(({ extractedText, ...row }) => ({ ...row, text: extractedText }));
  }

  /**
   * Bytes are written to storage first, then the rows are inserted in one
   * transaction; stored objects are removed again if that transaction fails.
   */
  async upload(actor: Actor, projectId: string, files: UploadFile[]): Promise<Attachment[]> {
    this.authz.assert(actor.principal, "create", "Attachment", { projectId, authorId: actor.principal.id });
    const project = await requireActiveProject(this.prisma, projectId, { id: true, code: true });
    if (!files.length) throw new BadRequestException("Attach at least one file");

    const prepared = await Promise.all(files.map((file) => this.prepare(projectId, file)));
    const stored: string[] = [];
    try {
      for (const { row, data } of prepared) {
        await this.storage.put(row.storageKey, data);
        stored.push(row.storageKey);
      }
      const rows = await this.prisma.$transaction(async (tx) => {
        const created = [];
        for (const { row } of prepared) {
          created.push(
            await tx.projectAttachment.create({
              data: { ...row, projectId, uploadedById: actor.principal.id },
              select: attachmentSelect,
            }),
          );
        }
        await this.audit.record(
          actor,
          {
            action: "attachment.uploaded",
            entityType: "Project",
            entityId: projectId,
            summary: `Uploaded ${prepared.map((f) => f.row.fileName).join(", ")} to ${project.code}`,
            metadata: { attachmentIds: created.map((a) => a.id) },
          },
          tx,
        );
        return created;
      });
      return rows.map((row, i) => toAttachment(row, prepared[i]!.row.extractedText !== null));
    } catch (error) {
      await Promise.all(stored.map((key) => this.deleteObject(key)));
      throw error;
    }
  }

  async download(actor: Actor, projectId: string, id: string): Promise<AttachmentDownload> {
    this.authz.assert(actor.principal, "read", "Attachment", { projectId });
    await requireActiveProject(this.prisma, projectId);
    const attachment = await this.require(projectId, id);
    try {
      const stream = await this.storage.read(attachment.storageKey);
      return {
        fileName: attachment.fileName,
        mimeType: attachment.mimeType,
        sizeBytes: attachment.sizeBytes,
        stream,
      };
    } catch (error) {
      if (error instanceof StorageObjectNotFoundError) {
        this.logger.error({ attachmentId: id, key: error.key }, "Attachment content is missing from storage");
        throw notFound("Attachment content", id);
      }
      throw error;
    }
  }

  async remove(actor: Actor, projectId: string, id: string): Promise<void> {
    // Deletion depends on who uploaded the file, so check visibility before revealing whether it exists.
    this.authz.assert(actor.principal, "read", "Attachment", { projectId });
    const attachment = await this.require(projectId, id);
    this.authz.assert(actor.principal, "delete", "Attachment", { projectId, authorId: attachment.uploadedById });
    await requireActiveProject(this.prisma, projectId);
    await this.prisma.$transaction(async (tx) => {
      await tx.projectAttachment.delete({ where: { id } });
      await this.audit.record(
        actor,
        {
          action: "attachment.deleted",
          entityType: "Project",
          entityId: projectId,
          summary: `Deleted attachment ${attachment.fileName}`,
          metadata: { attachmentId: id },
        },
        tx,
      );
    });
    // After commit: an orphaned blob is harmless, a row pointing at nothing is not.
    await this.deleteObject(attachment.storageKey);
  }

  private async prepare(projectId: string, file: UploadFile) {
    const fileName = sanitizeFileName(file.fileName);
    const mimeType = normalizeMimeType(file.mimeType, fileName);
    const row = {
      fileName,
      mimeType,
      sizeBytes: file.data.byteLength,
      storageKey: createStorageKey("projects", projectId, "attachments"),
      sha256: createHash("sha256").update(file.data).digest("hex"),
      extractedText: await this.extractor.extract(file.data, mimeType, fileName),
    };
    return { row, data: file.data };
  }

  private async require(projectId: string, id: string) {
    const attachment = await this.prisma.projectAttachment.findFirst({
      where: { id, projectId },
      select: { fileName: true, mimeType: true, sizeBytes: true, storageKey: true, uploadedById: true },
    });
    if (!attachment) throw notFound("Attachment", id);
    return attachment;
  }

  private async deleteObject(key: string) {
    try {
      await this.storage.delete(key);
    } catch (error) {
      this.logger.warn({ err: error, key }, "Failed to delete storage object");
    }
  }
}
