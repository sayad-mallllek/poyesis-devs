"use client";

import type { Allocation } from "@repo/contracts";
import { memo } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatHours } from "@/lib/format";
import { cn } from "@/lib/utils";
import { formatRange, type LaidOut } from "./timeline";

export const LANE_HEIGHT = 24;
export const LANE_GAP = 3;
export const TRACK_PADDING = 6;

/** Picks dark or light text for a project's hex color (WCAG relative luminance). */
function readableOn(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
  return luminance > 0.4 ? "oklch(0.2 0.02 264)" : "#fff";
}

export const BookingBar = memo(function BookingBar({
  bar,
  column,
  interactive,
  onOpen,
}: {
  bar: LaidOut<Allocation>;
  column: number;
  interactive: boolean;
  onOpen: (allocation: Allocation) => void;
}) {
  const { item, start, end, lane, clippedStart, clippedEnd } = bar;
  const width = (end - start + 1) * column - 4;
  const color = item.project.color;
  const hours = `${formatHours(item.hoursPerDay)}/d`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={`${item.project.name}, ${hours}, ${formatRange(item.startDate, item.endDate)}${item.tentative ? ", tentative" : ""}`}
          aria-disabled={!interactive}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => interactive && onOpen(item)}
          className={cn(
            "absolute z-10 flex items-center gap-1 overflow-hidden px-1.5 text-left text-[11px] leading-none font-medium shadow-xs transition-[filter,box-shadow] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
            interactive ? "cursor-pointer hover:shadow-md hover:brightness-110" : "cursor-default",
            clippedStart ? "rounded-l-none" : "rounded-l-md",
            clippedEnd ? "rounded-r-none" : "rounded-r-md",
            item.tentative && "border border-dashed text-foreground shadow-none",
          )}
          style={{
            left: start * column + 2,
            width,
            top: TRACK_PADDING + lane * (LANE_HEIGHT + LANE_GAP),
            height: LANE_HEIGHT,
            ...(item.tentative
              ? { borderColor: color, background: `color-mix(in oklch, ${color} 18%, transparent)` }
              : { background: color, color: readableOn(color) }),
          }}
        >
          {width > 64 && <span className="min-w-0 truncate">{item.project.name}</span>}
          {width > 26 && (
            <span className="shrink-0 font-normal tabular-nums opacity-75">
              {width > 64 ? `· ${hours}` : formatHours(item.hoursPerDay)}
            </span>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-64">
        <div className="font-medium">
          {item.project.name} <span className="font-mono opacity-70">{item.project.code}</span>
        </div>
        <div className="opacity-80">
          {formatRange(item.startDate, item.endDate)} · {hours}
          {item.includeWeekends && " · incl. weekends"}
          {item.tentative && " · tentative"}
        </div>
        {item.note && <div className="mt-1 opacity-80">{item.note}</div>}
      </TooltipContent>
    </Tooltip>
  );
});
