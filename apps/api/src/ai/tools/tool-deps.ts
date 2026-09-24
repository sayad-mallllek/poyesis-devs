import type { AuditService } from "../../audit/audit.service.js";
import type { ClientsService } from "../../clients/clients.service.js";
import type { CompanyService } from "../../company/company.service.js";
import type { DashboardService } from "../../dashboard/dashboard.service.js";
import type { GithubService } from "../../integrations/github/github.service.js";
import type { RepositoryLinksService } from "../../integrations/github/repository-links.service.js";
import type { SentryLinksService } from "../../integrations/sentry/sentry-links.service.js";
import type { SentryService } from "../../integrations/sentry/sentry.service.js";
import type { NotesService } from "../../people/notes.service.js";
import type { SkillsService } from "../../people/skills.service.js";
import type { UserSkillsService } from "../../people/user-skills.service.js";
import type { MilestonesService } from "../../projects/milestones.service.js";
import type { ProjectAnalyticsService } from "../../projects/project-analytics.service.js";
import type { ProjectContextService } from "../../projects/project-context.service.js";
import type { ProjectMembersService } from "../../projects/project-members.service.js";
import type { ProjectsService } from "../../projects/projects.service.js";
import type { RisksService } from "../../projects/risks.service.js";
import type { StatusUpdatesService } from "../../projects/status-updates.service.js";
import type { AllocationsService } from "../../scheduling/allocations.service.js";
import type { SchedulingService } from "../../scheduling/scheduling.service.js";
import type { TimeOffService } from "../../scheduling/time-off.service.js";
import type { UsersService } from "../../users/users.service.js";

/** The domain services the assistant's tools delegate to. */
export interface ToolDeps {
  audit: AuditService;
  company: CompanyService;
  dashboard: DashboardService;
  projects: ProjectsService;
  members: ProjectMembersService;
  milestones: MilestonesService;
  risks: RisksService;
  statusUpdates: StatusUpdatesService;
  analytics: ProjectAnalyticsService;
  projectContext: ProjectContextService;
  users: UsersService;
  skills: SkillsService;
  userSkills: UserSkillsService;
  notes: NotesService;
  clients: ClientsService;
  allocations: AllocationsService;
  timeOff: TimeOffService;
  scheduling: SchedulingService;
  github: GithubService;
  repositories: RepositoryLinksService;
  sentry: SentryService;
  sentryLinks: SentryLinksService;
}
