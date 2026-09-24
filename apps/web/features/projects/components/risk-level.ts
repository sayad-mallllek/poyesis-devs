export type RiskLevel = "low" | "moderate" | "high" | "critical";

export const RISK_LEVELS: RiskLevel[] = ["low", "moderate", "high", "critical"];

/** Buckets a probability × impact score (1‥25) into a severity level. */
export const riskLevel = (score: number): RiskLevel =>
  score >= 15 ? "critical" : score >= 10 ? "high" : score >= 5 ? "moderate" : "low";

/**
 * Severity is a semantic heat scale built only from status tokens ("high" mixes warning and
 * destructive): washed when a matrix cell is empty, stronger when it holds risks.
 */
export const RISK_LEVEL_STYLE: Record<RiskLevel, { empty: string; filled: string; swatch: string; label: string; range: string }> = {
  low: { empty: "bg-success/8", filled: "bg-success/30", swatch: "bg-success/60", label: "Low", range: "1–4" },
  moderate: { empty: "bg-warning/10", filled: "bg-warning/40", swatch: "bg-warning/70", label: "Moderate", range: "5–9" },
  high: {
    empty: "bg-[color-mix(in_oklch,var(--warning),var(--destructive))]/10",
    filled: "bg-[color-mix(in_oklch,var(--warning),var(--destructive))]/40",
    swatch: "bg-[color-mix(in_oklch,var(--warning),var(--destructive))]/70",
    label: "High",
    range: "10–14",
  },
  critical: { empty: "bg-destructive/10", filled: "bg-destructive/35", swatch: "bg-destructive/70", label: "Critical", range: "15–25" },
};
