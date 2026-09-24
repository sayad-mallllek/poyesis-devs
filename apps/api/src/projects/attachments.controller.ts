import {
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Param,
  Post,
  StreamableFile,
  UploadedFiles,
  UseInterceptors,
} from "@nestjs/common";
import { FilesInterceptor, type UploadedMultipartFile } from "@nestjs/platform-fastify/multipart";
import type { Actor } from "../authz/actor.js";
import { CurrentActor, RequirePermission } from "../authz/decorators.js";
import { contentDisposition } from "./attachment-files.js";
import { AttachmentsService } from "./attachments.service.js";

/** Matches the `files` limit `@fastify/multipart` is registered with in `main.ts`. */
const MAX_FILES_PER_UPLOAD = 10;

@Controller("projects/:projectId/attachments")
export class AttachmentsController {
  constructor(private readonly attachments: AttachmentsService) {}

  @Get()
  list(@CurrentActor() actor: Actor, @Param("projectId") projectId: string) {
    return this.attachments.list(actor, projectId);
  }

  /** `multipart/form-data` with one or more parts named `files`. */
  @Post()
  @RequirePermission("create", "Attachment")
  // Browsers send UTF-8 file names; the multer-compatible default would decode them as latin1.
  @UseInterceptors(FilesInterceptor("files", MAX_FILES_PER_UPLOAD, { defParamCharset: "utf8" }))
  upload(
    @CurrentActor() actor: Actor,
    @Param("projectId") projectId: string,
    @UploadedFiles() files: UploadedMultipartFile[] | undefined,
  ) {
    return this.attachments.upload(
      actor,
      projectId,
      (files ?? []).map((file) => ({ fileName: file.originalname, mimeType: file.mimetype, data: file.buffer! })),
    );
  }

  @Get(":attachmentId/download")
  @Header("Cache-Control", "private, no-store")
  async download(
    @CurrentActor() actor: Actor,
    @Param("projectId") projectId: string,
    @Param("attachmentId") attachmentId: string,
  ) {
    const file = await this.attachments.download(actor, projectId, attachmentId);
    return new StreamableFile(file.stream, {
      type: file.mimeType,
      disposition: contentDisposition(file.fileName),
      length: file.sizeBytes,
    });
  }

  @Delete(":attachmentId")
  @HttpCode(204)
  remove(
    @CurrentActor() actor: Actor,
    @Param("projectId") projectId: string,
    @Param("attachmentId") attachmentId: string,
  ) {
    return this.attachments.remove(actor, projectId, attachmentId);
  }
}
