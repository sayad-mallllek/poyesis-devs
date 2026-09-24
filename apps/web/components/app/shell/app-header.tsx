"use client";

import { Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAssistantStore } from "@/lib/stores/assistant-store";
import { useCommandPalette } from "./command-palette";

export function AppHeader() {
  const toggleAssistant = useAssistantStore((s) => s.toggle);
  const assistantOpen = useAssistantStore((s) => s.open);
  const openPalette = useCommandPalette((s) => s.setOpen);

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 data-[orientation=vertical]:h-4" />
      <Button
        variant="outline"
        className="h-8 w-full max-w-72 justify-start gap-2 text-muted-foreground"
        onClick={() => openPalette(true)}
      >
        <Search className="size-4" />
        <span className="flex-1 text-left text-sm">Search or jump to…</span>
        <Kbd>⌘K</Kbd>
      </Button>
      <div className="ml-auto flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={assistantOpen ? "secondary" : "ghost"}
              size="sm"
              className="gap-2"
              onClick={toggleAssistant}
              aria-pressed={assistantOpen}
            >
              <Sparkles className="size-4 text-primary" />
              <span className="hidden sm:inline">Assistant</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Toggle assistant <Kbd>⌘J</Kbd>
          </TooltipContent>
        </Tooltip>
      </div>
    </header>
  );
}
