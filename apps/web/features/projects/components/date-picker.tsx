"use client";

import { CalendarIcon, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDate, parseDate, toIsoDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Calendar popover bound to a `YYYY-MM-DD` string (or null). */
export function DatePicker({
  id,
  value,
  onChange,
  placeholder = "Pick a date",
  clearable = true,
  "aria-invalid": invalid,
}: {
  id?: string;
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  placeholder?: string;
  clearable?: boolean;
  "aria-invalid"?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = value ? parseDate(value) : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="relative">
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            aria-invalid={invalid}
            className={cn("w-full justify-start px-3 font-normal", !value && "text-muted-foreground", clearable && value && "pr-9")}
          >
            <CalendarIcon className="text-muted-foreground" />
            {value ? formatDate(value) : placeholder}
          </Button>
        </PopoverTrigger>
        {clearable && value && (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground"
            onClick={() => onChange(null)}
          >
            <X />
            <span className="sr-only">Clear date</span>
          </Button>
        )}
      </div>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          captionLayout="dropdown"
          onSelect={(date) => {
            onChange(date ? toIsoDate(date) : null);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
