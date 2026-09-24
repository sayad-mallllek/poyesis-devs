import { differenceInCalendarDays, format, formatDistanceToNowStrict, parseISO } from "date-fns";

/** `YYYY-MM-DD` dates are calendar dates: parse them as local dates, not UTC instants. */
export const parseDate = (value: string) => parseISO(value.length === 10 ? `${value}T00:00:00` : value);

export const formatDate = (value: string | null | undefined, pattern = "d MMM yyyy") =>
  value ? format(parseDate(value), pattern) : "—";

export const formatDateTime = (value: string | null | undefined) =>
  value ? format(parseDate(value), "d MMM yyyy, HH:mm") : "—";

export const formatRelative = (value: string | null | undefined) =>
  value ? formatDistanceToNowStrict(parseDate(value), { addSuffix: true }) : "—";

export const daysUntil = (value: string) => differenceInCalendarDays(parseDate(value), new Date());

export const toIsoDate = (date: Date) => format(date, "yyyy-MM-dd");

export function formatMoney(amount: number | null | undefined, currency = "EUR") {
  if (amount == null) return "—";
  return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

export const formatHours = (hours: number | null | undefined) =>
  hours == null ? "—" : `${Number.isInteger(hours) ? hours : hours.toFixed(1)}h`;

export const formatPercent = (value: number | null | undefined) => (value == null ? "—" : `${Math.round(value)}%`);

/** `TIME_AND_MATERIALS` → `Time and materials`. */
export const humanize = (value: string) =>
  value.charAt(0) + value.slice(1).toLowerCase().replaceAll("_", " ");

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unit]}`;
}

/** `plural(1, "client")` → "1 client"; `plural(2, "person", "people")` → "2 people". */
export const plural = (count: number, singular: string, pluralForm = `${singular}s`) =>
  `${count} ${count === 1 ? singular : pluralForm}`;
