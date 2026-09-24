import {
  createMilestoneSchema,
  createProjectSchema,
  createRiskSchema,
  createStatusUpdateSchema,
  MILESTONE_STATUSES,
  PRIORITIES,
  PROJECT_HEALTHS,
  PROJECT_MEMBER_ROLES,
  PROJECT_STATUSES,
  updateMilestoneSchema,
  updateProjectSchema,
  updateRiskSchema,
  type ProjectDetail,
  type ProjectSummary,
} from "@repo/contracts";
import { type } from "arktype";
import type { Actor } from "../../authz/actor.js";
import { pickOne } from "./references.js";
import type { ToolDeps } from "./tool-deps.js";
import { defineTool, idArg, type AssistantTool } from "./tool-kit.js";

const projectRef = type("string > 0").describe("project id, code (e.g. ACME-WEB) or exact name");

const brief = (p: ProjectSummary) => ({
  id: p.id,
  code: p.code,
  name: p.name,
  status: p.status,
  health: p.health,
  priority: p.priority,
  progress: p.progress,
  startDate: p.startDate,
  targetEndDate: p.targetEndDate,
  client: p.client?.name ?? null,
  owner: `${p.owner.firstName} ${p.owner.lastName}`,
  memberCount: p.memberCount,
});

/** Detail without the heavy free-text fields (those come from get_project_context). */
const detailBrief = (p: ProjectDetail) => ({
  ...brief(p),
  summary: p.summary,
  type: p.type,
  billingModel: p.billingModel,
  budgetAmount: p.budgetAmount,
  currency: p.currency,
  estimatedHours: p.estimatedHours,
  hourlyRate: p.hourlyRate,
  tags: p.tags,
  techStack: p.techStack,
  members: p.members.map((m) => ({
    userId: m.user.id,
    name: `${m.user.firstName} ${m.user.lastName}`,
    projectRole: m.projectRole,
  })),
  milestones: p.milestones.map((m) => ({ id: m.id, name: m.name, dueDate: m.dueDate, status: m.status })),
  counts: p.counts,
});

export async function resolveProject(deps: ToolDeps, actor: Actor, reference: string) {
  const candidates = await deps.projects.resolve(actor, reference);
  return pickOne(candidates, "project", reference, (p) => `${p.name} (${p.code}, id ${p.id})`);
}

export function projectTools(deps: ToolDeps): AssistantTool[] {
  return [
    defineTool({
      name: "search_projects",
      label: "Searching projects",
      description:
        "List projects visible to the user, optionally filtered. Returns compact summaries with ids. Use before referring to a project you don't have an id for.",
      requires: { action: "read", subject: "Project" },
      schema: type({
        "search?": "string",
        "status?": type.enumerated(...PROJECT_STATUSES),
        "health?": type.enumerated(...PROJECT_HEALTHS),
        "priority?": type.enumerated(...PRIORITIES),
        "clientId?": "string",
        "memberId?": type("string").describe("user id; only projects this person belongs to"),
        "sort?": "'name' | 'targetEndDate' | 'createdAt' | 'priority' | 'progress'",
        "order?": "'asc' | 'desc'",
      }),
      run: async ({ actor }, input) => {
        const page = await deps.projects.list(actor, { ...input, pageSize: 50 });
        return { total: page.total, projects: page.items.map(brief) };
      },
    }),
    defineTool({
      name: "get_project",
      label: "Reading project",
      description: "Structured facts about one project: status, dates, budget, members (with user ids), milestones.",
      requires: { action: "read", subject: "Project" },
      schema: type({ project: projectRef }),
      run: async ({ actor }, { project }) => {
        const { id } = await resolveProject(deps, actor, project);
        return detailBrief(await deps.projects.get(actor, id));
      },
    }),
    defineTool({
      name: "get_project_context",
      label: "Reading project documents",
      description:
        "Full markdown digest of a project for analysis: description, objectives, scope, team, milestones, open risks, recent status updates and text extracted from attached files. Use for questions that need judgement (risks, recommendations, summaries).",
      requires: { action: "read", subject: "Project" },
      schema: type({ project: projectRef }),
      run: async ({ actor }, { project }) => {
        const { id } = await resolveProject(deps, actor, project);
        return deps.projectContext.build(actor, id);
      },
    }),
    defineTool({
      name: "get_project_analytics",
      label: "Analyzing project metrics",
      description:
        "Schedule (time elapsed vs progress), booked effort by week and member, budget burn, milestone and risk aggregates, health history. Pair with render_* tools to visualize.",
      requires: { action: "read", subject: "Project" },
      schema: type({ project: projectRef }),
      run: async ({ actor }, { project }) => {
        const { id } = await resolveProject(deps, actor, project);
        return deps.analytics.get(actor, id);
      },
    }),
    defineTool({
      name: "create_project",
      label: "Creating project",
      description:
        "Create a project. Ask the user (ask_user) for missing essentials first: name, dates, owner and client when relevant. The owner defaults to the current user.",
      requires: { action: "create", subject: "Project" },
      schema: createProjectSchema,
      run: async ({ actor }, input) => detailBrief(await deps.projects.create(actor, input)),
    }),
    defineTool({
      name: "update_project",
      label: "Updating project",
      description: "Update fields of a project. Only send the fields that change.",
      requires: { action: "update", subject: "Project" },
      schema: type({ projectId: idArg, changes: updateProjectSchema }),
      run: async ({ actor }, { projectId, changes }) => detailBrief(await deps.projects.update(actor, projectId, changes)),
    }),
    defineTool({
      name: "archive_project",
      label: "Archive project",
      description: "Archive (soft-delete) a project. The user is asked to confirm.",
      requires: { action: "delete", subject: "Project" },
      mode: "confirm",
      schema: type({ projectId: idArg, projectName: "string" }),
      describe: ({ projectName }) => `Archive the project "${projectName}". It disappears from lists and reports.`,
      run: async ({ actor }, { projectId }) => {
        await deps.projects.archive(actor, projectId);
        return { archived: true };
      },
    }),
    defineTool({
      name: "add_project_member",
      label: "Adding team member",
      description: "Add a person to a project team.",
      requires: { action: "create", subject: "ProjectMember" },
      schema: type({
        projectId: idArg,
        userId: idArg,
        "projectRole?": type.enumerated(...PROJECT_MEMBER_ROLES),
      }),
      run: ({ actor }, { projectId, ...input }) => deps.members.add(actor, projectId, input),
    }),
    defineTool({
      name: "update_project_member",
      label: "Changing project role",
      description: "Change a member's role on a project.",
      requires: { action: "update", subject: "ProjectMember" },
      schema: type({ projectId: idArg, userId: idArg, projectRole: type.enumerated(...PROJECT_MEMBER_ROLES) }),
      run: ({ actor }, { projectId, userId, projectRole }) =>
        deps.members.update(actor, projectId, userId, { projectRole }),
    }),
    defineTool({
      name: "remove_project_member",
      label: "Remove team member",
      description: "Remove a person from a project team. The user is asked to confirm.",
      requires: { action: "delete", subject: "ProjectMember" },
      mode: "confirm",
      schema: type({ projectId: idArg, userId: idArg, personName: "string", projectName: "string" }),
      describe: ({ personName, projectName }) => `Remove ${personName} from "${projectName}".`,
      run: async ({ actor }, { projectId, userId }) => {
        await deps.members.remove(actor, projectId, userId);
        return { removed: true };
      },
    }),
    defineTool({
      name: "create_milestone",
      label: "Adding milestone",
      description: "Add a milestone to a project.",
      requires: { action: "create", subject: "Milestone" },
      schema: type({ projectId: idArg, milestone: createMilestoneSchema }),
      run: ({ actor }, { projectId, milestone }) => deps.milestones.create(actor, projectId, milestone),
    }),
    defineTool({
      name: "update_milestone",
      label: "Updating milestone",
      description: `Update a milestone (e.g. mark it ${MILESTONE_STATUSES.join("/")} or move its due date).`,
      requires: { action: "update", subject: "Milestone" },
      schema: type({ projectId: idArg, milestoneId: idArg, changes: updateMilestoneSchema }),
      run: ({ actor }, { projectId, milestoneId, changes }) =>
        deps.milestones.update(actor, projectId, milestoneId, changes),
    }),
    defineTool({
      name: "delete_milestone",
      label: "Delete milestone",
      description: "Delete a milestone. The user is asked to confirm.",
      requires: { action: "delete", subject: "Milestone" },
      mode: "confirm",
      schema: type({ projectId: idArg, milestoneId: idArg, milestoneName: "string" }),
      describe: ({ milestoneName }) => `Delete the milestone "${milestoneName}".`,
      run: async ({ actor }, { projectId, milestoneId }) => {
        await deps.milestones.remove(actor, projectId, milestoneId);
        return { deleted: true };
      },
    }),
    defineTool({
      name: "list_risks",
      label: "Reading risks",
      description: "List a project's risks ordered by score (probability × impact).",
      requires: { action: "read", subject: "Risk" },
      schema: type({ projectId: idArg }),
      run: ({ actor }, { projectId }) => deps.risks.list(actor, projectId),
    }),
    defineTool({
      name: "create_risk",
      label: "Logging risk",
      description: "Log a risk on a project with probability and impact from 1 to 5.",
      requires: { action: "create", subject: "Risk" },
      schema: type({ projectId: idArg, risk: createRiskSchema }),
      run: ({ actor }, { projectId, risk }) => deps.risks.create(actor, projectId, risk),
    }),
    defineTool({
      name: "update_risk",
      label: "Updating risk",
      description: "Update a risk (status, scores, mitigation, owner).",
      requires: { action: "update", subject: "Risk" },
      schema: type({ projectId: idArg, riskId: idArg, changes: updateRiskSchema }),
      run: ({ actor }, { projectId, riskId, changes }) => deps.risks.update(actor, projectId, riskId, changes),
    }),
    defineTool({
      name: "post_status_update",
      label: "Posting status update",
      description: "Post a status update on a project; it also sets the project's health (and progress when given).",
      requires: { action: "create", subject: "StatusUpdate" },
      schema: type({ projectId: idArg, update: createStatusUpdateSchema }),
      run: ({ actor }, { projectId, update }) => deps.statusUpdates.create(actor, projectId, update),
    }),
  ];
}
