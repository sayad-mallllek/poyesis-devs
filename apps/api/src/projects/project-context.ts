import type { ProjectAnalytics, ProjectDetail, Risk, StatusUpdate, UserRef } from "@repo/contracts";
import type { AttachmentText } from "./attachments.service.js";

/** Default total size of a project digest handed to the LLM. */
export const CONTEXT_BUDGET_CHARS = 30_000;
const LONG_FIELD_CHARS = 6_000;
const FIELD_CHARS = 2_000;
const MAX_MILESTONES = 30;
const MAX_RISKS = 20;
/** Below this, an attachment excerpt is not worth including. */
const MIN_EXCERPT_CHARS = 400;

export interface ProjectContextData {
  project: ProjectDetail;
  analytics: ProjectAnalytics;
  /** `null` when the principal may not read that kind of record. */
  openRisks: Risk[] | null;
  statusUpdates: StatusUpdate[] | null;
  attachments: AttachmentText[] | null;
}

const TRUNCATED = " … [truncated]";

export function truncate(text: string, max: number): string {
  return text.length <= max ? text : text.slice(0, Math.max(0, max - TRUNCATED.length)).trimEnd() + TRUNCATED;
}

const person = (u: UserRef) => `${u.firstName} ${u.lastName}`.trim();
const orDash = (value: string | number | null | undefined) => (value == null || value === "" ? "—" : String(value));

function section(title: string, body: string | null | undefined, max = FIELD_CHARS): string[] {
  const text = body?.trim();
  return text ? [`## ${title}`, truncate(text, max), ""] : [];
}

function core({ project: p, analytics: a, openRisks, statusUpdates, attachments }: ProjectContextData): string {
  const s = a.schedule;
  const lines = [
    `# Project ${p.code} — ${p.name}`,
    "",
    `- Status: ${p.status} · Health: ${p.health} · Priority: ${p.priority} · Type: ${p.type} · Billing: ${p.billingModel}`,
    `- Client: ${p.client?.name ?? "none (internal)"} · Owner: ${person(p.owner)} <${p.owner.email}>`,
    `- Dates: start ${orDash(p.startDate)} · target end ${orDash(p.targetEndDate)} · actual end ${orDash(p.actualEndDate)}`,
    `- Progress: ${p.progress}%` +
      (s.timeElapsedPercent != null ? ` · time elapsed ${s.timeElapsedPercent}% · schedule variance ${s.scheduleVariance}` : "") +
      (s.daysRemaining != null ? ` · days remaining ${s.daysRemaining}` : ""),
    `- Effort: estimated ${orDash(p.estimatedHours)} h · booked to date ${a.effort.bookedHoursToDate} h · booked total ${a.effort.bookedHoursTotal} h`,
    `- Budget: ${p.budgetAmount != null ? `${p.budgetAmount} ${p.currency}` : "—"} · hourly rate ${orDash(p.hourlyRate)}` +
      (a.budget.burnedToDate != null ? ` · burned to date ${a.budget.burnedToDate} · forecast ${a.budget.forecastAtCompletion}` : ""),
    ...(p.tags.length ? [`- Tags: ${p.tags.join(", ")}`] : []),
    ...(p.techStack.length ? [`- Tech stack: ${p.techStack.join(", ")}`] : []),
    ...(p.isConfidential ? ["- Confidential project"] : []),
    ...(p.links.length ? [`- Links: ${p.links.map((l) => `[${l.label}](${l.url})`).join(", ")}`] : []),
    "",
    ...section("Summary", p.summary),
    ...section("Description", p.description, LONG_FIELD_CHARS),
    ...section("Objectives", p.objectives),
    ...section("Success criteria", p.successCriteria),
    ...section("Scope", p.scope),
    ...section("Out of scope", p.outOfScope),
    ...section("Assumptions", p.assumptions),
    ...section("Constraints", p.constraints),
    "## Team",
    ...p.members.map((m) => `- ${person(m.user)} (${m.projectRole})${m.user.jobTitle ? ` — ${m.user.jobTitle}` : ""}`),
    "",
    `## Milestones (${a.milestones.done}/${a.milestones.total} done, ${a.milestones.overdue} overdue)`,
    ...(p.milestones.length
      ? p.milestones.slice(0, MAX_MILESTONES).map((m) => `- ${m.dueDate} · ${m.status} · ${m.name}`)
      : ["- none"]),
    "",
  ];
  if (openRisks) {
    lines.push(
      "## Open risks (score = probability × impact)",
      ...(openRisks.length
        ? openRisks
            .slice(0, MAX_RISKS)
            .map(
              (r) =>
                `- [${r.score}] ${r.title} (P${r.probability}×I${r.impact}, ${r.status}` +
                `${r.owner ? `, owner ${person(r.owner)}` : ""})` +
                `${r.mitigation ? ` — mitigation: ${truncate(r.mitigation, 300)}` : ""}`,
            )
        : ["- none"]),
      "",
    );
  }
  if (statusUpdates) {
    lines.push(
      "## Latest status updates",
      ...(statusUpdates.length
        ? statusUpdates.map(
            (u) =>
              `- ${u.createdAt.slice(0, 10)} · ${u.health}${u.progress != null ? ` · ${u.progress}%` : ""} · ` +
              `${person(u.author)}: ${truncate(u.summary.replace(/\s+/g, " "), 600)}`,
          )
        : ["- none"]),
      "",
    );
  }
  if (attachments) {
    lines.push(
      "## Attachments",
      ...(attachments.length ? attachments.map((f) => `- ${f.fileName} (${f.mimeType})`) : ["- none"]),
      "",
    );
  }
  return lines.join("\n");
}

/**
 * Renders a compact markdown digest of a project for an LLM. The core facts
 * come first; whatever budget remains is shared evenly among attachment excerpts.
 */
export function renderProjectContext(data: ProjectContextData, budget = CONTEXT_BUDGET_CHARS): string {
  const head = truncate(core(data), budget);
  const withText = (data.attachments ?? []).filter((f) => f.text);
  let remaining = budget - head.length;
  const excerpts: string[] = [];
  for (const [index, file] of withText.entries()) {
    const heading = `\n\n### Attachment excerpt: ${file.fileName}\n`;
    const share = Math.floor(remaining / (withText.length - index)) - heading.length;
    if (share < Math.min(MIN_EXCERPT_CHARS, file.text!.length)) continue;
    const excerpt = heading + truncate(file.text!, share);
    excerpts.push(excerpt);
    remaining -= excerpt.length;
  }
  return head + excerpts.join("");
}
