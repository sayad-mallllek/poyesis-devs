"use client";

import { ROLE_DESCRIPTIONS, type Role, type UserDetail } from "@repo/contracts";
import { Ban, RotateCcw, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { fullName } from "@/components/app/user-avatar";
import { useCan } from "@/components/providers/session-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { useSuspendUser, useUpdateUser } from "@/lib/api/users";
import { RoleSelect } from "./role-select";

/** Role and status management for another person; rendered only with the matching field rights. */
export function AdminActions({ user }: { user: UserDetail }) {
  const can = useCan();
  const update = useUpdateUser(user.id);
  const suspend = useSuspendUser();
  const [roleOpen, setRoleOpen] = useState(false);
  const [role, setRole] = useState<Role>(user.role);

  const canRole = can("update", "User", { id: user.id }, "role");
  const canStatus = can("update", "User", { id: user.id }, "status");
  if (!canRole && !canStatus) return null;

  const suspended = user.status === "SUSPENDED";
  const name = fullName(user);

  return (
    <>
      {canStatus &&
        (suspended ? (
          <Button
            variant="outline"
            disabled={update.isPending}
            onClick={() =>
              update.mutate({ status: "ACTIVE" }, { onSuccess: () => toast.success(`${name} reactivated`) })
            }
          >
            <RotateCcw /> Reactivate
          </Button>
        ) : (
          <ConfirmDialog
            trigger={
              <Button variant="outline">
                <Ban /> Suspend
              </Button>
            }
            title={`Suspend ${name}?`}
            description="They are signed out everywhere and can no longer sign in. Their history, bookings and notes are kept, and you can reactivate them later."
            confirmLabel="Suspend"
            destructive
            onConfirm={() =>
              suspend.mutate(user.id, { onSuccess: () => toast.success(`${name} suspended`) })
            }
          />
        ))}
      {canRole && (
        <Button
          variant="outline"
          onClick={() => {
            setRole(user.role);
            setRoleOpen(true);
          }}
        >
          <ShieldCheck /> Change role
        </Button>
      )}

      <Dialog open={roleOpen} onOpenChange={setRoleOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change role</DialogTitle>
            <DialogDescription>Roles decide what {name} can see and do across the workspace.</DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="change-role">Role</FieldLabel>
            <RoleSelect id="change-role" value={role} onChange={setRole} />
            <p className="text-sm text-muted-foreground">{ROLE_DESCRIPTIONS[role].summary}</p>
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={role === user.role || update.isPending}
              onClick={() =>
                update.mutate(
                  { role },
                  {
                    onSuccess: () => {
                      toast.success(`${name} is now ${ROLE_DESCRIPTIONS[role].label.toLowerCase()}`);
                      setRoleOpen(false);
                    },
                  },
                )
              }
            >
              {update.isPending && <Spinner />}
              Save role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
