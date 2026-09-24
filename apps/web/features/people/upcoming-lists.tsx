"use client";

import type { Allocation, TimeOff } from "@repo/contracts";
import type { UseQueryResult } from "@tanstack/react-query";
import { CalendarClock, Palmtree } from "lucide-react";
import type { ReactNode } from "react";
import { ErrorState } from "@/components/app/states";
import { ToneBadge } from "@/components/app/status-badges";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRange } from "@/features/schedule/timeline";
import { TIME_OFF_LABEL } from "@/features/schedule/utilization";
import { daysUntil, formatHours } from "@/lib/format";

function ListCard<T>({
  title,
  icon,
  query,
  empty,
  render,
}: {
  title: string;
  icon: ReactNode;
  query: UseQueryResult<T[]>;
  empty: string;
  render: (item: T) => ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 [&_svg]:size-4 [&_svg]:text-muted-foreground">
          {icon} {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {query.error ? (
          <ErrorState error={query.error} />
        ) : query.isPending ? (
          <Skeleton className="h-24 w-full" />
        ) : query.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          <ul className="-my-2 divide-y">{query.data.map(render)}</ul>
        )}
      </CardContent>
    </Card>
  );
}

const Row = ({ onClick, children }: { onClick?: () => void; children: ReactNode }) => (
  <li>
    {onClick ? (
      <button
        type="button"
        onClick={onClick}
        className="-mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-md px-2 py-2.5 text-left text-sm transition-colors hover:bg-accent"
      >
        {children}
      </button>
    ) : (
      <div className="flex items-center gap-3 py-2.5 text-sm">{children}</div>
    )}
  </li>
);

const startsIn = (date: string) => {
  const days = daysUntil(date);
  return days <= 0 ? "Ongoing" : days === 1 ? "Tomorrow" : `In ${days} days`;
};

export function UpcomingBookings({
  query,
  onOpen,
}: {
  query: UseQueryResult<Allocation[]>;
  onOpen?: (allocation: Allocation) => void;
}) {
  return (
    <ListCard
      title="Upcoming bookings"
      icon={<CalendarClock />}
      query={query}
      empty="Nothing booked from today on."
      render={(a) => (
        <Row key={a.id} onClick={onOpen && (() => onOpen(a))}>
          <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: a.project.color }} />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium">{a.project.name}</span>
            <span className="block text-xs text-muted-foreground">
              {formatRange(a.startDate, a.endDate)} · {formatHours(a.hoursPerDay)}/day
            </span>
          </span>
          {a.tentative && <ToneBadge tone="warning">Tentative</ToneBadge>}
          <span className="shrink-0 text-xs text-muted-foreground">{startsIn(a.startDate)}</span>
        </Row>
      )}
    />
  );
}

export function UpcomingTimeOff({ query, onOpen }: { query: UseQueryResult<TimeOff[]>; onOpen?: (t: TimeOff) => void }) {
  return (
    <ListCard
      title="Time off"
      icon={<Palmtree />}
      query={query}
      empty="No upcoming time off."
      render={(t) => (
        <Row key={t.id} onClick={onOpen && (() => onOpen(t))}>
          <span className="min-w-0 flex-1">
            <span className="block font-medium">{TIME_OFF_LABEL[t.type]}</span>
            <span className="block truncate text-xs text-muted-foreground">
              {formatRange(t.startDate, t.endDate)}
              {t.note && ` · ${t.note}`}
            </span>
          </span>
          <span className="shrink-0 text-xs text-muted-foreground">{startsIn(t.startDate)}</span>
        </Row>
      )}
    />
  );
}
