import type { TimeOffType } from "@repo/contracts";

export type UtilizationLevel = "over" | "healthy" | "moderate" | "low";

/** >100% over-booked, 80–100% healthy, 50–80% moderate, <50% under-used. */
export function utilizationLevel(percent: number): UtilizationLevel {
  if (percent > 100) return "over";
  if (percent >= 80) return "healthy";
  if (percent >= 50) return "moderate";
  return "low";
}

export const UTILIZATION_TEXT: Record<UtilizationLevel, string> = {
  over: "text-destructive",
  healthy: "text-success",
  moderate: "text-foreground",
  low: "text-muted-foreground",
};

export const UTILIZATION_BAR: Record<UtilizationLevel, string> = {
  over: "bg-destructive",
  healthy: "bg-success",
  moderate: "bg-primary",
  low: "bg-muted-foreground/40",
};

export const TIME_OFF_LABEL: Record<TimeOffType, string> = {
  VACATION: "Vacation",
  SICK: "Sick leave",
  HOLIDAY: "Public holiday",
  OTHER: "Time off",
};
