import type { ProjectAnalytics, ProjectDetail, UserRef } from "@repo/contracts";
import { describe, expect, it } from "vitest";
import { renderProjectContext, truncate, type ProjectContextData } from "./project-context.js";

const ada: UserRef = { id: "u1", firstName: "Ada", lastName: "Lovelace", email: "ada@x.dev", avatarUrl: null, jobTitle: "CTO" };

const project: ProjectDetail = {
  id: "p1",
  code: "ACME-WEB",
  name: "Acme Website",
  summary: "Rebuild the marketing site",
  status: "ACTIVE",
  health: "AT_RISK",
  priority: "HIGH",
  type: "CLIENT",
  color: "#4f46e5",
  progress: 40,
  startDate: "2026-09-01",
  targetEndDate: "2026-12-01",
  client: { id: "c1", name: "Acme" },
  owner: ada,
  memberCount: 1,
  tags: ["web"],
  isConfidential: false,
  createdAt: "2026-09-01T00:00:00.000Z",
  description: "Long description",
  billingModel: "FIXED_PRICE",
  actualEndDate: null,
  budgetAmount: 50_000,
  currency: "EUR",
  estimatedHours: 400,
  hourlyRate: 90,
  techStack: ["Next.js"],
  objectives: "Ship it",
  successCriteria: null,
  scope: null,
  outOfScope: null,
  assumptions: null,
  constraints: null,
  links: [{ label: "Figma", url: "https://figma.com/x" }],
  members: [{ user: ada, projectRole: "LEAD", joinedAt: "2026-09-01T00:00:00.000Z" }],
  milestones: [],
  counts: { attachments: 2, openRisks: 0, repositories: 0, sentryProjects: 0 },
  updatedAt: "2026-09-01T00:00:00.000Z",
};

const analytics = {
  schedule: { timeElapsedPercent: 25, scheduleVariance: 15, daysRemaining: 60 },
  effort: { bookedHoursToDate: 80, bookedHoursTotal: 320 },
  budget: { burnedToDate: 7200, forecastAtCompletion: 28_800 },
  milestones: { total: 0, done: 0, overdue: 0, upcoming: [] },
} as unknown as ProjectAnalytics;

const data = (overrides: Partial<ProjectContextData> = {}): ProjectContextData => ({
  project,
  analytics,
  openRisks: [],
  statusUpdates: [],
  attachments: [
    { id: "a1", fileName: "brief.md", mimeType: "text/markdown", text: "B".repeat(50_000) },
    { id: "a2", fileName: "logo.png", mimeType: "image/png", text: null },
    { id: "a3", fileName: "spec.pdf", mimeType: "application/pdf", text: "S".repeat(50_000) },
  ],
  ...overrides,
});

describe("renderProjectContext", () => {
  it("renders the key facts", () => {
    const md = renderProjectContext(data());
    expect(md).toContain("# Project ACME-WEB — Acme Website");
    expect(md).toContain("Client: Acme · Owner: Ada Lovelace");
    expect(md).toContain("- Ada Lovelace (LEAD) — CTO");
    expect(md).toContain("burned to date 7200");
    expect(md).toContain("- logo.png (image/png)");
  });

  it("stays within budget and shares it among attachment excerpts", () => {
    const md = renderProjectContext(data(), 10_000);
    expect(md.length).toBeLessThanOrEqual(10_000);
    expect(md).toContain("### Attachment excerpt: brief.md");
    expect(md).toContain("### Attachment excerpt: spec.pdf");
    const brief = md.split("### Attachment excerpt: brief.md")[1]!.split("###")[0]!;
    const spec = md.split("### Attachment excerpt: spec.pdf")[1]!;
    expect(Math.abs(brief.length - spec.length)).toBeLessThan(100);
  });

  it("omits sections the principal may not read", () => {
    const md = renderProjectContext(data({ openRisks: null, statusUpdates: null, attachments: null }));
    expect(md).not.toContain("## Open risks");
    expect(md).not.toContain("## Latest status updates");
    expect(md).not.toContain("## Attachments");
  });

  it("truncates with a marker", () => {
    expect(truncate("abc", 5)).toBe("abc");
    const cut = truncate("x".repeat(100), 30);
    expect(cut).toHaveLength(30);
    expect(cut.endsWith("[truncated]")).toBe(true);
  });
});
