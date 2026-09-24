"use client";

import type { Paginated, ProjectSummary, UserSummary } from "@repo/contracts";
import { useQuery } from "@tanstack/react-query";
import { FolderKanban, Plus, Sparkles, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { create } from "zustand";
import { useCan } from "@/components/providers/session-provider";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { api } from "@/lib/api/client";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useAssistantStore } from "@/lib/stores/assistant-store";
import { PRIMARY_NAV, SETTINGS_NAV } from "./nav";

export const useCommandPalette = create<{ open: boolean; setOpen: (open: boolean) => void }>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));

export function CommandPalette() {
  const router = useRouter();
  const can = useCan();
  const { open, setOpen } = useCommandPalette();
  const toggleAssistant = useAssistantStore((s) => s.toggle);
  const [search, setSearch] = useState("");
  const term = useDebouncedValue(search.trim(), 200);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) return;
      if (event.key === "k") {
        event.preventDefault();
        setOpen(!useCommandPalette.getState().open);
      } else if (event.key === "j") {
        event.preventDefault();
        toggleAssistant();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen, toggleAssistant]);

  const enabled = open && term.length > 1;
  const projects = useQuery({
    queryKey: ["palette", "projects", term],
    queryFn: () => api.get<Paginated<ProjectSummary>>("projects", { search: term, pageSize: 5 }),
    enabled: enabled && can("read", "Project"),
  });
  const people = useQuery({
    queryKey: ["palette", "people", term],
    queryFn: () => api.get<Paginated<UserSummary>>("users", { search: term, pageSize: 5 }),
    enabled: enabled && can("read", "User"),
  });

  const go = (href: string) => {
    setOpen(false);
    setSearch("");
    router.push(href);
  };

  const pages = [...PRIMARY_NAV, ...SETTINGS_NAV].filter(
    (item) => !item.requires || can(item.requires.action, item.requires.subject),
  );

  return (
    <CommandDialog open={open} onOpenChange={setOpen} shouldFilter={false}>
      <CommandInput placeholder="Search projects, people, pages…" value={search} onValueChange={setSearch} />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        {!!projects.data?.items.length && (
          <CommandGroup heading="Projects">
            {projects.data.items.map((p) => (
              <CommandItem key={p.id} value={`project-${p.id}`} onSelect={() => go(`/projects/${p.id}`)}>
                <FolderKanban />
                <span>{p.name}</span>
                <span className="ml-auto font-mono text-xs text-muted-foreground">{p.code}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {!!people.data?.items.length && (
          <CommandGroup heading="People">
            {people.data.items.map((u) => (
              <CommandItem key={u.id} value={`user-${u.id}`} onSelect={() => go(`/people/${u.id}`)}>
                <UserRound />
                <span>
                  {u.firstName} {u.lastName}
                </span>
                <span className="ml-auto text-xs text-muted-foreground">{u.jobTitle}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        <CommandGroup heading="Actions">
          {can("create", "Project") && (
            <CommandItem value="new-project" onSelect={() => go("/projects/new")}>
              <Plus /> New project
            </CommandItem>
          )}
          <CommandItem
            value="ask-assistant"
            onSelect={() => {
              setOpen(false);
              toggleAssistant();
            }}
          >
            <Sparkles /> Ask the assistant
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Go to">
          {pages
            .filter((p) => !term || p.title.toLowerCase().includes(term.toLowerCase()))
            .map((item) => (
              <CommandItem key={item.href} value={`page-${item.href}`} onSelect={() => go(item.href)}>
                <item.icon /> {item.title}
              </CommandItem>
            ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
