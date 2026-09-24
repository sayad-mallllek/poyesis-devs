import { Injectable } from "@nestjs/common";
import type { CreateUserNoteInput, UpdateUserNoteInput, UserNote } from "@repo/contracts";
import { AuditService } from "../audit/audit.service.js";
import type { Actor } from "../authz/actor.js";
import { AuthzService } from "../authz/authz.service.js";
import { notFound } from "../common/http/errors.js";
import { definedOnly } from "../common/serialization/index.js";
import type { Prisma } from "../generated/prisma/client.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { displayName } from "../users/users.service.js";
import { toUserNote, userNoteInclude } from "./people.mappers.js";

/** Remarks, notes, warnings and kudos written about a person. */
@Injectable()
export class NotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authz: AuthzService,
    private readonly audit: AuditService,
  ) {}

  /** Newest first. */
  async list(actor: Actor, userId: string): Promise<UserNote[]> {
    this.authz.assert(actor.principal, "read", "UserNote");
    await this.findUser(userId);
    const rows = await this.prisma.userNote.findMany({
      where: {
        AND: [this.authz.where<Prisma.UserNoteWhereInput>(actor.principal, "read", "UserNote"), { userId }],
      },
      include: userNoteInclude,
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toUserNote);
  }

  async create(actor: Actor, userId: string, input: CreateUserNoteInput): Promise<UserNote> {
    const authorId = actor.principal.id;
    this.authz.assert(actor.principal, "create", "UserNote", { userId, authorId });
    const user = await this.findUser(userId);
    if (input.projectId) {
      const project = await this.prisma.project.findUnique({ where: { id: input.projectId }, select: { id: true } });
      if (!project) throw notFound("Project", input.projectId);
    }
    const row = await this.prisma.$transaction(async (tx) => {
      const created = await tx.userNote.create({
        data: { userId, authorId, type: input.type, content: input.content, projectId: input.projectId ?? null },
        include: userNoteInclude,
      });
      await this.audit.record(
        actor,
        {
          action: "user_note.created",
          entityType: "UserNote",
          entityId: created.id,
          summary: `Added a ${input.type.toLowerCase()} about ${displayName(user)}`,
          metadata: { userId },
        },
        tx,
      );
      return created;
    });
    return toUserNote(row);
  }

  async update(actor: Actor, id: string, input: UpdateUserNoteInput): Promise<UserNote> {
    await this.authorize(actor, "update", id);
    const row = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.userNote.update({ where: { id }, data: definedOnly(input), include: userNoteInclude });
      await this.audit.record(
        actor,
        {
          action: "user_note.updated",
          entityType: "UserNote",
          entityId: id,
          summary: `Updated a note: ${Object.keys(definedOnly(input)).join(", ")}`,
          metadata: { userId: updated.userId },
        },
        tx,
      );
      return updated;
    });
    return toUserNote(row);
  }

  async remove(actor: Actor, id: string): Promise<void> {
    const note = await this.authorize(actor, "delete", id);
    await this.prisma.$transaction(async (tx) => {
      await tx.userNote.delete({ where: { id } });
      await this.audit.record(
        actor,
        {
          action: "user_note.deleted",
          entityType: "UserNote",
          entityId: id,
          summary: `Deleted a ${note.type.toLowerCase()}`,
          metadata: { userId: note.userId },
        },
        tx,
      );
    });
  }

  private async authorize(actor: Actor, action: "update" | "delete", id: string) {
    // Fail before the lookup so roles without any note access cannot probe ids.
    this.authz.assert(actor.principal, action, "UserNote");
    const note = await this.prisma.userNote.findUnique({
      where: { id },
      select: { userId: true, authorId: true, type: true },
    });
    if (!note) throw notFound("Note", id);
    this.authz.assert(actor.principal, action, "UserNote", { userId: note.userId, authorId: note.authorId });
    return note;
  }

  private async findUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    });
    if (!user) throw notFound("User", userId);
    return user;
  }
}
