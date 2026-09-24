"use client";

import type { Skill } from "@repo/contracts";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { EntityCombobox } from "@/components/app/entity-combobox";
import { useCan } from "@/components/providers/session-provider";
import { CommandGroup, CommandItem, CommandSeparator } from "@/components/ui/command";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { skillsQuery } from "@/lib/api/skills";
import { humanize } from "@/lib/format";

/** Catalog picker; offers to create the searched skill when the principal may. */
export function SkillPicker({
  id,
  value,
  onSelect,
  onCreate,
  excludeIds,
}: {
  id?: string;
  value: Skill | null;
  onSelect: (skill: Skill | null) => void;
  onCreate: (name: string) => void;
  excludeIds: readonly string[];
}) {
  const can = useCan();
  const [search, setSearch] = useState("");
  const term = useDebouncedValue(search.trim());
  const { data, isPending } = useQuery(skillsQuery(term || undefined));
  const items = data?.filter((s) => !excludeIds.includes(s.id));
  const name = search.trim();
  const exists = data?.some((s) => s.name.toLowerCase() === name.toLowerCase());

  return (
    <EntityCombobox
      id={id}
      value={value?.id ?? null}
      selectedLabel={value?.name ?? null}
      items={items}
      getId={(s) => s.id}
      renderItem={(s) => (
        <>
          <span className="truncate">{s.name}</span>
          <span className="text-xs text-muted-foreground">{humanize(s.category)}</span>
        </>
      )}
      onSelect={onSelect}
      search={search}
      onSearchChange={setSearch}
      isLoading={isPending}
      placeholder="Choose a skill"
      searchPlaceholder="Search skills…"
      emptyText={can("create", "Skill") ? "No skill found — create it below." : "No skill found."}
      footer={(close) =>
        can("create", "Skill") && name && !exists ? (
          <>
            <CommandSeparator />
            <CommandGroup forceMount>
              <CommandItem
                value={`create:${name}`}
                forceMount
                onSelect={() => {
                  onCreate(name);
                  close();
                }}
              >
                <Plus /> Create “{name}”
              </CommandItem>
            </CommandGroup>
          </>
        ) : null
      }
    />
  );
}
