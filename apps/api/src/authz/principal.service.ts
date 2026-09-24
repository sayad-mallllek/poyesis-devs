import { Injectable } from "@nestjs/common";
import type { Principal } from "@repo/contracts";
import { PrismaService } from "../prisma/prisma.service.js";

@Injectable()
export class PrincipalService {
  constructor(private readonly prisma: PrismaService) {}

  /** Resolves the ABAC subject attributes. `null` for missing or suspended users. */
  async load(userId: string): Promise<Principal | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        status: true,
        ownedProjects: { select: { id: true }, where: { archivedAt: null } },
        memberships: { select: { projectId: true, projectRole: true } },
      },
    });
    if (!user || user.status !== "ACTIVE") return null;

    const owned = user.ownedProjects.map((p) => p.id);
    const member = user.memberships.map((m) => m.projectId);
    const led = user.memberships.filter((m) => m.projectRole === "LEAD").map((m) => m.projectId);

    return {
      id: user.id,
      role: user.role,
      memberProjectIds: [...new Set([...owned, ...member])],
      managedProjectIds: [...new Set([...owned, ...led])],
    };
  }
}
