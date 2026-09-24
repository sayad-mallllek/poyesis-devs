import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function BlockCard({
  title,
  description,
  action,
  className,
  children,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("rounded-xl border bg-card p-3 text-card-foreground shadow-xs", className)}>
      {(title || action) && (
        <header className="mb-3 flex items-start justify-between gap-2">
          <div className="min-w-0">
            {title && <h4 className="text-sm font-medium leading-tight">{title}</h4>}
            {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}
