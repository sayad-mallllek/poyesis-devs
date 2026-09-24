"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

/** Reads and writes URL search params so filters survive reloads and are shareable. */
export function useSearchParamsState() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const set = useCallback(
    (updates: Record<string, string | number | null | undefined>) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === undefined || value === "") next.delete(key);
        else next.set(key, String(value));
      }
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  return { params, set, get: (key: string) => params.get(key) ?? undefined };
}
