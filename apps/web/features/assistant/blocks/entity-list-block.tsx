import type { EntityListBlock } from "@repo/contracts";
import { Building2, ChevronRight, FolderKanban, UserRound } from "lucide-react";
import Link from "next/link";
import { ToneBadge } from "@/components/app/status-badges";
import { BlockCard } from "./block-card";
import { UI_TONE } from "./tone";

const ENTITY = {
  project: { href: (id: string) => `/projects/${id}`, icon: FolderKanban },
  user: { href: (id: string) => `/people/${id}`, icon: UserRound },
  client: { href: (id: string) => `/clients/${id}`, icon: Building2 },
} as const;

export function EntityListBlockView({ block }: { block: EntityListBlock }) {
  const { href, icon: Icon } = ENTITY[block.entity];
  return (
    <BlockCard title={block.title}>
      <ul className="-mx-1 divide-y">
        {block.items.map((item) => (
          <li key={item.id}>
            <Link
              href={href(item.id)}
              className="flex items-center gap-3 rounded-md px-1 py-2 text-sm transition-colors hover:bg-accent"
            >
              <Icon className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{item.title}</span>
                {item.subtitle && <span className="block truncate text-xs text-muted-foreground">{item.subtitle}</span>}
              </span>
              {item.badge && <ToneBadge tone={UI_TONE[item.tone ?? "default"]}>{item.badge}</ToneBadge>}
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
    </BlockCard>
  );
}
