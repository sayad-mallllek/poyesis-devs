"use client";

import { useParams } from "next/navigation";
import { ClientDetailView } from "@/features/clients/client-detail";

export default function ClientPage() {
  const { clientId } = useParams<{ clientId: string }>();
  return <ClientDetailView clientId={clientId} />;
}
