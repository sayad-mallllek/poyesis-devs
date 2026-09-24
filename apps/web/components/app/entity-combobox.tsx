"use client";

import { Check, ChevronsUpDown, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export interface EntityComboboxProps<T> {
  id?: string;
  /** Id of the selected entity. */
  value: string | null;
  /** What the trigger shows for the current value; `null` shows the placeholder. */
  selectedLabel: ReactNode | null;
  items: readonly T[] | undefined;
  getId: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  onSelect: (item: T | null) => void;
  /** Server-side search: the combobox never filters items itself. */
  search: string;
  onSearchChange: (search: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: ReactNode;
  clearable?: boolean;
  disabled?: boolean;
  size?: "sm" | "default";
  className?: string;
  "aria-invalid"?: boolean;
  /** Extra content below the options (e.g. a "create" action); receives a close callback. */
  footer?: (close: () => void) => ReactNode;
}

/** Searchable single-select built on Popover + Command, for entity pickers. */
export function EntityCombobox<T>({
  id,
  value,
  selectedLabel,
  items,
  getId,
  renderItem,
  onSelect,
  search,
  onSearchChange,
  isLoading,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "No results.",
  clearable,
  disabled,
  size = "default",
  className,
  footer,
  ...aria
}: EntityComboboxProps<T>) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  // Results arrive asynchronously, so highlight the first one whenever they change; Enter then picks it.
  const [active, setActive] = useState("");
  const resultKey = items?.map(getId).join("|") ?? "";
  const [seenKey, setSeenKey] = useState(resultKey);
  if (resultKey !== seenKey) {
    setSeenKey(resultKey);
    setActive(items?.[0] ? getId(items[0]) : "");
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) onSearchChange("");
      }}
    >
      <div className={cn("relative", className)}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            size={size}
            role="combobox"
            aria-expanded={open}
            aria-invalid={aria["aria-invalid"]}
            disabled={disabled}
            className={cn(
              "w-full justify-between px-3 font-normal",
              clearable && value && "pr-14",
              !selectedLabel && "text-muted-foreground",
            )}
          >
            <span className="flex min-w-0 items-center gap-2 truncate">{selectedLabel ?? placeholder}</span>
            <ChevronsUpDown className="ml-auto opacity-50" />
          </Button>
        </PopoverTrigger>
        {clearable && value && !disabled && (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="absolute top-1/2 right-8 -translate-y-1/2 text-muted-foreground"
            onClick={() => onSelect(null)}
          >
            <X />
            <span className="sr-only">Clear selection</span>
          </Button>
        )}
      </div>
      <PopoverContent className="w-(--radix-popover-trigger-width) min-w-64 p-0" align="start">
        <Command shouldFilter={false} value={active} onValueChange={setActive}>
          <CommandInput placeholder={searchPlaceholder} value={search} onValueChange={onSearchChange} />
          <CommandList>
            {isLoading && !items ? (
              <div className="flex justify-center py-6">
                <Spinner className="text-muted-foreground" />
              </div>
            ) : (
              <CommandEmpty>{emptyText}</CommandEmpty>
            )}
            {!!items?.length && (
              <CommandGroup>
                {items.map((item) => {
                  const itemId = getId(item);
                  return (
                    <CommandItem
                      key={itemId}
                      value={itemId}
                      onSelect={() => {
                        onSelect(item);
                        close();
                      }}
                    >
                      {renderItem(item)}
                      <Check className={cn("ml-auto", itemId === value ? "opacity-100" : "opacity-0")} />
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
          </CommandList>
          {footer?.(close)}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
