"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PaginationBar({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <div className="flex items-center justify-between gap-2 pt-4 text-sm text-muted-foreground">
      <span>
        {from}–{to} of {total}
      </span>
      <div className="flex gap-1">
        <Button variant="outline" size="icon" className="size-8" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft />
          <span className="sr-only">Previous page</span>
        </Button>
        <Button variant="outline" size="icon" className="size-8" disabled={page >= pages} onClick={() => onPageChange(page + 1)}>
          <ChevronRight />
          <span className="sr-only">Next page</span>
        </Button>
      </div>
    </div>
  );
}
