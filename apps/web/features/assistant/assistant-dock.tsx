"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useAssistantStore } from "@/lib/stores/assistant-store";
import { AssistantPanel } from "./assistant-panel";

/**
 * The assistant follows the user across pages: a side panel that can expand
 * to full screen. On small screens the panel is always full screen.
 */
export function AssistantDock() {
  const pathname = usePathname();
  const { open, expanded, setOpen, setExpanded } = useAssistantStore();

  useEffect(() => {
    if (!expanded) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setExpanded(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded, setExpanded]);

  // The dedicated page already shows the full assistant.
  if (!open || pathname.startsWith("/assistant")) return null;

  if (expanded) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-background" role="dialog" aria-label="Assistant">
        <AssistantPanel layout="wide" onClose={() => setOpen(false)} />
      </div>
    );
  }

  return (
    <aside
      aria-label="Assistant"
      className="fixed inset-0 z-40 flex flex-col border-l bg-background md:sticky md:top-14 md:z-10 md:h-[calc(100svh-3.5rem)] md:w-[400px] md:shrink-0 xl:w-[440px]"
    >
      <AssistantPanel layout="dock" onClose={() => setOpen(false)} />
    </aside>
  );
}
