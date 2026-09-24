"use client";

import { CLIENT_STATUSES, type ClientStatus } from "@repo/contracts";
import { useQuery } from "@tanstack/react-query";
import { Building2, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageContainer, PageHeader } from "@/components/app/page-header";
import { PaginationBar } from "@/components/app/pagination-bar";
import { EmptyState, ErrorState } from "@/components/app/states";
import { ClientStatusBadge } from "@/components/app/status-badges";
import { Can } from "@/components/providers/session-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useSearchParamsState } from "@/hooks/use-search-param";
import { clientsQuery } from "@/lib/api/clients";
import { formatDate, humanize } from "@/lib/format";

const ALL = "all";

export function ClientsList() {
  const router = useRouter();
  const { get, set } = useSearchParamsState();
  const page = Number(get("page") ?? 1);
  const status = get("status") as ClientStatus | undefined;
  const [search, setSearch] = useState(get("q") ?? "");
  const debouncedSearch = useDebouncedValue(search.trim());

  useEffect(() => {
    if (debouncedSearch !== (get("q") ?? "")) set({ q: debouncedSearch, page: null });
  }, [debouncedSearch, get, set]);

  const { data, isPending, error, refetch } = useQuery(
    clientsQuery({ page, pageSize: 20, search: debouncedSearch || undefined, status }),
  );

  return (
    <PageContainer>
      <PageHeader
        title="Clients"
        description="Organizations you deliver projects for."
        actions={
          <Can action="create" subject="Client">
            <Button asChild>
              <Link href="/clients/new">
                <Plus /> New client
              </Link>
            </Button>
          </Can>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <InputGroup className="max-w-xs">
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput placeholder="Search clients…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </InputGroup>
        <Select value={status ?? ALL} onValueChange={(v) => set({ status: v === ALL ? null : v, page: null })}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {CLIENT_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {humanize(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : data && data.items.length === 0 ? (
        <EmptyState
          icon={<Building2 />}
          title={debouncedSearch || status ? "No matching clients" : "No clients yet"}
          description="Clients group projects and their contacts."
        />
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Industry</TableHead>
                <TableHead className="hidden md:table-cell">Country</TableHead>
                <TableHead className="text-right">Projects</TableHead>
                <TableHead className="hidden pr-4 text-right lg:table-cell">Added</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending
                ? Array.from({ length: 6 }, (_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={6} className="px-4">
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                : data.items.map((client) => (
                    <TableRow
                      key={client.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/clients/${client.id}`)}
                    >
                      <TableCell className="pl-4 font-medium">
                        <Link href={`/clients/${client.id}`} onClick={(e) => e.stopPropagation()}>
                          {client.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <ClientStatusBadge status={client.status} />
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">{client.industry ?? "—"}</TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">{client.country ?? "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">{client.projectCount}</TableCell>
                      <TableCell className="hidden pr-4 text-right text-muted-foreground lg:table-cell">
                        {formatDate(client.createdAt)}
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
