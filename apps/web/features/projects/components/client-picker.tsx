"use client";

import type { ClientSummary } from "@repo/contracts";
import { useQuery } from "@tanstack/react-query";
import { Building2 } from "lucide-react";
import { useState } from "react";
import { EntityCombobox } from "@/components/app/entity-combobox";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { clientsQuery } from "@/lib/api/clients";

type ClientOption = Pick<ClientSummary, "id" | "name">;

function ClientLabel({ client }: { client: ClientOption }) {
  return (
    <>
      <Building2 className="text-muted-foreground" />
      <span className="truncate">{client.name}</span>
    </>
  );
}

export function ClientPicker({
  id,
  value,
  onChange,
  selected,
  placeholder = "No client (internal)",
  className,
  "aria-invalid": invalid,
}: {
  id?: string;
  value: string | null;
  onChange: (clientId: string | null) => void;
  /** Label source for the current value when it isn't in the first page of results. */
  selected?: ClientOption | null;
  placeholder?: string;
  className?: string;
  "aria-invalid"?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<ClientOption | null>(null);
  const term = useDebouncedValue(search.trim());
  const { data, isPending } = useQuery({ ...clientsQuery({ search: term || undefined, pageSize: 20 }), staleTime: 30_000 });
  const current = [picked, selected, ...(data?.items ?? [])].find((c): c is ClientOption => !!c && c.id === value) ?? null;

  return (
    <EntityCombobox
      id={id}
      aria-invalid={invalid}
      value={value}
      selectedLabel={current ? <ClientLabel client={current} /> : null}
      items={data?.items}
      getId={(c) => c.id}
      renderItem={(c) => <ClientLabel client={c} />}
      onSelect={(c) => {
        setPicked(c);
        onChange(c?.id ?? null);
      }}
      search={search}
      onSearchChange={setSearch}
      isLoading={isPending}
      clearable
      placeholder={placeholder}
      className={className}
      searchPlaceholder="Search clients…"
      emptyText="No clients found."
    />
  );
}
