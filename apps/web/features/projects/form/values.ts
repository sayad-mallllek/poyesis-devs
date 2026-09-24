import type { CreateProjectInput, ProjectDetail, UpdateProjectInput } from "@repo/contracts";
import { emptyToNull } from "@/lib/forms";
import { PROJECT_COLORS } from "../components/color-swatches";

/** Every field present, so inputs are always controlled. */
export type ProjectFormValues = Required<CreateProjectInput>;

export function toFormValues(ownerId: string, project?: ProjectDetail): ProjectFormValues {
  return {
    name: project?.name ?? "",
    code: project?.code ?? "",
    summary: project?.summary ?? "",
    description: project?.description ?? "",
    status: project?.status ?? "PLANNING",
    health: project?.health ?? "ON_TRACK",
    priority: project?.priority ?? "MEDIUM",
    type: project?.type ?? "CLIENT",
    billingModel: project?.billingModel ?? "TIME_AND_MATERIALS",
    clientId: project?.client?.id ?? null,
    ownerId: project?.owner.id ?? ownerId,
    startDate: project?.startDate ?? null,
    targetEndDate: project?.targetEndDate ?? null,
    actualEndDate: project?.actualEndDate ?? null,
    budgetAmount: project?.budgetAmount ?? null,
    currency: project?.currency ?? "EUR",
    estimatedHours: project?.estimatedHours ?? null,
    hourlyRate: project?.hourlyRate ?? null,
    progress: project?.progress ?? 0,
    color: project?.color ?? PROJECT_COLORS[0].value,
    tags: project?.tags ?? [],
    techStack: project?.techStack ?? [],
    objectives: project?.objectives ?? "",
    successCriteria: project?.successCriteria ?? "",
    scope: project?.scope ?? "",
    outOfScope: project?.outOfScope ?? "",
    assumptions: project?.assumptions ?? "",
    constraints: project?.constraints ?? "",
    links: project?.links ?? [],
    isConfidential: project?.isConfidential ?? false,
    members: [],
  };
}

/**
 * Inputs yield "" for blank optional fields; the API expects null. A blank code is
 * omitted so the API generates one from the name.
 */
/** Membership is managed on the Team tab, so edits never send `members`. */
export function normalizeUpdate(values: ProjectFormValues): UpdateProjectInput {
  const { code, members: _, links, ...rest } = values;
  const trimmedCode = code.trim().toUpperCase();
  return {
    ...emptyToNull(rest),
    name: values.name.trim(),
    currency: values.currency.toUpperCase(),
    ...(trimmedCode && { code: trimmedCode }),
    links: links.map((l) => ({ label: l.label.trim(), url: l.url.trim() })),
  };
}

export function normalizeCreate(values: ProjectFormValues): CreateProjectInput {
  return {
    ...normalizeUpdate(values),
    name: values.name.trim(),
    // The API adds the owner as LEAD itself; blank rows from the picker are dropped.
    members: values.members.filter((m) => m.userId && m.userId !== values.ownerId),
  };
}
