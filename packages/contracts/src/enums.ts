/**
 * Domain enumerations shared by the API (Prisma enums mirror these values 1:1)
 * and the web app. Declared as `as const` tuples so they can drive ArkType
 * validators, select inputs and exhaustive switches from a single source.
 */

export const ROLES = ["ADMIN", "MANAGER", "MEMBER", "GUEST"] as const;
export type Role = (typeof ROLES)[number];

export const USER_STATUSES = ["ACTIVE", "SUSPENDED"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const CLIENT_STATUSES = ["LEAD", "ACTIVE", "INACTIVE"] as const;
export type ClientStatus = (typeof CLIENT_STATUSES)[number];

export const PROJECT_STATUSES = [
  "PLANNING",
  "ACTIVE",
  "ON_HOLD",
  "COMPLETED",
  "CANCELLED",
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_HEALTHS = ["ON_TRACK", "AT_RISK", "OFF_TRACK"] as const;
export type ProjectHealth = (typeof PROJECT_HEALTHS)[number];

export const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const PROJECT_TYPES = [
  "CLIENT",
  "INTERNAL",
  "RESEARCH",
  "MAINTENANCE",
] as const;
export type ProjectType = (typeof PROJECT_TYPES)[number];

export const BILLING_MODELS = [
  "FIXED_PRICE",
  "TIME_AND_MATERIALS",
  "RETAINER",
  "NON_BILLABLE",
] as const;
export type BillingModel = (typeof BILLING_MODELS)[number];

export const PROJECT_MEMBER_ROLES = [
  "LEAD",
  "CONTRIBUTOR",
  "REVIEWER",
  "STAKEHOLDER",
] as const;
export type ProjectMemberRole = (typeof PROJECT_MEMBER_ROLES)[number];

export const MILESTONE_STATUSES = [
  "PENDING",
  "IN_PROGRESS",
  "DONE",
  "MISSED",
] as const;
export type MilestoneStatus = (typeof MILESTONE_STATUSES)[number];

export const RISK_STATUSES = ["OPEN", "MITIGATING", "CLOSED"] as const;
export type RiskStatus = (typeof RISK_STATUSES)[number];

export const NOTE_TYPES = ["REMARK", "NOTE", "WARNING", "KUDOS"] as const;
export type NoteType = (typeof NOTE_TYPES)[number];

export const TIME_OFF_TYPES = ["VACATION", "SICK", "HOLIDAY", "OTHER"] as const;
export type TimeOffType = (typeof TIME_OFF_TYPES)[number];

export const INTEGRATION_PROVIDERS = ["GITHUB", "SENTRY"] as const;
export type IntegrationProvider = (typeof INTEGRATION_PROVIDERS)[number];

export const SKILL_CATEGORIES = [
  "FRONTEND",
  "BACKEND",
  "MOBILE",
  "DEVOPS",
  "DATA",
  "DESIGN",
  "MANAGEMENT",
  "SOFT_SKILL",
  "OTHER",
] as const;
export type SkillCategory = (typeof SKILL_CATEGORIES)[number];

export const CHAT_ROLES = ["user", "assistant"] as const;
export type ChatRole = (typeof CHAT_ROLES)[number];
