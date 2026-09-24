import type { ReactNode } from "react";
import { EmptyState } from "@/components/app/states";
import { Badge } from "@/components/ui/badge";

/** Placeholder for tabs whose integration hasn't shipped yet. */
export function ComingSoon({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <EmptyState
      icon={icon}
      title={title}
      description={description}
      action={<Badge variant="secondary">Coming soon</Badge>}
    />
  );
}
