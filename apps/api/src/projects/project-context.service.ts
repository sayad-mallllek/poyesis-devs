import { Injectable } from "@nestjs/common";
import type { Actor } from "../authz/actor.js";
import { AuthzService } from "../authz/authz.service.js";
import { AttachmentsService } from "./attachments.service.js";
import { ProjectAnalyticsService } from "./project-analytics.service.js";
import { renderProjectContext } from "./project-context.js";
import { OPEN_RISK_STATUSES } from "./project.serializers.js";
import { ProjectsService } from "./projects.service.js";
import { RisksService } from "./risks.service.js";
import { StatusUpdatesService } from "./status-updates.service.js";

const LATEST_STATUS_UPDATES = 5;
const isOpen = (status: string) => (OPEN_RISK_STATUSES as readonly string[]).includes(status);

/** Builds the project digest the AI assistant reasons over, within the actor's permissions. */
@Injectable()
export class ProjectContextService {
  constructor(
    private readonly authz: AuthzService,
    private readonly projects: ProjectsService,
    private readonly analytics: ProjectAnalyticsService,
    private readonly risks: RisksService,
    private readonly statusUpdates: StatusUpdatesService,
    private readonly attachments: AttachmentsService,
  ) {}

  async build(actor: Actor, projectId: string): Promise<string> {
    const project = await this.projects.get(actor, projectId);
    const may = (subject: "Risk" | "StatusUpdate" | "Attachment") =>
      this.authz.can(actor.principal, "read", subject, { projectId });
    const [analytics, risks, statusUpdates, attachments] = await Promise.all([
      this.analytics.get(actor, projectId),
      may("Risk") ? this.risks.list(actor, projectId) : null,
      may("StatusUpdate") ? this.statusUpdates.list(actor, projectId, LATEST_STATUS_UPDATES) : null,
      may("Attachment") ? this.attachments.texts(actor, projectId) : null,
    ]);
    return renderProjectContext({
      project,
      analytics,
      openRisks: risks?.filter((r) => isOpen(r.status)) ?? null,
      statusUpdates,
      attachments,
    });
  }
}
