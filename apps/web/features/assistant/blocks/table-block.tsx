import type { TableBlock } from "@repo/contracts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { BlockCard } from "./block-card";

const ALIGN = { left: "text-left", right: "text-right", center: "text-center" } as const;

const display = (value: unknown) =>
  value === null || value === undefined || value === ""
    ? "—"
    : typeof value === "boolean"
      ? value
        ? "Yes"
        : "No"
      : typeof value === "number"
        ? value.toLocaleString()
        : String(value);

export function DataTable({ columns, rows }: Pick<TableBlock, "columns" | "rows">) {
  return (
    <div className="max-h-80 overflow-auto rounded-md border">
      <Table className="text-xs">
        <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur">
          <TableRow>
            {columns.map((c) => (
              <TableHead key={c.key} className={cn("h-8", ALIGN[c.align ?? "left"])}>
                {c.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={i}>
              {columns.map((c) => (
                <TableCell key={c.key} className={cn("py-1.5 tabular-nums", ALIGN[c.align ?? "left"])}>
                  {display(row[c.key])}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function TableBlockView({ block }: { block: TableBlock }) {
  return (
    <BlockCard title={block.title}>
      <DataTable columns={block.columns} rows={block.rows} />
    </BlockCard>
  );
}
