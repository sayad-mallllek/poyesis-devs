import type { Role } from "../enums.js";
import type { PolicyRule, RolePolicy, Subject } from "./model.js";

/** Children of a project inherit the project's membership semantics. */
const PROJECT_CHILDREN = [
  "ProjectMember",
  "Milestone",
  "Risk",
  "StatusUpdate",
  "Attachment",
  "RepositoryLink",
  "SentryLink",
] as const satisfies readonly Subject[];

/** Fields of a skill assessment that only administrators may see or set. */
export const SKILL_RATING_FIELDS = [
  "rating",
  "ratingNote",
  "ratedBy",
  "ratedAt",
] as const;

/** Compensation data, restricted to administrators. */
export const USER_SENSITIVE_FIELDS = ["costRate"] as const;

/** Fields a user may change on their own profile. */
export const USER_SELF_EDITABLE_FIELDS = [
  "firstName",
  "lastName",
  "jobTitle",
  "phone",
  "avatarUrl",
  "timezone",
  "bio",
] as const;

const denyRatings: PolicyRule = {
  subject: "UserSkill",
  action: ["read", "update"],
  fields: SKILL_RATING_FIELDS,
  inverted: true,
  reason: "Skill ratings are restricted to administrators",
};

const denySensitiveUserFields: PolicyRule = {
  subject: "User",
  action: ["read", "update"],
  fields: USER_SENSITIVE_FIELDS,
  inverted: true,
  reason: "Compensation data is restricted to administrators",
};

const ownChatSessions: PolicyRule = {
  subject: "ChatSession",
  action: "manage",
  conditions: ["self"],
};

const ownProfile: PolicyRule = {
  subject: "User",
  action: "update",
  conditions: ["self"],
  fields: USER_SELF_EDITABLE_FIELDS,
};

/**
 * Predefined roles. Rules are additive; `inverted` rules subtract.
 *
 * - ADMIN   – full control, including ratings, compensation and integrations.
 * - MANAGER – runs projects and resourcing; manages the projects they own/lead.
 * - MEMBER  – works on assigned projects; manages their own profile, skills,
 *             time off, and sees the schedule of their projects.
 * - GUEST   – read-only access to the projects they were invited to.
 */
export const ROLE_POLICIES: Record<Role, RolePolicy> = {
  ADMIN: [{ subject: "all", action: "manage" }],

  MANAGER: [
    { subject: "Company", action: "read" },
    { subject: "User", action: "read" },
    ownProfile,
    denySensitiveUserFields,

    { subject: "Client", action: "manage" },

    { subject: "Project", action: ["create", "read"] },
    {
      subject: "Project",
      action: ["update", "delete"],
      conditions: ["projectManager"],
    },
    ...PROJECT_CHILDREN.flatMap<PolicyRule>((subject) => [
      { subject, action: "read" },
      { subject, action: "manage", conditions: ["projectManager"] },
    ]),
    { subject: "StatusUpdate", action: "create", conditions: ["projectMember"] },
    { subject: "Attachment", action: "create", conditions: ["projectMember"] },

    { subject: "Allocation", action: "manage" },
    { subject: "TimeOff", action: "manage" },

    { subject: "Skill", action: ["read", "create"] },
    { subject: "UserSkill", action: "read" },
    { subject: "UserSkill", action: "manage", conditions: ["self"] },
    denyRatings,

    { subject: "UserNote", action: ["create", "read"] },
    { subject: "UserNote", action: ["update", "delete"], conditions: ["author"] },

    ownChatSessions,
  ],

  MEMBER: [
    { subject: "Company", action: "read" },
    { subject: "User", action: "read" },
    ownProfile,
    denySensitiveUserFields,

    { subject: "Client", action: "read" },

    { subject: "Project", action: "read", conditions: ["projectMember"] },
    ...PROJECT_CHILDREN.flatMap<PolicyRule>((subject) => [
      { subject, action: "read", conditions: ["projectMember"] },
      { subject, action: "manage", conditions: ["projectManager"] },
    ]),
    { subject: "Project", action: "update", conditions: ["projectManager"] },
    { subject: "StatusUpdate", action: "create", conditions: ["projectMember"] },
    { subject: "Attachment", action: "create", conditions: ["projectMember"] },
    {
      subject: "Attachment",
      action: "delete",
      conditions: ["author"],
    },

    {
      subject: "Allocation",
      action: "read",
      conditions: ["self", "projectMember"],
    },
    { subject: "TimeOff", action: "read" },
    { subject: "TimeOff", action: "manage", conditions: ["self"] },

    { subject: "Skill", action: "read" },
    { subject: "UserSkill", action: "read" },
    { subject: "UserSkill", action: "manage", conditions: ["self"] },
    denyRatings,

    ownChatSessions,
  ],

  GUEST: [
    { subject: "Company", action: "read" },
    { subject: "User", action: "read" },
    ownProfile,
    denySensitiveUserFields,

    { subject: "Project", action: "read", conditions: ["projectMember"] },
    ...PROJECT_CHILDREN.filter((s) => s !== "Attachment").map<PolicyRule>(
      (subject) => ({ subject, action: "read", conditions: ["projectMember"] }),
    ),
    { subject: "Skill", action: "read" },

    ownChatSessions,
  ],
};

export const ROLE_DESCRIPTIONS: Record<Role, { label: string; summary: string }> = {
  ADMIN: {
    label: "Administrator",
    summary:
      "Full control of the workspace, including users, ratings, compensation and integrations.",
  },
  MANAGER: {
    label: "Manager",
    summary:
      "Creates projects and clients, plans resources, and manages projects they own or lead.",
  },
  MEMBER: {
    label: "Member",
    summary:
      "Works on assigned projects and manages their own profile, skills and time off.",
  },
  GUEST: {
    label: "Guest",
    summary: "Read-only access to the projects they were invited to.",
  },
};
