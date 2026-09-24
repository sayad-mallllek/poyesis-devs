"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageContainer, PageHeader } from "@/components/app/page-header";
import { ErrorState } from "@/components/app/states";
import { Skeleton } from "@/components/ui/skeleton";
import { ClientForm } from "@/features/clients/client-form";
import { clientQuery, useUpdateClient } from "@/lib/api/clients";

export default function EditClientPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const router = useRouter();
  const { data: client, error } = useQuery(clientQuery(clientId));
  const update = useUpdateClient(clientId);

  return (
    <PageContainer>
      <PageHeader title={client ? `Edit ${client.name}` : "Edit client"} back={{ href: `/clients/${clientId}`, label: "Back" }} />
      {error ? (
        <ErrorState error={error} />
      ) : !client ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <ClientForm
          client={client}
          submitLabel="Save changes"
          onSubmit={async (input) => {
            await update.mutateAsync(input);
            toast.success("Client updated");
            router.push(`/clients/${clientId}`);
          }}
        />
      )}
    </PageContainer>
  );
}
