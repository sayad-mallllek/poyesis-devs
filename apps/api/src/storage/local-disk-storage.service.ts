import { Injectable } from "@nestjs/common";
import { mkdir, open, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { Readable } from "node:stream";
import { AppConfig } from "../config/app-config.js";
import { resolveStoragePath } from "./storage-keys.js";
import { StorageObjectNotFoundError, StorageService } from "./storage.service.js";

const isNotFound = (error: unknown) => (error as NodeJS.ErrnoException).code === "ENOENT";

/** Stores objects as files under `AppConfig.storage.dir`. */
@Injectable()
export class LocalDiskStorageService extends StorageService {
  private readonly root: string;

  constructor(config: AppConfig) {
    super();
    this.root = resolve(config.storage.dir);
  }

  async put(key: string, data: Buffer): Promise<void> {
    const path = resolveStoragePath(this.root, key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, data, { flag: "wx", mode: 0o600 });
  }

  async read(key: string): Promise<Readable> {
    const path = resolveStoragePath(this.root, key);
    try {
      // Opening eagerly surfaces a missing file here rather than mid-response.
      const handle = await open(path, "r");
      return handle.createReadStream();
    } catch (error) {
      if (isNotFound(error)) throw new StorageObjectNotFoundError(key);
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    await rm(resolveStoragePath(this.root, key), { force: true });
  }
}
