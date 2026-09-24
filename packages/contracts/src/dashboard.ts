import { type } from "arktype";
import type { IsoDate, IsoDateTime, UserRef } from "./common.js";
import type { ProjectHealth, ProjectStatus } from "./enums.js";
import type { ProjectSummary } from "./projects.js";

export interface DashboardOverview {
  projects: {
    total: number;
    byStatus: Record<ProjectStatus, number>;
    byHealth: Record<ProjectHealth, number>;
  };
  upcomingDeadlines: Array<
    Pick<
      ProjectSummary,
      "id" | "code" | "name" | "color" | "health" | "progress" | "targetEndDate"
    > & { daysRemaining: number }
  >;
  overdueMilestones: Array<{
    id: string;
    name: string;
    dueDate: IsoDate;
    project: { id: string; code: string; name: string; color: string };
  }>;
  utilization: {
    weekStart: IsoDate;
    capacityHours: number;
    bookedHours: number;
    /** 0‥100+, may exceed 100 when people are over-booked. */
    percent: number;
    overbooked: Array<{ user: UserRef; bookedHours: number; capacityHours: number }>;
    underbooked: Array<{ user: UserRef; bookedHours: number; capacityHours: number }>;
  };
  headcount: number;
  clients: number;
}

export const listAuditLogsQuerySchema = type({
  "page?": "string.integer.parse |> number.integer >= 1",
  "pageSize?": "string.integer.parse |> 1 <= number.integer <= 100",
  "entityType?": "string",
  "entityId?": "string",
  "actorId?": "string",
});
export type ListAuditLogsQuery = typeof listAuditLogsQuerySchema.infer;

export interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  actor: UserRef | null;
  /** `web` or `ai` — AI-initiated mutations are always attributed. */
  origin: "web" | "ai" | "system";
  metadata: Record<string, unknown> | null;
  createdAt: IsoDateTime;
}
