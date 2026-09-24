"use client";

import type { ChatPageContext } from "@repo/contracts";
import { Sparkles } from "lucide-react";

function suggestionsFor(context: ChatPageContext): string[] {
  if (context.projectId) {
    return [
      "Summarize this project's status, risks and next milestones",
      "Chart booked hours against the estimate for this project",
      "Who could join this project next month for 20h a week?",
      "Show recent pull requests and failing CI runs",
    ];
  }
  if (context.userId) {
    return [
      "What is this person working on over the next 4 weeks?",
      "Summarize their skills and recent notes",
      "Find a project that matches their skills and availability",
    ];
  }
  return [
    "Which projects are at risk, and why?",
    "Who is over-booked this week?",
    "Show upcoming deadlines on a timeline",
    "Create a new project",
  ];
}

export function Suggestions({ context, onPick }: { context: ChatPageContext; onPick: (text: string) => void }) {
  return (
    <div className="flex h-full flex-col justify-end gap-4 px-4 py-6">
      <div className="space-y-1">
        <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Sparkles className="size-4.5" />
        </span>
        <h3 className="pt-2 text-base font-semibold">How can I help?</h3>
        <p className="text-sm text-muted-foreground">
          I can analyze projects, plan resources and make changes across the workspace for you.
        </p>
      </div>
      <div className="grid gap-2">
        {suggestionsFor(context).map((text) => (
          <button
            key={text}
            type="button"
            onClick={() => onPick(text)}
            className="rounded-lg border bg-card px-3 py-2 text-left text-sm transition-colors hover:border-primary/40 hover:bg-accent"
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}
