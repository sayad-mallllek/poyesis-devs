import { Injectable } from "@nestjs/common";
import type { Principal } from "@repo/contracts";
import { AuditService } from "../../audit/audit.service.js";
import { AuthzService } from "../../authz/authz.service.js";
import { ClientsService } from "../../clients/clients.service.js";
import { CompanyService } from "../../company/company.service.js";
import { DashboardService } from "../../dashboard/dashboard.service.js";
import { GithubService } from "../../integrations/github/github.service.js";
import { RepositoryLinksService } from "../../integrations/github/repository-links.service.js";
import { SentryLinksService } from "../../integrations/sentry/sentry-links.service.js";
import { SentryService } from "../../integrations/sentry/sentry.service.js";
import { NotesService } from "../../people/notes.service.js";
import { SkillsService } from "../../people/skills.service.js";
import { UserSkillsService } from "../../people/user-skills.service.js";
import { MilestonesService } from "../../projects/milestones.service.js";
import { ProjectAnalyticsService } from "../../projects/project-analytics.service.js";
import { ProjectContextService } from "../../projects/project-context.service.js";
import { ProjectMembersService } from "../../projects/project-members.service.js";
import { ProjectsService } from "../../projects/projects.service.js";
import { RisksService } from "../../projects/risks.service.js";
import { StatusUpdatesService } from "../../projects/status-updates.service.js";
import { AllocationsService } from "../../scheduling/allocations.service.js";
import { SchedulingService } from "../../scheduling/scheduling.service.js";
import { TimeOffService } from "../../scheduling/time-off.service.js";
import { UsersService } from "../../users/users.service.js";
import { peopleTools } from "./people.tools.js";
import { projectTools } from "./project.tools.js";
import { scheduleTools } from "./schedule.tools.js";
import type { ToolDeps } from "./tool-deps.js";
import type { AssistantTool } from "./tool-kit.js";
import { uiTools } from "./ui.tools.js";
import { workspaceTools } from "./workspace.tools.js";

@Injectable()
export class ToolRegistry {
  private readonly tools: AssistantTool[];
  private readonly byName: Map<string, AssistantTool>;

  constructor(
    private readonly authz: AuthzService,
    audit: AuditService,
    company: CompanyService,
    dashboard: DashboardService,
    projects: ProjectsService,
    members: ProjectMembersService,
    milestones: MilestonesService,
    risks: RisksService,
    statusUpdates: StatusUpdatesService,
    analytics: ProjectAnalyticsService,
    projectContext: ProjectContextService,
    users: UsersService,
    skills: SkillsService,
    userSkills: UserSkillsService,
    notes: NotesService,
    clients: ClientsService,
    allocations: AllocationsService,
    timeOff: TimeOffService,
    scheduling: SchedulingService,
    github: GithubService,
    repositories: RepositoryLinksService,
    sentry: SentryService,
    sentryLinks: SentryLinksService,
  ) {
    const deps: ToolDeps = {
      audit,
      company,
      dashboard,
      projects,
      members,
      milestones,
      risks,
      statusUpdates,
      analytics,
      projectContext,
      users,
      skills,
      userSkills,
      notes,
      clients,
      allocations,
      timeOff,
      scheduling,
      github,
      repositories,
      sentry,
      sentryLinks,
    };
    this.tools = [
      ...workspaceTools(deps),
      ...projectTools(deps),
      ...peopleTools(deps),
      ...scheduleTools(deps),
      ...uiTools(),
    ];
    this.byName = new Map(this.tools.map((t) => [t.name, t]));
  }

  /** Tools offered to this principal: those their role could ever use. */
  forPrincipal(principal: Principal): AssistantTool[] {
    return this.tools.filter(
      (tool) => !tool.requires || this.authz.can(principal, tool.requires.action, tool.requires.subject),
    );
  }

  get(name: string): AssistantTool | undefined {
    return this.byName.get(name);
  }
}
