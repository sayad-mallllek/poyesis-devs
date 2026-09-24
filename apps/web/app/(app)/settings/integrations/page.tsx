import type { Metadata } from "next";
import { IntegrationsSettings } from "@/features/integrations/integrations-settings";

export const metadata: Metadata = { title: "Integrations" };

export default function IntegrationsPage() {
  return <IntegrationsSettings />;
}
