import type { TimelineBlock } from "@repo/contracts";
import { TONE_DOT } from "@/components/app/status-badges";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { BlockCard } from "./block-card";
import { UI_TONE } from "./tone";

export function TimelineBlockView({ block }: { block: TimelineBlock }) {
  const items = [...block.items].sort((a, b) => a.date.localeCompare(b.date));
  return (
    <BlockCard title={block.title}>
      <ol className="relative ml-1.5 space-y-3 border-l pl-4">
        {items.map((item, i) => (
          <li key={`${item.date}-${i}`} className="relative">
            <span
              className={cn(
                "absolute top-1 -left-[21px] size-2.5 rounded-full ring-2 ring-card",
                TONE_DOT[UI_TONE[item.tone ?? "default"]],
              )}
              aria-hidden
            />
            <time className="text-xs text-muted-foreground tabular-nums">{formatDate(item.date)}</time>
            <p className="text-sm font-medium leading-snug">{item.label}</p>
            {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
          </li>
        ))}
      </ol>
    </BlockCard>
  );
}
