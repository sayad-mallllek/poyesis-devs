"use client";

import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { ProjectPicker, type ProjectOption } from "@/components/app/project-picker";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ZOOMS, type Zoom } from "./timeline";

const ALL = "all";

export interface ScheduleToolbarProps {
  rangeLabel: string;
  fetching: boolean;
  onToday: () => void;
  onShift: (direction: -1 | 1) => void;
  zoom: Zoom;
  onZoomChange: (zoom: Zoom) => void;
  search: string;
  onSearchChange: (search: string) => void;
  projectId: string | null;
  onProjectChange: (projectId: string | null, project: ProjectOption | null) => void;
  department: string | null;
  departments: readonly string[];
  onDepartmentChange: (department: string | null) => void;
}

export function ScheduleToolbar(props: ScheduleToolbarProps) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" onClick={props.onToday}>
          Today
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={() => props.onShift(-1)}>
          <ChevronLeft />
          <span className="sr-only">Previous period</span>
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={() => props.onShift(1)}>
          <ChevronRight />
          <span className="sr-only">Next period</span>
        </Button>
        <h2 className="ml-1 min-w-40 text-sm font-semibold tabular-nums" aria-live="polite">
          {props.rangeLabel}
        </h2>
        {props.fetching && <Spinner className="size-3.5 text-muted-foreground" />}
      </div>

      <div className="ml-auto flex w-full flex-wrap items-center gap-2 lg:w-auto">
        <InputGroup className="h-8 w-full sm:w-52">
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="Search people…"
            aria-label="Search people"
            value={props.search}
            onChange={(e) => props.onSearchChange(e.target.value)}
          />
        </InputGroup>
        <ProjectPicker
          value={props.projectId}
          onChange={props.onProjectChange}
          placeholder="All projects"
          clearable
          size="sm"
          className="w-[calc(50%-0.25rem)] sm:w-52"
        />
        <Select
          value={props.department ?? ALL}
          onValueChange={(v) => props.onDepartmentChange(v === ALL ? null : v)}
        >
          <SelectTrigger size="sm" className="w-[calc(50%-0.25rem)] sm:w-40" aria-label="Filter by department">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All departments</SelectItem>
            {props.departments.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={props.zoom}
          onValueChange={(v) => v && props.onZoomChange(v as Zoom)}
          aria-label="Zoom"
        >
          {(Object.keys(ZOOMS) as Zoom[]).map((z) => (
            <ToggleGroupItem key={z} value={z} className="text-xs">
              {ZOOMS[z].label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
    </div>
  );
}
