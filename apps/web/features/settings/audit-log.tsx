"use client";

import { useQuery } from "@tanstack/react-query";
import { Bot, ScrollText } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/app/page-header";
import { PaginationBar } from "@/components/app/pagination-bar";
import { EmptyState, ErrorState } from "@/components/app/states";
import { ToneBadge } from "@/components/app/status-badges";
import { fullName, UserAvatar } from "@/components/app/user-avatar";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSearchParamsState } from "@/hooks/use-search-param";
import { auditLogQuery } from "@/lib/api/company";
import { formatDateTime } from "@/lib/format";

const ENTITY_TYPES = ["Project", "User", "Client", "Allocation", "Milestone", "Risk", "UserSkill", "UserNote", "Integration"];
const ALL = "all";

export function AuditLog() {
  const { get, set } = useSearchParamsState();
  const page = Number(get("page") ?? 1);
  const entityType = get("entity");
  const { data, error, isPending } = useQuery(auditLogQuery({ page, entityType }));

  return (
    <PageContainer>
      <PageHeader
        title="Audit log"
        description="Every change in the workspace, including those made through the AI assistant."
        actions={
          <Select value={entityType ?? ALL} onValueChange={(v) => set({ entity: v === ALL ? null : v, page: null })}>
            <SelectTrigger className="w-44" aria-label="Filter by entity">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All entities</SelectItem>
              {ENTITY_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />
      {error ? (
        <ErrorState error={error} />
      ) : data?.items.length === 0 ? (
        <EmptyState icon={<ScrollText />} title="No activity yet" />
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">When</TableHead>
                <TableHead>Who</TableHead>
                <TableHead>What</TableHead>
                <TableHead className="hidden pr-4 md:table-cell">Entity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending
                ? Array.from({ length: 8 }, (_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={4} className="px-4">
                        <Skeleton className="h-5" />
                      </TableCell>
                    </TableRow>
                  ))
                : data.items.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="pl-4 whitespace-nowrap text-muted-foreground tabular-nums">
                        {formatDateTime(entry.createdAt)}
                      </TableCell>
                      <TableCell>
                        {entry.actor ? (
                          <span className="flex items-center gap-2 whitespace-nowrap">
                            <UserAvatar user={entry.actor} className="size-6" />
                            {fullName(entry.actor)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">System</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-md">
                        <span className="flex items-center gap-2">
                          {entry.origin === "ai" && (
                            <ToneBadge tone="primary" className="shrink-0">
                              <Bot /> AI
                            </ToneBadge>
                          )}
                          <span className="truncate" title={entry.summary}>
                            {entry.summary}
                          </span>
                        </span>
                      </TableCell>
                      <TableCell className="hidden pr-4 font-mono text-xs text-muted-foreground md:table-cell">
                        {entry.action}
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </Card>
      )}
      {data && <PaginationBar page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={(p) => set({ page: p })} />}
    </PageContainer>
  );
}
