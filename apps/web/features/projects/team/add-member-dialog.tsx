"use client";

import { PROJECT_MEMBER_ROLES, type ProjectMemberRole } from "@repo/contracts";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { UserPicker } from "@/components/app/user-picker";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { errorMessage } from "@/lib/api/client";
import { useMemberMutations } from "@/lib/api/projects";
import { EnumSelect } from "../components/enum-select";

export function AddMemberDialog({ projectId, existing, trigger }: { projectId: string; existing: string[]; trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<ProjectMemberRole>("CONTRIBUTOR");
  const [error, setError] = useState<string | null>(null);
  const { add } = useMemberMutations(projectId);
  const duplicate = !!userId && existing.includes(userId);

  const submit = () => {
    if (!userId) return setError("Choose a person");
    add.mutate(
      { userId, projectRole: role },
      {
        onSuccess: (member) => {
          toast.success(`${member.user.firstName} added to the team`);
          setOpen(false);
        },
        onError: (e) => setError(errorMessage(e)),
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setUserId(null);
          setRole("CONTRIBUTOR");
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form
          noValidate
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <DialogHeader>
            <DialogTitle>Add a team member</DialogTitle>
            <DialogDescription>Members can see the project, post status updates and upload files.</DialogDescription>
          </DialogHeader>
          <FieldGroup className="gap-5">
            <Field data-invalid={!!error || duplicate}>
              <FieldLabel htmlFor="add-member-user">Person</FieldLabel>
              <UserPicker
                id="add-member-user"
                value={userId}
                onChange={(id) => {
                  setUserId(id);
                  setError(null);
                }}
                aria-invalid={!!error || duplicate}
              />
              {duplicate ? <FieldError>Already on the team.</FieldError> : error && <FieldError>{error}</FieldError>}
            </Field>
            <Field>
              <FieldLabel htmlFor="add-member-role">Project role</FieldLabel>
              <EnumSelect id="add-member-role" value={role} onChange={setRole} options={PROJECT_MEMBER_ROLES} />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={add.isPending || duplicate}>
              {add.isPending && <Spinner />}
              Add member
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
