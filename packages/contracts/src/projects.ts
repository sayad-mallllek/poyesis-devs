import { type } from "arktype";
import { isoDateSchema, type IsoDate, type IsoDateTime, type UserRef } from "./common.js";
import {
  BILLING_MODELS,
  MILESTONE_STATUSES,
  PRIORITIES,
  PROJECT_HEALTHS,
  PROJECT_MEMBER_ROLES,
  PROJECT_STATUSES,
  PROJECT_TYPES,
  RISK_STATUSES,
  type BillingModel,
  type MilestoneStatus,
  type Priority,
  type ProjectHealth,
  type ProjectMemberRole,
  type ProjectStatus,
  type ProjectType,
  type RiskStatus,
} from "./enums.js";

const hexColor = type(/^#[0-9a-fA-F]{6}$/).describe("a hex color such as #4f46e5");
const tag = type("0 < string <= 40");

export const projectLinkSchema = type({
  label: "0 < string <= 60",
  url: "string.url",
});
export type ProjectLink = typeof projectLinkSchema.infer;

export const projectMemberInputSchema = type({
  userId: "string > 0",
  "projectRole?": type.enumerated(...PROJECT_MEMBER_ROLES),
});
export type ProjectMemberInput = typeof projectMemberInputSchema.infer;

const projectFields = {
  name: "0 < string <= 160",
  /** Short human key, e.g. `ACME-WEB`. Generated from the name when omitted. */
  "code?": /^[A-Z][A-Z0-9-]{1,19}$/,
  "summary?": "string <= 300 | null",
  /** Long-form markdown description. Primary context for AI analysis. */
  "description?": "string <= 50000 | null",
  "status?": type.enumerated(...PROJECT_STATUSES),
  "health?": type.enumerated(...PROJECT_HEALTHS),
  "priority?": type.enumerated(...PRIORITIES),
  "type?": type.enumerated(...PROJECT_TYPES),
  "billingModel?": type.enumerated(...BILLING_MODELS),
  "clientId?": "string | null",
  "ownerId?": "string",
  "startDate?": isoDateSchema.or("null"),
  "targetEndDate?": isoDateSchema.or("null"),
  "actualEndDate?": isoDateSchema.or("null"),
  "budgetAmount?": "number >= 0 | null",
  "currency?": /^[A-Z]{3}$/,
  "estimatedHours?": "number >= 0 | null",
  "hourlyRate?": "number >= 0 | null",
  "progress?": "0 <= number.integer <= 100",
  "color?": hexColor,
  "tags?": tag.array().atMostLength(20),
  "techStack?": tag.array().atMostLength(40),
  "objectives?": "string <= 10000 | null",
  "successCriteria?": "string <= 10000 | null",
  "scope?": "string <= 10000 | null",
  "outOfScope?": "string <= 10000 | null",
  "assumptions?": "string <= 10000 | null",
  "constraints?": "string <= 10000 | null",
  "links?": projectLinkSchema.array().atMostLength(20),
  "isConfidential?": "boolean",
} as const;

export const createProjectSchema = type({
  ...projectFields,
  "members?": projectMemberInputSchema.array(),
}).narrow(
  (p, ctx) =>
    !p.startDate ||
    !p.targetEndDate ||
    p.startDate <= p.targetEndDate ||
    ctx.reject({ path: ["targetEndDate"], expected: "on or after the start date" }),
);
export type CreateProjectInput = typeof createProjectSchema.infer;

export const updateProjectSchema = type(projectFields)
  .partial()
  .narrow(
    (p, ctx) =>
      !p.startDate ||
      !p.targetEndDate ||
      p.startDate <= p.targetEndDate ||
      ctx.reject({ path: ["targetEndDate"], expected: "on or after the start date" }),
  );
export type UpdateProjectInput = typeof updateProjectSchema.infer;

export const listProjectsQuerySchema = type({
  "page?": "string.integer.parse |> number.integer >= 1",
  "pageSize?": "string.integer.parse |> 1 <= number.integer <= 100",
  "search?": "string",
  "status?": type.enumerated(...PROJECT_STATUSES),
  "health?": type.enumerated(...PROJECT_HEALTHS),
  "priority?": type.enumerated(...PRIORITIES),
  "clientId?": "string",
  "ownerId?": "string",
  "memberId?": "string",
  "sort?": "'name' | 'targetEndDate' | 'createdAt' | 'priority' | 'progress'",
  "order?": "'asc' | 'desc'",
});
export type ListProjectsQuery = typeof listProjectsQuerySchema.infer;

export const updateProjectMemberSchema = type({
  projectRole: type.enumerated(...PROJECT_MEMBER_ROLES),
});
export type UpdateProjectMemberInput = typeof updateProjectMemberSchema.infer;

// ── Milestones ────────────────────────────────────────────────────────────

export const createMilestoneSchema = type({
  name: "0 < string <= 160",
  "description?": "string <= 5000 | null",
  dueDate: isoDateSchema,
  "status?": type.enumerated(...MILESTONE_STATUSES),
});
export type CreateMilestoneInput = typeof createMilestoneSchema.infer;
export const updateMilestoneSchema = createMilestoneSchema.partial();
export type UpdateMilestoneInput = typeof updateMilestoneSchema.infer;

export interface Milestone {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  dueDate: IsoDate;
  status: MilestoneStatus;
  completedAt: IsoDateTime | null;
}

// ── Risks ─────────────────────────────────────────────────────────────────

const score = "1 <= number.integer <= 5";
export const createRiskSchema = type({
  title: "0 < string <= 200",
  "description?": "string <= 5000 | null",
  probability: score,
  impact: score,
  "status?": type.enumerated(...RISK_STATUSES),
  "mitigation?": "string <= 5000 | null",
  "ownerId?": "string | null",
});
export type CreateRiskInput = typeof createRiskSchema.infer;
export const updateRiskSchema = createRiskSchema.partial();
export type UpdateRiskInput = typeof updateRiskSchema.infer;

export interface Risk {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  probability: number;
  impact: number;
  /** probability × impact, 1‥25. */
  score: number;
  status: RiskStatus;
  mitigation: string | null;
  owner: UserRef | null;
  createdAt: IsoDateTime;
}

// ── Status updates (health history) ───────────────────────────────────────

export const createStatusUpdateSchema = type({
  health: type.enumerated(...PROJECT_HEALTHS),
  summary: "0 < string <= 5000",
  "progress?": "0 <= number.integer <= 100",
});
export type CreateStatusUpdateInput = typeof createStatusUpdateSchema.infer;

export interface StatusUpdate {
  id: string;
  projectId: string;
  health: ProjectHealth;
  summary: string;
  progress: number | null;
  author: UserRef;
  createdAt: IsoDateTime;
}

// ── Attachments ───────────────────────────────────────────────────────────

export interface Attachment {
  id: string;
  projectId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  /** Whether text was extracted and is available to the AI assistant. */
  hasExtractedText: boolean;
  uploadedBy: UserRef;
  createdAt: IsoDateTime;
}

// ── Projects ──────────────────────────────────────────────────────────────

export interface ProjectMember {
  user: UserRef;
  projectRole: ProjectMemberRole;
  joinedAt: IsoDateTime;
}

export interface ProjectSummary {
  id: string;
  code: string;
  name: string;
  summary: string | null;
  status: ProjectStatus;
  health: ProjectHealth;
  priority: Priority;
  type: ProjectType;
  color: string;
  progress: number;
  startDate: IsoDate | null;
  targetEndDate: IsoDate | null;
  client: { id: string; name: string } | null;
  owner: UserRef;
  memberCount: number;
  tags: string[];
  isConfidential: boolean;
  createdAt: IsoDateTime;
}

export interface ProjectDetail extends ProjectSummary {
  description: string | null;
  billingModel: BillingModel;
  actualEndDate: IsoDate | null;
  budgetAmount: number | null;
  currency: string;
  estimatedHours: number | null;
  hourlyRate: number | null;
  techStack: string[];
  objectives: string | null;
  successCriteria: string | null;
  scope: string | null;
  outOfScope: string | null;
  assumptions: string | null;
  constraints: string | null;
  links: ProjectLink[];
  members: ProjectMember[];
  milestones: Milestone[];
  counts: {
    attachments: number;
    openRisks: number;
    repositories: number;
    sentryProjects: number;
  };
  updatedAt: IsoDateTime;
}

/** Aggregates behind the project overview charts. */
export interface ProjectAnalytics {
  schedule: {
    startDate: IsoDate | null;
    targetEndDate: IsoDate | null;
    daysTotal: number | null;
    daysElapsed: number | null;
    daysRemaining: number | null;
    /** Share of the calendar already consumed, 0‥100. */
    timeElapsedPercent: number | null;
    progress: number;
    /** progress − timeElapsedPercent; negative means behind schedule. */
    scheduleVariance: number | null;
  };
  effort: {
    estimatedHours: number | null;
    /** Booked hours from allocations up to today. */
    bookedHoursToDate: number;
    /** Booked hours over the whole allocation horizon. */
    bookedHoursTotal: number;
    /** Weekly booked hours (ISO week start) over the project window. */
    weekly: Array<{ weekStart: IsoDate; hours: number; cumulative: number }>;
    byMember: Array<{ user: UserRef; hours: number }>;
  };
  budget: {
    budgetAmount: number | null;
    currency: string;
    /** Booked hours × hourly rate, when a rate is known. */
    burnedToDate: number | null;
    forecastAtCompletion: number | null;
  };
  milestones: {
    total: number;
    done: number;
    overdue: number;
    upcoming: Milestone[];
  };
  risks: {
    open: number;
    /** 5×5 matrix counts, `matrix[probability-1][impact-1]`. */
    matrix: number[][];
  };
  healthHistory: Array<{ date: IsoDateTime; health: ProjectHealth; progress: number | null }>;
}
