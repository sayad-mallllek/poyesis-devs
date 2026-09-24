import "server-only";

export const API_URL = (process.env.API_URL ?? "http://localhost:4000").replace(/\/$/, "");

export const COOKIE = {
  access: "pm_at",
  refresh: "pm_rt",
} as const;

export const SECURE_COOKIES = process.env.NODE_ENV === "production";
