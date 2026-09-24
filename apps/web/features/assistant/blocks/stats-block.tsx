import type { StatsBlock } from "@repo/contracts";
import { TONE_DOT } from "@/components/app/status-badges";
import { cn } from "@/lib/utils";
import { BlockCard } from "./block-card";
import { UI_TONE } from "./tone";

export function StatsBlockView({ block }: { block: StatsBlock }) {
  return (
    <BlockCard title={block.title}>
      <dl className="grid grid-cols-2 gap-2 @md/assistant:grid-cols-3">
        {block.items.map((item) => (
          <div key={item.label} className="rounded-lg bg-muted/50 p-2.5">
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {item.tone && item.tone !== "default" && (
                <span className={cn("size-1.5 rounded-full", TONE_DOT[UI_TONE[item.tone]])} aria-hidden />
              )}
              {item.label}
            </dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums leading-none">{item.value}</dd>
            {item.hint && <dd className="mt-1 text-xs text-muted-foreground">{item.hint}</dd>}
          </div>
        ))}
      </dl>
    </BlockCard>
  );
}
