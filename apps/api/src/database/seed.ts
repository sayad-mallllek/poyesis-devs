/**
 * Bootstraps the workspace: company settings and the first administrator.
 * With `--demo`, also loads a realistic sample workspace (skipped when it
 * already exists). Idempotent.
 *
 *   nub run db:seed            # company + admin
 *   nub run db:seed -- --demo  # + sample people, clients, projects, bookings
 */
import { PrismaPg } from "@prisma/adapter-pg";
import argon2 from "argon2";
import { PrismaClient } from "../generated/prisma/client.js";
import { CLIENTS, DEMO_PASSWORD, NOTES, PEOPLE, PROJECTS, SKILLS, TIME_OFF } from "./demo-data.js";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const DAY_MS = 86_400_000;
/** UTC midnight `offset` days from today, matching `@db.Date` storage. */
function day(offset: number): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) + offset * DAY_MS);
}

const hash = (password: string) => argon2.hash(password, { type: argon2.argon2id });

async function seedBase() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@poyesis.dev").toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";

  await prisma.company.upsert({
    where: { id: "company" },
    create: { id: "company", name: "Poyesis" },
    update: {},
  });
  const admin = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      firstName: "Workspace",
      lastName: "Admin",
      role: "ADMIN",
      jobTitle: "Administrator",
      passwordHash: await hash(password),
    },
    update: {},
  });
  console.log(`Administrator ready: ${admin.email}`);
  return admin;
}

async function seedDemo(adminId: string) {
  if (await prisma.project.findUnique({ where: { code: PROJECTS[0]!.code } })) {
    console.log("Demo data already present — skipping.");
    return;
  }

  const passwordHash = await hash(DEMO_PASSWORD);
  const skills = new Map<string, string>();
  for (const skill of SKILLS) {
    const row = await prisma.skill.upsert({ where: { name: skill.name }, create: skill, update: {} });
    skills.set(skill.name, row.id);
  }

  const people = new Map<string, string>([["admin", adminId]]);
  for (const person of PEOPLE) {
    const email = `${person.firstName}.${person.lastName}@poyesis.dev`.toLowerCase();
    const user = await prisma.user.upsert({
      where: { email },
      create: {
        email,
        passwordHash,
        firstName: person.firstName,
        lastName: person.lastName,
        role: person.role,
        jobTitle: person.jobTitle,
        department: person.department,
        weeklyCapacityHours: person.weeklyCapacityHours,
        costRate: person.costRate || null,
        hiredAt: day(-400),
      },
      update: {},
    });
    people.set(person.key, user.id);
    for (const [name, [level, rating]] of Object.entries(person.skills)) {
      await prisma.userSkill.upsert({
        where: { userId_skillId: { userId: user.id, skillId: skills.get(name)! } },
        create: {
          userId: user.id,
          skillId: skills.get(name)!,
          level,
          yearsOfExperience: level + 1,
          rating,
          ratedById: adminId,
          ratedAt: new Date(),
        },
        update: {},
      });
    }
  }

  const clients = new Map<string, string>();
  for (const { key, contacts, ...client } of CLIENTS) {
    const row = await prisma.client.create({ data: { ...client, contacts: { create: contacts } } });
    clients.set(key, row.id);
  }

  const projects = new Map<string, string>();
  for (const p of PROJECTS) {
    const ownerId = people.get(p.owner)!;
    const project = await prisma.project.create({
      data: {
        code: p.code,
        name: p.name,
        summary: p.summary,
        description: p.description,
        clientId: p.client ? clients.get(p.client)! : null,
        ownerId,
        status: p.status,
        health: p.health,
        priority: p.priority,
        type: p.type,
        billingModel: p.billingModel,
        color: p.color,
        startDate: day(p.start),
        targetEndDate: day(p.end),
        progress: p.progress,
        budgetAmount: p.budgetAmount,
        hourlyRate: p.hourlyRate,
        estimatedHours: p.estimatedHours,
        tags: p.tags,
        techStack: p.techStack,
        objectives: p.objectives,
        successCriteria: p.successCriteria,
        scope: p.scope,
        outOfScope: p.outOfScope,
        members: {
          create: [
            ...(p.members.some(([key]) => key === p.owner) ? [] : [{ userId: ownerId, projectRole: "LEAD" as const }]),
            ...p.members.map(([key, projectRole]) => ({ userId: people.get(key)!, projectRole })),
          ],
        },
        milestones: {
          create: p.milestones.map(([name, due, status]) => ({
            name,
            dueDate: day(due),
            status,
            completedAt: status === "DONE" ? day(due) : null,
          })),
        },
        risks: {
          create: p.risks.map(([title, probability, impact, mitigation]) => ({
            title,
            probability,
            impact,
            mitigation,
            ownerId,
          })),
        },
        statusUpdates: {
          create: p.updates.map(([ago, health, progress, summary]) => ({
            health,
            progress,
            summary,
            authorId: ownerId,
            createdAt: new Date(Date.now() - ago * DAY_MS),
          })),
        },
        allocations: {
          create: p.bookings.map(([key, start, end, hoursPerDay]) => ({
            userId: people.get(key)!,
            startDate: day(start),
            endDate: day(end),
            hoursPerDay,
            createdById: adminId,
          })),
        },
      },
    });
    projects.set(p.code, project.id);
  }

  await prisma.timeOff.createMany({
    data: TIME_OFF.map(([key, type, start, end, note]) => ({
      userId: people.get(key)!,
      type,
      startDate: day(start),
      endDate: day(end),
      note: note || null,
    })),
  });

  await prisma.userNote.createMany({
    data: NOTES.map(([about, author, type, content, project]) => ({
      userId: people.get(about)!,
      authorId: people.get(author)!,
      type,
      content,
      projectId: project ? projects.get(project)! : null,
    })),
  });

  console.log(
    `Demo workspace loaded: ${PEOPLE.length} people (password "${DEMO_PASSWORD}"), ${CLIENTS.length} clients, ${PROJECTS.length} projects.`,
  );
}

async function main() {
  const admin = await seedBase();
  if (process.argv.includes("--demo")) await seedDemo(admin.id);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
