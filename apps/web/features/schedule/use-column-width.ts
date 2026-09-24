import { useLayoutEffect, useState, type RefObject } from "react";

/** Mirrors LEFT_COLUMN_CLASS (`w-40 sm:w-60`). */
const leftColumnWidth = () => (window.matchMedia("(min-width: 640px)").matches ? 240 : 160);

/** Stretches day columns to fill the viewport, never below the zoom's minimum. */
export function useColumnWidth(ref: RefObject<HTMLElement | null>, dayCount: number, minColumn: number) {
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry!.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  if (!width) return minColumn;
  // Fractional widths let the days fill the viewport exactly.
  return Math.max(minColumn, Math.floor(((width - leftColumnWidth() - 2) / dayCount) * 100) / 100);
}
