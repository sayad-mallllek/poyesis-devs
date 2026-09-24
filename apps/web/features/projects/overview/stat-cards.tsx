import type { ProjectAnalytics } from "@repo/contracts";
import { AlertTriangle, CheckCircle2, Clock, Coins, Gauge, TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { ToneBadge, type Tone } from "@/components/app/status-badges";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatHours, formatMoney } from "@/lib/format";
import { Meter } from "./meter";

function StatCard({
  icon: Icon,
  title,
  figure,
  caption,
  children,
}: {
  icon: LucideIcon;
  title: string;
  figure: ReactNode;
  caption?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Icon className="size-4" aria-hidden /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <div className="text-2xl font-semibold tracking-tight">{figure}</div>
          {caption && <div className="text-sm text-muted-foreground">{caption}</div>}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

const pct = (part: number, whole: number) => (whole > 0 ? (part / whole) * 100 : 0);
const signed = (n: number) => `${n > 0 ? "+" : ""}${Math.round(n)}`;

function varianceTone(variance: number): { tone: Tone; label: string; icon: LucideIcon } {
  if (Math.abs(variance) < 2) return { tone: "success", label: "On pace", icon: CheckCircle2 };
  if (variance > 0) return { tone: "success", label: `${signed(variance)} pts ahead`, icon: TrendingUp };
  return { tone: variance < -10 ? "danger" : "warning", label: `${Math.round(-variance)} pts behind`, icon: TrendingDown };
}

export function ScheduleCard({ schedule }: { schedule: ProjectAnalytics["schedule"] }) {
  const { daysRemaining, timeElapsedPercent, scheduleVariance, progress } = schedule;
  if (daysRemaining === null || timeElapsedPercent === null) {
    return (
      <StatCard icon={Clock} title="Schedule" figure={`${progress}% done`} caption="Set start and target dates to track the schedule.">
        <Meter label="Progress" value={progress} display={`${progress}%`} />
      </StatCard>
    );
  }
  const overdue = daysRemaining < 0;
  const variance = scheduleVariance !== null ? varianceTone(scheduleVariance) : null;
  return (
    <StatCard
      icon={Clock}
      title="Schedule"
      figure={
        overdue ? (
          <span className="text-destructive">{-daysRemaining} days overdue</span>
        ) : (
          `${daysRemaining} days left`
        )
      }
      caption={
        variance && (
          <ToneBadge tone={variance.tone} className="mt-1">
            <variance.icon aria-hidden /> {variance.label}
          </ToneBadge>
        )
      }
    >
      <div className="space-y-3">
        <Meter label="Time elapsed" value={timeElapsedPercent} display={`${Math.round(timeElapsedPercent)}%`} tone="neutral" />
        <Meter label="Work complete" value={progress} display={`${progress}%`} />
      </div>
    </StatCard>
  );
}

export function EffortCard({ effort }: { effort: ProjectAnalytics["effort"] }) {
  const { estimatedHours, bookedHoursToDate, bookedHoursTotal } = effort;
  if (!estimatedHours) {
    return (
      <StatCard icon={Gauge} title="Effort" figure={formatHours(bookedHoursToDate)} caption="booked so far · no estimate set">
        <p className="text-sm text-muted-foreground">{formatHours(bookedHoursTotal)} booked in total, including future weeks.</p>
      </StatCard>
    );
  }
  const overBooked = bookedHoursTotal > estimatedHours;
  return (
    <StatCard
      icon={Gauge}
      title="Effort"
      figure={formatHours(Math.round(bookedHoursToDate))}
      caption={`of ${formatHours(estimatedHours)} estimated`}
    >
      <div className="space-y-3">
        <Meter
          label="Booked to date"
          value={pct(bookedHoursToDate, estimatedHours)}
          display={`${Math.round(pct(bookedHoursToDate, estimatedHours))}%`}
          marker={pct(bookedHoursTotal, estimatedHours)}
          markerLabel={`All bookings: ${formatHours(bookedHoursTotal)}`}
        />
        <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
          {overBooked && <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-label="Warning" />}
          <span>
            All bookings reach <span className="font-medium text-foreground">{formatHours(Math.round(bookedHoursTotal))}</span>
            {overBooked ? ` (${Math.round(pct(bookedHoursTotal - estimatedHours, estimatedHours))}% over estimate)` : " (within estimate)"}
          </span>
        </p>
      </div>
    </StatCard>
  );
}

export function BudgetCard({ budget }: { budget: ProjectAnalytics["budget"] }) {
  const { budgetAmount, currency, burnedToDate, forecastAtCompletion } = budget;
  const money = (n: number | null) => formatMoney(n, currency);
  if (burnedToDate === null) {
    return (
      <StatCard icon={Coins} title="Budget" figure={budgetAmount !== null ? money(budgetAmount) : "No budget"} caption="Set an hourly rate to track burn and forecast." />
    );
  }
  if (!budgetAmount) {
    return (
      <StatCard icon={Coins} title="Budget" figure={money(burnedToDate)} caption="burned to date · no budget set">
        <p className="text-sm text-muted-foreground">Forecast at completion {money(forecastAtCompletion)}.</p>
      </StatCard>
    );
  }
  const burnedPct = pct(burnedToDate, budgetAmount);
  const forecastPct = forecastAtCompletion !== null ? pct(forecastAtCompletion, budgetAmount) : undefined;
  const overrun = forecastAtCompletion !== null ? forecastAtCompletion - budgetAmount : 0;
  return (
    <StatCard icon={Coins} title="Budget" figure={money(burnedToDate)} caption={`burned of ${money(budgetAmount)}`}>
      <div className="space-y-3">
        <Meter
          label="Burned"
          value={burnedPct}
          display={`${Math.round(burnedPct)}%`}
          tone={burnedPct > 100 ? "danger" : burnedPct > 85 ? "warning" : "primary"}
          marker={forecastPct}
          markerLabel={`Forecast: ${money(forecastAtCompletion)}`}
        />
        <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
          {overrun > 0 && <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" aria-label="Over budget" />}
          <span>
            Forecast <span className="font-medium text-foreground">{money(forecastAtCompletion)}</span>
            {overrun > 0 ? `, ${money(overrun)} over budget` : `, ${money(-overrun)} under budget`}
          </span>
        </p>
      </div>
    </StatCard>
  );
}
