"use client";

import type { UserSummary } from "@repo/contracts";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fullName, UserAvatar } from "@/components/app/user-avatar";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatHours } from "@/lib/format";
import { cn } from "@/lib/utils";
import { RoleBadge, UserStatusBadge } from "./people-badges";

export function PeopleTable({ people }: { people: UserSummary[] }) {
  const router = useRouter();
  return (
    <Card className="py-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-4">Name</TableHead>
            <TableHead className="hidden md:table-cell">Department</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className="hidden sm:table-cell">Status</TableHead>
            <TableHead className="hidden text-right md:table-cell">Projects</TableHead>
            <TableHead className="pr-4 text-right">Capacity</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {people.map((person) => (
            <TableRow
              key={person.id}
              className={cn("cursor-pointer", person.status === "SUSPENDED" && "text-muted-foreground")}
              onClick={() => router.push(`/people/${person.id}`)}
            >
              <TableCell className="pl-4">
                <div className="flex items-center gap-3">
                  <UserAvatar user={person} />
                  <div className="min-w-0">
                    <Link
                      href={`/people/${person.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="block truncate font-medium hover:text-primary"
                    >
                      {fullName(person)}
                    </Link>
                    <div className="truncate text-xs text-muted-foreground">{person.jobTitle ?? person.email}</div>
                  </div>
                </div>
              </TableCell>
              <TableCell className="hidden text-muted-foreground md:table-cell">{person.department ?? "—"}</TableCell>
              <TableCell>
                <RoleBadge role={person.role} />
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <UserStatusBadge status={person.status} />
              </TableCell>
              <TableCell className="hidden text-right tabular-nums md:table-cell">{person.activeProjectCount}</TableCell>
              <TableCell className="pr-4 text-right tabular-nums">{formatHours(person.weeklyCapacityHours)}/wk</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
