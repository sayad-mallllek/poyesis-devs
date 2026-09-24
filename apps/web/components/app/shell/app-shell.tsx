"use client";

import type { ReactNode } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AssistantDock } from "@/features/assistant/assistant-dock";
import { AppHeader } from "./app-header";
import { AppSidebar } from "./app-sidebar";
import { CommandPalette } from "./command-palette";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-w-0">
        <AppHeader />
        <div className="flex min-h-0 flex-1">
          <main className="min-w-0 flex-1">{children}</main>
          <AssistantDock />
        </div>
      </SidebarInset>
      <CommandPalette />
    </SidebarProvider>
  );
}
