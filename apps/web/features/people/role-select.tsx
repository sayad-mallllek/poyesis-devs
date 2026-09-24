"use client";

import { ROLE_DESCRIPTIONS, ROLES, type Role } from "@repo/contracts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/** Role picker that explains what each role may do, straight from the policy descriptions. */
export function RoleSelect({
  id,
  value,
  onChange,
  disabled,
  "aria-invalid": invalid,
}: {
  id?: string;
  value: Role;
  onChange: (role: Role) => void;
  disabled?: boolean;
  "aria-invalid"?: boolean;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as Role)} disabled={disabled}>
      <SelectTrigger id={id} aria-invalid={invalid} className="w-full">
        <SelectValue>{ROLE_DESCRIPTIONS[value].label}</SelectValue>
      </SelectTrigger>
      <SelectContent className="max-w-sm">
        {ROLES.map((role) => (
          <SelectItem key={role} value={role} className="items-start py-2">
            <div className="grid gap-0.5">
              <span className="font-medium">{ROLE_DESCRIPTIONS[role].label}</span>
              <span className="text-xs whitespace-normal text-muted-foreground">{ROLE_DESCRIPTIONS[role].summary}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
