import { BadRequestException, Injectable } from "@nestjs/common";
import type { ProjectMember, ProjectMemberInput, UpdateProjectMemberInput } from "@repo/contracts";
import { AuditService } from "../audit/audit.service.js";
import type { Actor } from "../authz/actor.js";
import { AuthzService } from "../authz/authz.service.js";
import { conflict, isUniqueViolation, notFound } from "../common/http/errors.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { assertUsersExist, requireActiveProject } from "./project-lookup.js";
import { memberInclude, memberOrder, toProjectMember } from "./project.serializers.js";

@Injectable()
export class ProjectMembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authz: AuthzService,
    private readonly audit: AuditService,
  ) {}

  async list(actor: Actor, projectId: string): Promise<ProjectMember[]> {
    this.authz.assert(actor.principal, "read", "ProjectMember", { projectId });
    await requireActiveProject(this.prisma, projectId);
    const rows = await this.prisma.projectMember.findMany({
      where: { projectId },
      include: memberInclude,
      orderBy: memberOrder,
    });
    return rows.map(toProjectMember);
  }

  async add(actor: Actor, projectId: string, input: ProjectMemberInput): Promise<ProjectMember> {
    this.authz.assert(actor.principal, "create", "ProjectMember", { projectId });
    const project = await requireActiveProject(this.prisma, projectId, { id: true, code: true });
    await assertUsersExist(this.prisma, [input.userId]);
    try {
      const row = await this.prisma.$transaction(async (tx) => {
        const member = await tx.projectMember.create({
          data: { projectId, userId: input.userId, projectRole: input.projectRole ?? "CONTRIBUTOR" },
          include: memberInclude,
        });
        await this.audit.record(
          actor,
          {
            action: "project.member_added",
            entityType: "Project",
            entityId: projectId,
            summary: `Added ${member.user.firstName} ${member.user.lastName} to ${project.code} as ${member.projectRole}`,
            metadata: { userId: input.userId, projectRole: member.projectRole },
          },
          tx,
        );
        return member;
      });
      return toProjectMember(row);
    } catch (error) {
      if (isUniqueViolation(error)) throw conflict("This user is already a member of the project");
      throw error;
    }
  }

  async update(
    actor: Actor,
    projectId: string,
    userId: string,
    input: UpdateProjectMemberInput,
  ): Promise<ProjectMember> {
    this.authz.assert(actor.principal, "update", "ProjectMember", { projectId, userId });
    const project = await requireActiveProject(this.prisma, projectId, { id: true, code: true, ownerId: true });
    if (userId === project.ownerId && input.projectRole !== "LEAD") {
      throw new BadRequestException("The project owner must remain a LEAD member");
    }
    await this.requireMember(projectId, userId);
    const row = await this.prisma.$transaction(async (tx) => {
      const member = await tx.projectMember.update({
        where: { projectId_userId: { projectId, userId } },
        data: { projectRole: input.projectRole },
        include: memberInclude,
      });
      await this.audit.record(
        actor,
        {
          action: "project.member_updated",
          entityType: "Project",
          entityId: projectId,
          summary: `Changed ${member.user.firstName} ${member.user.lastName}'s role on ${project.code} to ${member.projectRole}`,
          metadata: { userId, projectRole: member.projectRole },
        },
        tx,
      );
      return member;
    });
    return toProjectMember(row);
  }

  async remove(actor: Actor, projectId: string, userId: string): Promise<void> {
    this.authz.assert(actor.principal, "delete", "ProjectMember", { projectId, userId });
    const project = await requireActiveProject(this.prisma, projectId, { id: true, code: true, ownerId: true });
    if (userId === project.ownerId) {
      throw new BadRequestException("The project owner cannot be removed; transfer ownership first");
    }
    await this.requireMember(projectId, userId);
    await this.prisma.$transaction(async (tx) => {
      const member = await tx.projectMember.delete({
        where: { projectId_userId: { projectId, userId } },
        include: memberInclude,
      });
      await this.audit.record(
        actor,
        {
          action: "project.member_removed",
          entityType: "Project",
          entityId: projectId,
          summary: `Removed ${member.user.firstName} ${member.user.lastName} from ${project.code}`,
          metadata: { userId },
        },
        tx,
      );
    });
  }

  private async requireMember(projectId: string, userId: string) {
    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
      select: { userId: true },
    });
    if (!member) throw notFound("Project member", userId);
  }
}
