"use client";

import type { ConfirmBlock } from "@repo/contracts";
import { Check, ShieldAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BlockAnswer, RespondToBlock } from "./types";

export function ConfirmBlockView({
  block,
  answer,
  onRespond,
}: {
  block: ConfirmBlock;
  answer: BlockAnswer;
  onRespond: RespondToBlock;
}) {
  const answered = answer !== undefined;
  const confirmed = answer?.confirmed === true;
  return (
    <section
      className={cn(
        "rounded-xl border p-3",
        block.danger ? "border-destructive/30 bg-destructive/5" : "bg-card",
        answered && "opacity-80",
      )}
    >
      <div className="flex gap-2.5">
        <ShieldAlert className={cn("mt-0.5 size-4 shrink-0", block.danger ? "text-destructive" : "text-primary")} />
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-medium">{block.title}</h4>
          <p className="mt-0.5 text-sm text-muted-foreground">{block.description}</p>
          {answered ? (
            <p className="mt-2 flex items-center gap-1 text-xs font-medium text-muted-foreground">
              {confirmed ? <Check className="size-3.5" /> : <X className="size-3.5" />}
              {confirmed ? "Confirmed" : "Declined"}
            </p>
          ) : (
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                variant={block.danger ? "destructive" : "default"}
                disabled={!onRespond}
                onClick={() => onRespond?.(block.id, { confirmed: true })}
              >
                {block.confirmLabel ?? "Confirm"}
              </Button>
              <Button size="sm" variant="outline" disabled={!onRespond} onClick={() => onRespond?.(block.id, { confirmed: false })}>
                Cancel
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
