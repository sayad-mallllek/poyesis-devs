import type { Role } from "../enums.js";

/**
 * Attribute-Based Access Control model.
 *
 * A decision is computed from three kinds of attributes:
 *  - **subject** (the principal): id, role, project memberships;
 *  - **resource**: the attributes a rule condition needs (`id`, `userId`,
 *    `projectId`, `authorId`), passed explicitly by the caller;
 *  - **action** and, optionally, the **field** being accessed.
 *
 * Roles are predefined bundles of rules (see `policies.ts`); rules may be
 * constrained by named conditions over those attributes and scoped to fields.
 */

export const ACTIONS = ["create", "read", "update", "delete", "manage"] as const;
export type Action = (typeof ACTIONS)[number];

export const SUBJECTS = [
  "Company",
  "User",
  "Client",
  "Project",
  "ProjectMember",
  "Milestone",
  "Risk",
  "StatusUpdate",
  "Attachment",
  "RepositoryLink",
  "SentryLink",
  "Allocation",
  "TimeOff",
  "Skill",
  "UserSkill",
  "UserNote",
  "Integration",
  "ChatSession",
  "AuditLog",
] as const;
export type Subject = (typeof SUBJECTS)[number];

/**
 * Named, attribute-based conditions. Each one is a pure predicate over the
 * principal and the resource attributes; the API additionally knows how to
 * translate each one into a database filter so list endpoints stay consistent
 * with single-resource checks.
 *
 * - `self`: the resource belongs to the principal (`resource.userId`, or
 *   `resource.id` for the `User` subject).
 * - `projectMember`: the principal is a member of the resource's project.
 * - `projectManager`: the principal owns or leads the resource's project.
 * - `author`: the principal authored the resource (`resource.authorId`).
 */
export const CONDITIONS = [
  "self",
  "projectMember",
  "projectManager",
  "author",
] as const;
export type Condition = (typeof CONDITIONS)[number];

/** The authenticated subject of an access decision. */
export interface Principal {
  id: string;
  role: Role;
  /** Projects the principal belongs to (any project role, or owner). */
  memberProjectIds: readonly string[];
  /** Projects the principal owns or has the `LEAD` project role on. */
  managedProjectIds: readonly string[];
}

/** Resource attributes consulted by conditions. Unknown keys are ignored. */
export interface ResourceAttributes {
  id?: string | null;
  userId?: string | null;
  projectId?: string | null;
  authorId?: string | null;
}

export interface PolicyRule {
  subject: Subject | "all";
  action: Action | readonly Action[];
  /** Rule applies only when *any* of these conditions holds. */
  conditions?: readonly Condition[];
  /** Rule applies only to these fields. Omitted = the whole resource. */
  fields?: readonly string[];
  /** A deny rule. Deny rules always win over allow rules. */
  inverted?: boolean;
  /** Human readable explanation, surfaced in 403 responses and audits. */
  reason?: string;
}

export type RolePolicy = readonly PolicyRule[];
