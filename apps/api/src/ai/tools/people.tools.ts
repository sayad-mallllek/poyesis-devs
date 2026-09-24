import {
  createSkillSchema,
  createUserNoteSchema,
  createUserSchema,
  rateUserSkillSchema,
  ROLES,
  updateUserSchema,
  upsertUserSkillSchema,
  USER_STATUSES,
  type UserSummary,
} from "@repo/contracts";
import { type } from "arktype";
import type { Actor } from "../../authz/actor.js";
import { pickOne } from "./references.js";
import type { ToolDeps } from "./tool-deps.js";
import { defineTool, idArg, type AssistantTool } from "./tool-kit.js";

const personRef = type("string > 0").describe("user id, email or full name");

const brief = (u: UserSummary) => ({
  id: u.id,
  name: `${u.firstName} ${u.lastName}`,
  email: u.email,
  role: u.role,
  status: u.status,
  jobTitle: u.jobTitle,
  department: u.department,
  weeklyCapacityHours: u.weeklyCapacityHours,
  activeProjectCount: u.activeProjectCount,
});

export async function resolvePerson(deps: ToolDeps, actor: Actor, reference: string) {
  const candidates = await deps.users.resolve(actor, reference);
  return pickOne(candidates, "person", reference, (u) => `${u.firstName} ${u.lastName} <${u.email}> (id ${u.id})`);
}

export function peopleTools(deps: ToolDeps): AssistantTool[] {
  return [
    defineTool({
      name: "search_people",
      label: "Searching people",
      description: "Find people by name, email, job title, role, department or skill. Returns ids.",
      requires: { action: "read", subject: "User" },
      schema: type({
        "search?": "string",
        "role?": type.enumerated(...ROLES),
        "status?": type.enumerated(...USER_STATUSES),
        "department?": "string",
        "skillId?": type("string").describe("id from list_skills"),
      }),
      run: async ({ actor }, input) => {
        const page = await deps.users.list(actor, { ...input, pageSize: 50 });
        return { total: page.total, people: page.items.map(brief) };
      },
    }),
    defineTool({
      name: "get_person",
      label: "Reading profile",
      description:
        "A person's profile, projects, skills (ratings only when the user is an administrator) and — when permitted — notes, remarks and warnings about them.",
      requires: { action: "read", subject: "User" },
      schema: type({ person: personRef }),
      run: async ({ actor }, { person }) => {
        const { id } = await resolvePerson(deps, actor, person);
        const [profile, skills, notes] = await Promise.all([
          deps.users.get(actor, id),
          deps.userSkills.list(actor, id),
          deps.notes.list(actor, id).catch(() => null),
        ]);
        return {
          profile,
          skills,
          notes: notes?.map((n) => ({
            type: n.type,
            content: n.content,
            author: `${n.author.firstName} ${n.author.lastName}`,
            project: n.project?.name ?? null,
            createdAt: n.createdAt,
          })),
        };
      },
    }),
    defineTool({
      name: "create_user",
      label: "Creating user",
      description:
        "Create a user account. Ask for name, email and role if missing. Generate a strong temporary password (≥10 chars, letters + digits) unless the user provides one, and tell the user to share it securely.",
      requires: { action: "create", subject: "User" },
      schema: createUserSchema,
      run: async ({ actor }, input) => {
        const user = await deps.users.create(actor, input);
        return { ...brief(user), temporaryPassword: input.password };
      },
    }),
    defineTool({
      name: "update_user",
      label: "Updating profile",
      description: "Update a person's profile, role, status or capacity. Only send the fields that change.",
      requires: { action: "update", subject: "User" },
      schema: type({ userId: idArg, changes: updateUserSchema }),
      run: async ({ actor }, { userId, changes }) => brief(await deps.users.update(actor, userId, changes)),
    }),
    defineTool({
      name: "suspend_user",
      label: "Suspend user",
      description: "Suspend a user account (revokes their sessions). The user is asked to confirm.",
      requires: { action: "delete", subject: "User" },
      mode: "confirm",
      schema: type({ userId: idArg, personName: "string" }),
      describe: ({ personName }) => `Suspend ${personName}. They will be signed out and unable to log in.`,
      run: async ({ actor }, { userId }) => brief(await deps.users.suspend(actor, userId)),
    }),
    defineTool({
      name: "list_skills",
      label: "Reading skill catalog",
      description: "The skill catalog with ids and how many people have each skill.",
      requires: { action: "read", subject: "Skill" },
      schema: type({ "search?": "string" }),
      run: ({ actor }, input) => deps.skills.list(actor, input),
    }),
    defineTool({
      name: "create_skill",
      label: "Adding skill to catalog",
      description: "Add a skill to the catalog.",
      requires: { action: "create", subject: "Skill" },
      schema: createSkillSchema,
      run: ({ actor }, input) => deps.skills.create(actor, input),
    }),
    defineTool({
      name: "set_user_skill",
      label: "Updating skill",
      description: "Set a person's self-assessed skill level (1–5) and years of experience.",
      requires: { action: "update", subject: "UserSkill" },
      schema: type({ userId: idArg, skillId: idArg, skill: upsertUserSkillSchema }),
      run: ({ actor }, { userId, skillId, skill }) => deps.userSkills.upsert(actor, userId, skillId, skill),
    }),
    defineTool({
      name: "rate_user_skill",
      label: "Rating skill",
      description: "Administrator rating (1–5, or null to clear) of a person's skill, with an optional note.",
      requires: { action: "update", subject: "UserSkill" },
      schema: type({ userId: idArg, skillId: idArg, rating: rateUserSkillSchema }),
      run: ({ actor }, { userId, skillId, rating }) => deps.userSkills.rate(actor, userId, skillId, rating),
    }),
    defineTool({
      name: "add_user_note",
      label: "Adding note",
      description: "Record a remark, note, warning or kudos about a person, optionally tied to a project.",
      requires: { action: "create", subject: "UserNote" },
      schema: type({ userId: idArg, note: createUserNoteSchema }),
      run: ({ actor }, { userId, note }) => deps.notes.create(actor, userId, note),
    }),
  ];
}
