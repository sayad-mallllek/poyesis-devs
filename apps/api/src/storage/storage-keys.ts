import { randomUUID } from "node:crypto";
import { resolve, sep } from "node:path";

/** A key segment: server-generated identifiers only (cuid, uuid, fixed namespaces). */
const SEGMENT = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;
const MAX_DEPTH = 8;

export class InvalidStorageKeyError extends Error {
  constructor(key: string) {
    super(`Invalid storage key: ${JSON.stringify(key)}`);
  }
}

export const isValidStorageKey = (key: string) => {
  const segments = key.split("/");
  return segments.length <= MAX_DEPTH && segments.every((s) => SEGMENT.test(s));
};

/**
 * Builds a fresh, collision-free key under `scope` (e.g. `["projects", id]`).
 * User-provided names never become part of a key, so they can't influence where
 * bytes land on disk.
 */
export function createStorageKey(...scope: string[]): string {
  const key = [...scope, randomUUID()].join("/");
  if (!isValidStorageKey(key)) throw new InvalidStorageKeyError(key);
  return key;
}

/** Maps a key to an absolute path, refusing anything that could escape `root`. */
export function resolveStoragePath(root: string, key: string): string {
  if (!isValidStorageKey(key)) throw new InvalidStorageKeyError(key);
  const base = resolve(root);
  const path = resolve(base, key);
  if (!path.startsWith(base + sep)) throw new InvalidStorageKeyError(key);
  return path;
}
