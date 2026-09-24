"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageContainer, PageHeader } from "@/components/app/page-header";
import { ClientForm } from "@/features/clients/client-form";
import { useCreateClient } from "@/lib/api/clients";

export default function NewClientPage() {
  const router = useRouter();
  const create = useCreateClient();
  return (
    <PageContainer>
      <PageHeader title="New client" back={{ href: "/clients", label: "Clients" }} />
      <ClientForm
        submitLabel="Create client"
        onSubmit={async (input) => {
          const client = await create.mutateAsync(input);
          toast.success(`${client.name} created`);
          router.push(`/clients/${client.id}`);
        }}
      />
    </PageContainer>
  );
}
