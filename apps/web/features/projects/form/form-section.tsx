import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export interface SectionMeta {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

export function FormSection({
  section,
  action,
  children,
}: {
  section: SectionMeta;
  action?: ReactNode;
  children: ReactNode;
}) {
  const Icon = section.icon;
  return (
    <Card id={section.id} className="scroll-mt-20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="size-4 text-muted-foreground" aria-hidden />
          {section.title}
        </CardTitle>
        <CardDescription>{section.description}</CardDescription>
        {action && <CardAction>{action}</CardAction>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
