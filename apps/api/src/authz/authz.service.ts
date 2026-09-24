import { ForbiddenException, Injectable } from "@nestjs/common";
import {
  accessScope,
  authorize,
  redactFields,
  type Action,
  type Condition,
  type Principal,
  type ResourceAttributes,
  type Subject,
} from "@repo/contracts";

type Where = Record<string, unknown>;
type ConditionFilters = Partial<Record<Condition, (p: Principal) => Where>>;

const inProjects = (ids: readonly string[]) => ({ projectId: { in: [...ids] } });

const projectChildFilters: ConditionFilters = {
  projectMember: (p) => inProjects(p.memberProjectIds),
  projectManager: (p) => inProjects(p.managedProjectIds),
};

/**
 * Translation of named ABAC conditions into Prisma `where` fragments, so list
 * endpoints return exactly the rows a single-resource check would allow.
 * A condition missing here is treated as matching nothing (fail closed).
 */
const CONDITION_FILTERS: Partial<Record<Subject, ConditionFilters>> = {
  User: { self: (p) => ({ id: p.id }) },
  Project: {
    projectMember: (p) => ({ id: { in: [...p.memberProjectIds] } }),
    projectManager: (p) => ({ id: { in: [...p.managedProjectIds] } }),
  },
  ProjectMember: projectChildFilters,
  Milestone: projectChildFilters,
  Risk: projectChildFilters,
  StatusUpdate: { ...projectChildFilters, author: (p) => ({ authorId: p.id }) },
  Attachment: { ...projectChildFilters, author: (p) => ({ uploadedById: p.id }) },
  RepositoryLink: projectChildFilters,
  SentryLink: projectChildFilters,
  Allocation: { ...projectChildFilters, self: (p) => ({ userId: p.id }) },
  TimeOff: { self: (p) => ({ userId: p.id }) },
  UserSkill: { self: (p) => ({ userId: p.id }) },
  UserNote: { self: (p) => ({ userId: p.id }), author: (p) => ({ authorId: p.id }) },
  ChatSession: { self: (p) => ({ userId: p.id }) },
};

/** Prisma idiom for "matches nothing". */
const NOTHING: Where = { OR: [] };

@Injectable()
export class AuthzService {
  can(
    principal: Principal,
    action: Action,
    subject: Subject,
    resource?: ResourceAttributes,
    field?: string,
  ): boolean {
    return authorize(principal, { action, subject, resource, field }).allowed;
  }

  /** Throws 403 with the policy's reason when the action is not allowed. */
  assert(
    principal: Principal,
    action: Action,
    subject: Subject,
    resource?: ResourceAttributes,
    field?: string,
  ): void {
    const decision = authorize(principal, { action, subject, resource, field });
    if (!decision.allowed) throw new ForbiddenException(decision.reason);
  }

  /**
   * Asserts that every key present in `input` may be written. Used for partial
   * updates so that e.g. a member editing their profile cannot change `role`.
   */
  assertFields(
    principal: Principal,
    action: Action,
    subject: Subject,
    input: object,
    resource?: ResourceAttributes,
  ): void {
    const forbidden = Object.entries(input)
      .filter(([, value]) => value !== undefined)
      .map(([key]) => key)
      .filter((field) => !this.can(principal, action, subject, resource, field));
    if (forbidden.length) {
      throw new ForbiddenException(`You are not allowed to change: ${forbidden.join(", ")}`);
    }
  }

  /** Removes restricted fields the principal may not read. */
  redact<T extends object>(
    principal: Principal,
    subject: Subject,
    record: T,
    restricted: readonly string[],
    resource?: ResourceAttributes,
  ): T {
    return redactFields(principal, subject, record, restricted, resource);
  }

  /** Row-level filter for list queries; combine with `AND` alongside user filters. */
  where<W extends object = Where>(principal: Principal, action: Action, subject: Subject): W {
    const scope = accessScope(principal, action, subject);
    if (scope.kind === "all") return {} as W;
    if (scope.kind === "none") return NOTHING as W;

    const filters = CONDITION_FILTERS[subject] ?? {};
    const clauses = scope.anyOf.flatMap((c) => {
      const build = filters[c];
      return build ? [build(principal)] : [];
    });
    return (clauses.length ? { OR: clauses } : NOTHING) as W;
  }
}
