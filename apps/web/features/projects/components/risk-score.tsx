import { cn } from "@/lib/utils";
import { RISK_LEVEL_STYLE, riskLevel } from "./risk-level";

/** Probability × impact score with its severity wash; the level is spelled out for screen readers and on hover. */
export function RiskScore({ score, className }: { score: number; className?: string }) {
  const style = RISK_LEVEL_STYLE[riskLevel(score)];
  return (
    <span
      title={`${style.label} risk`}
      className={cn(
        "inline-flex h-6 min-w-8 items-center justify-center rounded-md px-1.5 text-xs font-semibold tabular-nums text-foreground",
        style.filled,
        className,
      )}
    >
      {score}
      <span className="sr-only"> ({style.label})</span>
    </span>
  );
}
