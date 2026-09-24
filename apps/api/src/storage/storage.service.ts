import type { Readable } from "node:stream";

export class StorageObjectNotFoundError extends Error {
  constructor(readonly key: string) {
    super(`Storage object ${key} was not found`);
  }
}

/**
 * Blob storage abstraction (also the DI token). Keys come from
 * `createStorageKey`; implementations must reject anything else.
 */
export abstract class StorageService {
  /** Stores a new object; fails if the key already exists. */
  abstract put(key: string, data: Buffer): Promise<void>;
  /** Opens an object for streaming; throws {@link StorageObjectNotFoundError} when missing. */
  abstract read(key: string): Promise<Readable>;
  /** Deletes an object; a missing object is not an error. */
  abstract delete(key: string): Promise<void>;
}
