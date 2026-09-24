import { memo, useMemo } from "react";
import { cn } from "@/lib/utils";
import { LEFT_COLUMN_CLASS } from "./schedule-row";
import { monthSpans, weekSpans, type TimelineDay, type TimelineSpan } from "./timeline";

function SpanRow({ spans, column, className }: { spans: TimelineSpan[]; column: number; className?: string }) {
  return (
    <div className={cn("flex", className)}>
      {spans.map((s) => (
        <div
          key={s.key}
          title={s.title}
          className="shrink-0 truncate border-r px-2 text-xs leading-7 font-medium"
          style={{ width: s.span * column }}
        >
          {s.label}
        </div>
      ))}
    </div>
  );
}

export const ScheduleHeader = memo(function ScheduleHeader({
  days,
  column,
  label,
}: {
  days: readonly TimelineDay[];
  column: number;
  label: React.ReactNode;
}) {
  const perDay = column >= 24;
  const weeks = useMemo(() => weekSpans(days), [days]);
  const months = useMemo(() => monthSpans(days), [days]);

  return (
    <div className="sticky top-0 z-30 flex border-b bg-card">
      <div
        className={cn(
          "sticky left-0 z-40 flex shrink-0 items-end border-r bg-card px-3 pb-2 text-xs font-medium text-muted-foreground",
          LEFT_COLUMN_CLASS,
        )}
      >
        {label}
      </div>
      <div className="shrink-0" style={{ width: days.length * column }}>
        <SpanRow spans={perDay ? weeks : months} column={column} className="border-b" />
        {perDay ? (
          <div className="flex">
            {days.map((day) => (
              <div
                key={day.date}
                className={cn(
                  "flex h-9 shrink-0 flex-col items-center justify-center border-r border-border/60 text-[10px] leading-tight text-muted-foreground",
                  !day.isWorkingDay && "bg-muted/70",
                )}
                style={{ width: column }}
              >
                <span className="uppercase">{day.weekday}</span>
                <span
                  className={cn(
                    "grid size-5 place-items-center rounded-full text-xs font-medium tabular-nums",
                    day.isToday ? "bg-primary text-primary-foreground" : "text-foreground",
                  )}
                >
                  {day.label}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <SpanRow spans={weeks} column={column} className="h-9 [&>div]:leading-9 [&>div]:font-normal [&>div]:text-muted-foreground" />
        )}
      </div>
    </div>
  );
});
