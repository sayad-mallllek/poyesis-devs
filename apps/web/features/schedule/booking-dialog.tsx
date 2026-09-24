"use client";

import type { Allocation, IsoDate, TimeOff } from "@repo/contracts";
import { CalendarPlus, Palmtree } from "lucide-react";
import { useState } from "react";
import type { ProjectOption } from "@/components/app/project-picker";
import type { UserOption } from "@/components/app/user-picker";
import { useCan, useSession } from "@/components/providers/session-provider";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookingForm } from "./booking-form";
import { formatRange } from "./timeline";
import { TimeOffForm } from "./time-off-form";

export type BookingDialogState =
  | {
      kind: "new";
      tab?: "booking" | "time-off";
      user?: UserOption;
      project?: ProjectOption;
      startDate?: IsoDate;
      endDate?: IsoDate;
    }
  | { kind: "allocation"; allocation: Allocation; user?: UserOption }
  | { kind: "time-off"; timeOff: TimeOff; user?: UserOption };

/** A resource no one owns: only unconditional rules grant access to it. */
const SOMEONE_ELSE = { userId: "\u0000" };

export function BookingDialog({
  state,
  onClose,
  workingDays,
}: {
  state: BookingDialogState | null;
  onClose: () => void;
  workingDays: readonly number[];
}) {
  return (
    <Dialog open={!!state} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-xl">
        {state && <DialogBody state={state} onClose={onClose} workingDays={workingDays} />}
      </DialogContent>
    </Dialog>
  );
}

function DialogBody({
  state,
  onClose,
  workingDays,
}: {
  state: BookingDialogState;
  onClose: () => void;
  workingDays: readonly number[];
}) {
  const can = useCan();
  const { user: me } = useSession();
  const canPickPerson = can("create", "TimeOff", SOMEONE_ELSE);
  // People who may only record their own absences start from themselves.
  const person = state.user ?? (state.kind === "new" && !canPickPerson ? me : undefined);
  const userId = person?.id;
  const canBook = can("create", "Allocation", userId ? { userId } : undefined);
  const canTimeOff = can("create", "TimeOff", userId ? { userId } : undefined);
  const initialTab = state.kind === "new" && (state.tab === "time-off" || !canBook) ? "time-off" : "booking";
  const [tab, setTab] = useState<"booking" | "time-off">(initialTab);

  if (state.kind === "allocation") {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Edit booking</DialogTitle>
          <DialogDescription>
            {state.allocation.project.name} · {formatRange(state.allocation.startDate, state.allocation.endDate)}
          </DialogDescription>
        </DialogHeader>
        <BookingForm allocation={state.allocation} user={state.user} workingDays={workingDays} onDone={onClose} />
      </>
    );
  }
  if (state.kind === "time-off") {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Edit time off</DialogTitle>
          <DialogDescription>{formatRange(state.timeOff.startDate, state.timeOff.endDate)}</DialogDescription>
        </DialogHeader>
        <TimeOffForm
          timeOff={state.timeOff}
          user={state.user}
          canPickPerson={false}
          workingDays={workingDays}
          onDone={onClose}
        />
      </>
    );
  }

  const defaults = { userId, startDate: state.startDate, endDate: state.endDate };
  const range = state.startDate && state.endDate ? formatRange(state.startDate, state.endDate) : undefined;
  return (
    <>
      <DialogHeader>
        <DialogTitle>{tab === "booking" ? "New booking" : "Add time off"}</DialogTitle>
        <DialogDescription>
          {[person && `${person.firstName} ${person.lastName}`, range].filter(Boolean).join(" · ") ||
            "Reserve someone's time on a project, or record an absence."}
        </DialogDescription>
      </DialogHeader>
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        {canBook && canTimeOff && (
          <TabsList className="mb-2 w-full">
            <TabsTrigger value="booking">
              <CalendarPlus /> Booking
            </TabsTrigger>
            <TabsTrigger value="time-off">
              <Palmtree /> Time off
            </TabsTrigger>
          </TabsList>
        )}
        {canBook && (
          <TabsContent value="booking">
            <BookingForm
              defaults={{ ...defaults, projectId: state.project?.id }}
              user={person}
              project={state.project}
              workingDays={workingDays}
              onDone={onClose}
            />
          </TabsContent>
        )}
        {canTimeOff && (
          <TabsContent value="time-off">
            <TimeOffForm
              defaults={defaults}
              user={person}
              canPickPerson={canPickPerson}
              workingDays={workingDays}
              onDone={onClose}
            />
          </TabsContent>
        )}
      </Tabs>
    </>
  );
}
