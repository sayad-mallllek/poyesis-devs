import {
  projectLinkSchema,
  type Attachment,
  type Milestone,
  type ProjectDetail,
  type ProjectLink,
  type ProjectMember,
  type ProjectSummary,
  type Risk,
  type StatusUpdate,
} from "@repo/contracts";
import { type } from "arktype";
import {
  decimalToNumber,
  toIsoDate,
  toIsoDateOrNull,
  toIsoOrNull,
  toUserRef,
  userRefSelect,
} from "../common/serialization/index.js";
import type { Prisma } from "../generated/prisma/client.js";

export const OPEN_RISK_STATUSES = ["OPEN", "MITIGATING"] as const;

export const memberInclude = { user: { select: userRefSelect } } as const satisfies Prisma.ProjectMemberInclude;
/** Leads first (enum order), then by seniority on the project. */
export const memberOrder = [
  { projectRole: "asc" },
  { joinedAt: "asc" },
] as const satisfies Prisma.ProjectMemberOrderByWithRelationInput[];

export const riskInclude = { owner: { select: userRefSelect } } as const satisfies Prisma.ProjectRiskInclude;
export const statusUpdateInclude = {
  author: { select: userRefSelect },
} as const satisfies Prisma.ProjectStatusUpdateInclude;

/** Everything but the (potentially large) extracted text. */
export const attachmentSelect = {
  id: true,
  projectId: true,
  fileName: true,
  mimeType: true,
  sizeBytes: true,
  storageKey: true,
  createdAt: true,
  uploadedById: true,
  uploadedBy: { select: userRefSelect },
} as const satisfies Prisma.ProjectAttachmentSelect;

export const summaryInclude = {
  client: { select: { id: true, name: true } },
  owner: { select: userRefSelect },
  _count: { select: { members: true } },
} as const satisfies Prisma.ProjectInclude;

export const detailInclude = {
  ...summaryInclude,
  members: { include: memberInclude, orderBy: memberOrder },
  milestones: { orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }] },
  _count: {
    select: {
      members: true,
      attachments: true,
      risks: { where: { status: { in: [...OPEN_RISK_STATUSES] } } },
      repositoryLinks: true,
      sentryLinks: true,
    },
  },
} as const satisfies Prisma.ProjectInclude;

type SummaryRow = Prisma.ProjectGetPayload<{ include: typeof summaryInclude }>;
type DetailRow = Prisma.ProjectGetPayload<{ include: typeof detailInclude }>;
type MemberRow = Prisma.ProjectMemberGetPayload<{ include: typeof memberInclude }>;
type RiskRow = Prisma.ProjectRiskGetPayload<{ include: typeof riskInclude }>;
type StatusUpdateRow = Prisma.ProjectStatusUpdateGetPayload<{ include: typeof statusUpdateInclude }>;
type AttachmentRow = Prisma.ProjectAttachmentGetPayload<{ select: typeof attachmentSelect }>;
type MilestoneRow = Prisma.MilestoneGetPayload<object>;

/** `links` is a JSON column; entries that no longer satisfy the contract are dropped. */
export function toProjectLinks(value: Prisma.JsonValue): ProjectLink[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const link = projectLinkSchema(item);
    return link instanceof type.errors ? [] : [link];
  });
}

export function toProjectSummary(row: SummaryRow): ProjectSummary {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    summary: row.summary,
    status: row.status,
    health: row.health,
    priority: row.priority,
    type: row.type,
    color: row.color,
    progress: row.progress,
    startDate: toIsoDateOrNull(row.startDate),
    targetEndDate: toIsoDateOrNull(row.targetEndDate),
    client: row.client,
    owner: toUserRef(row.owner),
    memberCount: row._count.members,
    tags: row.tags,
    isConfidential: row.isConfidential,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toProjectDetail(row: DetailRow): ProjectDetail {
  return {
    ...toProjectSummary(row),
    description: row.description,
    billingModel: row.billingModel,
    actualEndDate: toIsoDateOrNull(row.actualEndDate),
    budgetAmount: decimalToNumber(row.budgetAmount),
    currency: row.currency,
    estimatedHours: row.estimatedHours,
    hourlyRate: decimalToNumber(row.hourlyRate),
    techStack: row.techStack,
    objectives: row.objectives,
    successCriteria: row.successCriteria,
    scope: row.scope,
    outOfScope: row.outOfScope,
    assumptions: row.assumptions,
    constraints: row.constraints,
    links: toProjectLinks(row.links),
    members: row.members.map(toProjectMember),
    milestones: row.milestones.map(toMilestone),
    counts: {
      attachments: row._count.attachments,
      openRisks: row._count.risks,
      repositories: row._count.repositoryLinks,
      sentryProjects: row._count.sentryLinks,
    },
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const toProjectMember = (row: MemberRow): ProjectMember => ({
  user: toUserRef(row.user),
  projectRole: row.projectRole,
  joinedAt: row.joinedAt.toISOString(),
});

export const toMilestone = (row: MilestoneRow): Milestone => ({
  id: row.id,
  projectId: row.projectId,
  name: row.name,
  description: row.description,
  dueDate: toIsoDate(row.dueDate),
  status: row.status,
  completedAt: toIsoOrNull(row.completedAt),
});

export const toRisk = (row: RiskRow): Risk => ({
  id: row.id,
  projectId: row.projectId,
  title: row.title,
  description: row.description,
  probability: row.probability,
  impact: row.impact,
  score: row.probability * row.impact,
  status: row.status,
  mitigation: row.mitigation,
  owner: row.owner ? toUserRef(row.owner) : null,
  createdAt: row.createdAt.toISOString(),
});

export const toStatusUpdate = (row: StatusUpdateRow): StatusUpdate => ({
  id: row.id,
  projectId: row.projectId,
  health: row.health,
  summary: row.summary,
  progress: row.progress,
  author: toUserRef(row.author),
  createdAt: row.createdAt.toISOString(),
});

export const toAttachment = (row: AttachmentRow, hasExtractedText: boolean): Attachment => ({
  id: row.id,
  projectId: row.projectId,
  fileName: row.fileName,
  mimeType: row.mimeType,
  sizeBytes: row.sizeBytes,
  hasExtractedText,
  uploadedBy: toUserRef(row.uploadedBy),
  createdAt: row.createdAt.toISOString(),
});
