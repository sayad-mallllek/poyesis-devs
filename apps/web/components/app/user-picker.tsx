"use client";

import type { UserRef, UserStatus } from "@repo/contracts";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { usersQuery } from "@/lib/api/users";
import { EntityCombobox } from "./entity-combobox";
import { fullName, UserAvatar } from "./user-avatar";

export type UserOption = Pick<UserRef, "id" | "firstName" | "lastName" | "avatarUrl"> &
  Partial<Pick<UserRef, "email" | "jobTitle">> & { weeklyCapacityHours?: number };

export function UserLabel({ user, detail }: { user: UserOption; detail?: boolean }) {
  return (
    <>
      <UserAvatar user={user} className="size-5 text-[10px]" />
      <span className="truncate">{fullName(user)}</span>
      {detail && user.jobTitle && <span className="truncate text-xs text-muted-foreground">{user.jobTitle}</span>}
    </>
  );
}

export interface UserPickerProps {
  id?: string;
  value: string | null;
  onChange: (userId: string | null, user: UserOption | null) => void;
  /** Label source for a preselected value that may not be in the first page of results. */
  selected?: UserOption | null;
  /** Defaults to active people only, since most pickers assign work. */
  status?: UserStatus | null;
  placeholder?: string;
  clearable?: boolean;
  disabled?: boolean;
  size?: "sm" | "default";
  className?: string;
  "aria-invalid"?: boolean;
}

export function UserPicker({
  value,
  onChange,
  selected,
  status = "ACTIVE",
  placeholder = "Select a person",
  ...props
}: UserPickerProps) {
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<UserOption | null>(null);
  const term = useDebouncedValue(search.trim());
  const { data, isPending } = useQuery({
    ...usersQuery({ search: term || undefined, status: status ?? undefined, pageSize: 20 }),
    staleTime: 30_000,
  });
  const current =
    [picked, selected, ...(data?.items ?? [])].find((u): u is UserOption => !!u && u.id === value) ?? null;

  return (
    <EntityCombobox
      {...props}
      value={value}
      selectedLabel={current ? <UserLabel user={current} /> : null}
      items={data?.items}
      getId={(u) => u.id}
      renderItem={(u) => <UserLabel user={u} detail />}
      onSelect={(u) => {
        setPicked(u);
        onChange(u?.id ?? null, u);
      }}
      search={search}
      onSearchChange={setSearch}
      isLoading={isPending}
      placeholder={placeholder}
      searchPlaceholder="Search people…"
      emptyText="No people found."
    />
  );
}
