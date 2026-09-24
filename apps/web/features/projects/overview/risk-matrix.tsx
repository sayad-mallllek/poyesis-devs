"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { RISK_LEVEL_STYLE, RISK_LEVELS, riskLevel } from "../components/risk-level";

const SCALE = [1, 2, 3, 4, 5];

/** 5×5 probability × impact heatmap of open risks; `matrix[p-1][i-1]` is the count. */
export function RiskMatrix({ matrix, open, projectId }: { matrix: number[][]; open: number; projectId: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Risk matrix</CardTitle>
        <CardDescription>
          {open} open risk{open === 1 ? "" : "s"} by probability and impact
        </CardDescription>
        <CardAction>
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/projects/${projectId}/risks`}>View all</Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <div className="flex w-4 items-center justify-center">
            <span className="-rotate-90 text-xs whitespace-nowrap text-muted-foreground">Probability →</span>
          </div>
          <div className="flex-1">
            <div role="grid" aria-label="Risk matrix" className="grid grid-cols-[1rem_repeat(5,1fr)] gap-0.5">
              {[...SCALE].reverse().map((p) => (
                <div role="row" key={p} className="contents">
                  <span className="flex items-center justify-center text-xs text-muted-foreground tabular-nums">{p}</span>
                  {SCALE.map((i) => {
                    const count = matrix[p - 1]?.[i - 1] ?? 0;
                    const score = p * i;
                    const level = riskLevel(score);
                    const style = RISK_LEVEL_STYLE[level];
                    return (
                      <Tooltip key={i}>
                        <TooltipTrigger asChild>
                          <div
                            role="gridcell"
                            tabIndex={0}
                            aria-label={`Probability ${p}, impact ${i}, score ${score}: ${count} risk${count === 1 ? "" : "s"}`}
                            className={cn(
                              "flex aspect-square items-center justify-center rounded-[4px] text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                              count ? cn(style.filled, "font-semibold text-foreground") : style.empty,
                            )}
                          >
                            {count > 0 && count}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="font-medium">
                            {count} risk{count === 1 ? "" : "s"}
                          </div>
                          <div>
                            P{p} × I{i} = {score} · {style.label}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              ))}
              <span />
              {SCALE.map((i) => (
                <span key={i} className="pt-1 text-center text-xs text-muted-foreground tabular-nums">
                  {i}
                </span>
              ))}
            </div>
            <p className="pt-0.5 text-center text-xs text-muted-foreground">Impact →</p>
          </div>
        </div>
        <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground" aria-label="Severity legend">
          {RISK_LEVELS.map((level) => (
            <li key={level} className="flex items-center gap-1.5">
              <span className={cn("size-2.5 rounded-[3px]", RISK_LEVEL_STYLE[level].swatch)} aria-hidden />
              {RISK_LEVEL_STYLE[level].label} ({RISK_LEVEL_STYLE[level].range})
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
