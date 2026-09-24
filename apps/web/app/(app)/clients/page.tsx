import type { Metadata } from "next";
import { Suspense } from "react";
import { ClientsList } from "@/features/clients/clients-list";

export const metadata: Metadata = { title: "Clients" };

export default function ClientsPage() {
  return (
    <Suspense>
      <ClientsList />
    </Suspense>
  );
}
