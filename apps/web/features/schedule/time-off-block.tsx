import type { TimeOff } from "@repo/contracts";
import { Palmtree } from "lucide-react";
import { dayOffset, formatRange } from "./timeline";
import { TIME_OFF_LABEL } from "./utilization";

/** Hatched absence band; only its label is interactive so the days stay selectable around it. */
export function TimeOffBlock({
  entry,
  from,
  dayCount,
  column,
  onOpen,
}: {
  entry: TimeOff;
  from: string;
  dayCount: number;
  column: number;
  onOpen?: (entry: TimeOff) => void;
}) {
  const start = Math.max(dayOffset(from, entry.startDate), 0);
  const end = Math.min(dayOffset(from, entry.endDate), dayCount - 1);
  if (end < start) return null;
  const width = (end - start + 1) * column;
  const label = TIME_OFF_LABEL[entry.type];

  return (
    <div
      className="pointer-events-none absolute inset-y-0 z-[5] border-x border-muted-foreground/20 bg-[repeating-linear-gradient(135deg,color-mix(in_oklch,var(--muted-foreground)_16%,transparent)_0_2px,transparent_2px_7px)] bg-muted/60"
      style={{ left: start * column, width }}
    >
      {width >= 22 && (
        <button
          type="button"
          disabled={!onOpen}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onOpen?.(entry)}
          title={`${label} · ${formatRange(entry.startDate, entry.endDate)}${entry.note ? ` · ${entry.note}` : ""}`}
          className="pointer-events-auto absolute bottom-1 left-1 flex max-w-[calc(100%-0.5rem)] items-center gap-1 rounded bg-background/90 px-1 py-0.5 text-[10px] font-medium text-muted-foreground shadow-xs enabled:hover:text-foreground disabled:cursor-default"
        >
          <Palmtree className="size-3 shrink-0" />
          {width >= 70 ? <span className="truncate">{label}</span> : <span className="sr-only">{label}</span>}
        </button>
      )}
    </div>
  );
}
