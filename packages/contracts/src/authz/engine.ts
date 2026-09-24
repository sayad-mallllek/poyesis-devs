import { ROLE_POLICIES } from "./policies.js";
import type {
  Action,
  Condition,
  PolicyRule,
  Principal,
  ResourceAttributes,
  Subject,
} from "./model.js";

/** Subjects whose "owner" attribute is the resource id itself. */
const SELF_BY_ID: ReadonlySet<Subject> = new Set(["User"]);
/** Subjects whose "project" attribute is the resource id itself. */
const PROJECT_BY_ID: ReadonlySet<Subject> = new Set(["Project"]);

const CONDITION_EVALUATORS: Record<
  Condition,
  (principal: Principal, subject: Subject, resource: ResourceAttributes) => boolean
> = {
  self: (p, subject, r) =>
    (SELF_BY_ID.has(subject) ? r.id : r.userId) === p.id,
  projectMember: (p, subject, r) => {
    const projectId = PROJECT_BY_ID.has(subject) ? r.id : r.projectId;
    return !!projectId && p.memberProjectIds.includes(projectId);
  },
  projectManager: (p, subject, r) => {
    const projectId = PROJECT_BY_ID.has(subject) ? r.id : r.projectId;
    return !!projectId && p.managedProjectIds.includes(projectId);
  },
  author: (p, _subject, r) => !!r.authorId && r.authorId === p.id,
};

export interface AuthorizationQuery {
  action: Action;
  subject: Subject;
  /**
   * Attributes of the concrete resource. When omitted, the question becomes
   * "may the principal perform this action on *some* resource of this type?"
   * which is what UIs need to decide whether to show an entry point.
   */
  resource?: ResourceAttributes;
  /** A specific field. When omitted, field-scoped deny rules are ignored. */
  field?: string;
}

export interface AuthorizationDecision {
  allowed: boolean;
  reason?: string;
}

/**
 * The listing scope of a principal for an action on a subject:
 *  - `all`: every resource;
 *  - `none`: nothing;
 *  - otherwise the resources satisfying at least one of the conditions.
 */
export type AccessScope =
  | { kind: "all" }
  | { kind: "none" }
  | { kind: "conditional"; anyOf: readonly Condition[] };

const toArray = <T>(value: T | readonly T[]): readonly T[] =>
  Array.isArray(value) ? (value as readonly T[]) : [value as T];

function matchesAction(rule: PolicyRule, action: Action): boolean {
  const actions = toArray(rule.action);
  return actions.includes("manage") || actions.includes(action);
}

function matchesSubject(rule: PolicyRule, subject: Subject): boolean {
  return rule.subject === "all" || rule.subject === subject;
}

function relevantRules(principal: Principal, action: Action, subject: Subject) {
  return ROLE_POLICIES[principal.role].filter(
    (rule) => matchesSubject(rule, subject) && matchesAction(rule, action),
  );
}

function conditionsHold(
  rule: PolicyRule,
  principal: Principal,
  subject: Subject,
  resource: ResourceAttributes | undefined,
): boolean {
  if (!rule.conditions?.length) return true;
  // Without a concrete resource a conditional rule *may* apply.
  if (!resource) return true;
  return rule.conditions.some((c) =>
    CONDITION_EVALUATORS[c](principal, subject, resource),
  );
}

export function authorize(
  principal: Principal,
  { action, subject, resource, field }: AuthorizationQuery,
): AuthorizationDecision {
  const rules = relevantRules(principal, action, subject);

  for (const rule of rules) {
    if (!rule.inverted) continue;
    // A field-scoped deny only applies when that field is being accessed.
    if (rule.fields && (!field || !rule.fields.includes(field))) continue;
    // Conditional denies need a concrete resource to be conclusive.
    if (rule.conditions?.length && !resource) continue;
    if (conditionsHold(rule, principal, subject, resource)) {
      return { allowed: false, reason: rule.reason };
    }
  }

  const allowed = rules.some(
    (rule) =>
      !rule.inverted &&
      (!field || !rule.fields || rule.fields.includes(field)) &&
      conditionsHold(rule, principal, subject, resource),
  );

  return allowed
    ? { allowed: true }
    : {
        allowed: false,
        reason: `Your role (${principal.role}) is not allowed to ${action} ${subject}${
          field ? `.${field}` : ""
        }`,
      };
}

export function can(
  principal: Principal,
  action: Action,
  subject: Subject,
  resource?: ResourceAttributes,
  field?: string,
): boolean {
  return authorize(principal, { action, subject, resource, field }).allowed;
}

/** Row-level scope used to filter list queries. Field rules are irrelevant here. */
export function accessScope(
  principal: Principal,
  action: Action,
  subject: Subject,
): AccessScope {
  const rules = relevantRules(principal, action, subject);

  if (rules.some((r) => r.inverted && !r.fields && !r.conditions?.length)) {
    return { kind: "none" };
  }

  const allows = rules.filter((r) => !r.inverted);
  if (allows.some((r) => !r.conditions?.length)) return { kind: "all" };

  const anyOf = [...new Set(allows.flatMap((r) => r.conditions ?? []))];
  return anyOf.length ? { kind: "conditional", anyOf } : { kind: "none" };
}

/** Filters a list of field names down to those the principal may access. */
export function permittedFields<F extends string>(
  principal: Principal,
  action: Action,
  subject: Subject,
  fields: readonly F[],
  resource?: ResourceAttributes,
): F[] {
  return fields.filter((field) => can(principal, action, subject, resource, field));
}

/**
 * Returns a shallow copy of `record` without the fields the principal may not
 * read. Only keys that are explicitly restricted by a policy are probed, so the
 * cost stays proportional to the number of sensitive fields.
 */
export function redactFields<T extends object>(
  principal: Principal,
  subject: Subject,
  record: T,
  restricted: readonly string[],
  resource?: ResourceAttributes,
): T {
  const copy = { ...record } as Record<string, unknown>;
  for (const field of restricted) {
    if (field in copy && !can(principal, "read", subject, resource, field)) {
      delete copy[field];
    }
  }
  return copy as T;
}
