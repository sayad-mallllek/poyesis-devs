import { cn } from "@/lib/utils";

export type MeterTone = "primary" | "neutral" | "success" | "warning" | "danger";

const FILL: Record<MeterTone, string> = {
  primary: "bg-primary",
  neutral: "bg-muted-foreground/60",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
};

// The track is a lighter step of the fill's own hue so the state reads across the whole bar.
const TRACK: Record<MeterTone, string> = {
  primary: "bg-primary/15",
  neutral: "bg-muted-foreground/15",
  success: "bg-success/15",
  warning: "bg-warning/20",
  danger: "bg-destructive/15",
};

/** A labelled horizontal meter; `marker` draws a thin tick (e.g. a forecast) on the track. */
export function Meter({
  label,
  value,
  display,
  tone = "primary",
  marker,
  markerLabel,
}: {
  label: string;
  /** 0‥100 (clamped). */
  value: number;
  display: string;
  tone?: MeterTone;
  marker?: number;
  markerLabel?: string;
}) {
  const pct = Math.min(Math.max(value, 0), 100);
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">{display}</span>
      </div>
      <div
        role="meter"
        aria-label={label}
        aria-valuenow={Math.round(value)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={display}
        className={cn("relative h-2 rounded-full", TRACK[tone])}
      >
        <div className={cn("h-full rounded-full transition-[width]", FILL[tone])} style={{ width: `${pct}%` }} />
        {marker !== undefined && (
          <span
            title={markerLabel}
            aria-hidden
            className="absolute -top-1 h-4 w-0.5 -translate-x-1/2 rounded-full bg-foreground ring-2 ring-card"
            style={{ left: `${Math.min(Math.max(marker, 0), 100)}%` }}
          />
        )}
      </div>
    </div>
  );
}
