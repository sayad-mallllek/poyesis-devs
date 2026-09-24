"use client";

import { Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageContainer, PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/app/states";
import { fullName } from "@/components/app/user-avatar";
import { Can } from "@/components/providers/session-provider";
import { useCreateUser } from "@/lib/api/users";
import { UserForm } from "./user-form";

export function NewPerson() {
  const router = useRouter();
  const create = useCreateUser({ silent: true });
  return (
    <PageContainer>
      <PageHeader
        title="Add person"
        description="Create an account and share the temporary password with them."
        back={{ href: "/people", label: "People" }}
      />
      <Can
        action="create"
        subject="User"
        fallback={<EmptyState icon={<Lock />} title="You don't have access" description="Only administrators can add people." />}
      >
        <UserForm
          onSubmit={async (input) => {
            const user = await create.mutateAsync(input);
            toast.success(`${fullName(user)} added`);
            router.push(`/people/${user.id}`);
          }}
        />
      </Can>
    </PageContainer>
  );
}
