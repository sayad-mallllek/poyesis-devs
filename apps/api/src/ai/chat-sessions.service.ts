import { Injectable } from "@nestjs/common";
import type { ChatMessage, ChatSession, MessagePart } from "@repo/contracts";
import type { BaseMessage } from "@langchain/core/messages";
import type { Actor } from "../authz/actor.js";
import { AuthzService } from "../authz/authz.service.js";
import { notFound } from "../common/http/errors.js";
import type { Prisma } from "../generated/prisma/client.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { deserializeTrace, serializeTrace } from "./agent/history.js";

export const DEFAULT_SESSION_TITLE = "New conversation";
/** How many past messages are replayed to the model. */
const HISTORY_WINDOW = 40;

type MessageRow = Prisma.ChatMessageGetPayload<object>;

export interface StoredTurn {
  message: ChatMessage;
  trace: BaseMessage[];
}

const previewOf = (parts: MessagePart[]) => {
  const text = parts.find((p) => p.type === "text")?.text ?? null;
  return text ? text.replace(/\s+/g, " ").trim().slice(0, 140) : null;
};

const withLastMessage = {
  messages: { orderBy: { createdAt: "desc" }, take: 1, select: { parts: true } },
} as const satisfies Prisma.ChatSessionInclude;

type SessionRow = Prisma.ChatSessionGetPayload<{ include: typeof withLastMessage }>;

const toSession = (row: SessionRow): ChatSession => ({
  id: row.id,
  title: row.title,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
  lastMessagePreview: row.messages[0] ? previewOf(row.messages[0].parts as unknown as MessagePart[]) : null,
});

const toMessage = (row: MessageRow): ChatMessage => ({
  id: row.id,
  sessionId: row.sessionId,
  role: row.role === "USER" ? "user" : "assistant",
  parts: row.parts as unknown as MessagePart[],
  createdAt: row.createdAt.toISOString(),
});

@Injectable()
export class ChatSessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authz: AuthzService,
  ) {}

  async list(actor: Actor): Promise<ChatSession[]> {
    const rows = await this.prisma.chatSession.findMany({
      where: { AND: [this.authz.where<Prisma.ChatSessionWhereInput>(actor.principal, "read", "ChatSession")] },
      orderBy: { updatedAt: "desc" },
      take: 100,
      include: withLastMessage,
    });
    return rows.map(toSession);
  }

  async create(actor: Actor, title = DEFAULT_SESSION_TITLE): Promise<ChatSession> {
    this.authz.assert(actor.principal, "create", "ChatSession", { userId: actor.principal.id });
    return toSession(
      await this.prisma.chatSession.create({ data: { userId: actor.principal.id, title }, include: withLastMessage }),
    );
  }

  async rename(actor: Actor, id: string, title: string): Promise<ChatSession> {
    await this.owned(actor, id, "update");
    return toSession(await this.prisma.chatSession.update({ where: { id }, data: { title }, include: withLastMessage }));
  }

  async remove(actor: Actor, id: string): Promise<void> {
    await this.owned(actor, id, "delete");
    await this.prisma.chatSession.delete({ where: { id } });
  }

  async messages(actor: Actor, id: string): Promise<ChatMessage[]> {
    await this.owned(actor, id, "read");
    const rows = await this.prisma.chatMessage.findMany({ where: { sessionId: id }, orderBy: { createdAt: "asc" } });
    return rows.map(toMessage);
  }

  /** The most recent turns with their model traces, oldest first. */
  async recentTurns(actor: Actor, id: string): Promise<StoredTurn[]> {
    await this.owned(actor, id, "read");
    const rows = await this.prisma.chatMessage.findMany({
      where: { sessionId: id },
      orderBy: { createdAt: "desc" },
      take: HISTORY_WINDOW,
    });
    return rows.reverse().map((row) => ({ message: toMessage(row), trace: deserializeTrace(row.trace) }));
  }

  async appendMessage(
    sessionId: string,
    role: ChatMessage["role"],
    parts: MessagePart[],
    trace: BaseMessage[],
  ): Promise<ChatMessage> {
    const row = await this.prisma.chatMessage.create({
      data: {
        sessionId,
        role: role === "user" ? "USER" : "ASSISTANT",
        parts: parts as unknown as Prisma.InputJsonValue,
        trace: serializeTrace(trace) as unknown as Prisma.InputJsonValue,
      },
    });
    return toMessage(row);
  }

  /** Bumps `updatedAt` and names untitled sessions after their first message. */
  async touch(actor: Actor, id: string, firstUserText: string | undefined): Promise<ChatSession> {
    const session = await this.owned(actor, id, "update");
    const title =
      session.title === DEFAULT_SESSION_TITLE && firstUserText
        ? firstUserText.replace(/\s+/g, " ").trim().slice(0, 60) || DEFAULT_SESSION_TITLE
        : session.title;
    return toSession(
      await this.prisma.chatSession.update({
        where: { id },
        data: { title, updatedAt: new Date() },
        include: withLastMessage,
      }),
    );
  }

  private async owned(actor: Actor, id: string, action: "read" | "update" | "delete") {
    const session = await this.prisma.chatSession.findUnique({ where: { id } });
    // Someone else's session is reported as missing, not forbidden.
    if (!session || !this.authz.can(actor.principal, action, "ChatSession", { userId: session.userId })) {
      throw notFound("Conversation", id);
    }
    return session;
  }
}
