import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Param,
  Patch,
  Post,
  Req,
  Res,
  ServiceUnavailableException,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor, type UploadedMultipartFile } from "@nestjs/platform-fastify/multipart";
import {
  createChatSessionSchema,
  MAX_CHAT_ATTACHMENT_BYTES,
  renameChatSessionSchema,
  sendChatMessageSchema,
  type ChatStreamEvent,
  type CreateChatSessionInput,
  type RenameChatSessionInput,
  type SendChatMessageInput,
} from "@repo/contracts";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { Actor } from "../authz/actor.js";
import { CurrentActor, RequirePermission } from "../authz/decorators.js";
import { ark } from "../common/validation/ark.pipe.js";
import { AppConfig } from "../config/app-config.js";
import { contentDisposition } from "../projects/attachment-files.js";
import { AssistantService } from "./assistant.service.js";
import { ChatAttachmentsService } from "./chat-attachments.service.js";
import { ChatSessionsService } from "./chat-sessions.service.js";

/** Keeps proxies from closing an idle stream while tools run. */
const HEARTBEAT_MS = 15_000;

@Controller("ai")
@RequirePermission("read", "ChatSession")
export class AssistantController {
  constructor(
    private readonly assistant: AssistantService,
    private readonly sessions: ChatSessionsService,
    private readonly attachments: ChatAttachmentsService,
    private readonly config: AppConfig,
  ) {}

  @Get("status")
  status() {
    return { enabled: this.assistant.enabled, model: this.config.ai.model };
  }

  @Get("sessions")
  list(@CurrentActor() actor: Actor) {
    return this.sessions.list(actor);
  }

  @Post("sessions")
  create(@CurrentActor() actor: Actor, @Body(ark(createChatSessionSchema)) input: CreateChatSessionInput) {
    return this.sessions.create(actor, input.title);
  }

  @Patch("sessions/:id")
  rename(
    @CurrentActor() actor: Actor,
    @Param("id") id: string,
    @Body(ark(renameChatSessionSchema)) input: RenameChatSessionInput,
  ) {
    return this.sessions.rename(actor, id, input.title);
  }

  @Delete("sessions/:id")
  @HttpCode(204)
  remove(@CurrentActor() actor: Actor, @Param("id") id: string) {
    return this.sessions.remove(actor, id);
  }

  /**
   * `multipart/form-data` with a single part named `file`. Files are uploaded
   * one per request so a large upload never shares memory with others.
   */
  @Post("attachments")
  @UseInterceptors(
    FileInterceptor("file", { defParamCharset: "utf8", limits: { fileSize: MAX_CHAT_ATTACHMENT_BYTES, files: 1 } }),
  )
  upload(@CurrentActor() actor: Actor, @UploadedFile() file: UploadedMultipartFile | undefined) {
    return this.attachments.upload(
      actor,
      file && { fileName: file.originalname, mimeType: file.mimetype, data: file.buffer! },
    );
  }

  @Delete("attachments/:attachmentId")
  @HttpCode(204)
  removeAttachment(@CurrentActor() actor: Actor, @Param("attachmentId") attachmentId: string) {
    return this.attachments.removeDraft(actor, attachmentId);
  }

  @Get("attachments/:attachmentId/download")
  @Header("Cache-Control", "private, no-store")
  async download(@CurrentActor() actor: Actor, @Param("attachmentId") attachmentId: string) {
    const file = await this.attachments.download(actor, attachmentId);
    return new StreamableFile(file.stream, {
      type: file.mimeType,
      disposition: contentDisposition(file.fileName),
      length: file.sizeBytes,
    });
  }

  @Get("sessions/:id/messages")
  messages(@CurrentActor() actor: Actor, @Param("id") id: string) {
    return this.sessions.messages(actor, id);
  }

  /** Streams the assistant's answer as Server-Sent Events (`data: <ChatStreamEvent>`). */
  @Post("sessions/:id/messages")
  async send(
    @CurrentActor() actor: Actor,
    @Param("id") id: string,
    @Body(ark(sendChatMessageSchema)) input: SendChatMessageInput,
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
  ) {
    if (!this.assistant.enabled) {
      throw new ServiceUnavailableException("The AI assistant is not configured. Set AI_API_KEY on the API server.");
    }
    const run = await this.assistant.begin(actor, id, input);

    const abort = new AbortController();
    request.raw.on("close", () => abort.abort());
    reply.hijack();
    reply.raw.writeHead(200, {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
      "x-request-id": request.id,
    });

    const write = (event: ChatStreamEvent) => {
      if (!reply.raw.writableEnded) reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
    };
    const heartbeat = setInterval(() => !reply.raw.writableEnded && reply.raw.write(": ping\n\n"), HEARTBEAT_MS);
    try {
      await run(write, abort.signal);
    } finally {
      clearInterval(heartbeat);
      reply.raw.end();
    }
  }
}
