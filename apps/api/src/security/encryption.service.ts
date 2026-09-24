import { Injectable } from "@nestjs/common";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { AppConfig } from "../config/app-config.js";

const ALGORITHM = "aes-256-gcm";
const VERSION = "v1";

/** Authenticated symmetric encryption for secrets at rest (integration tokens). */
@Injectable()
export class EncryptionService {
  constructor(private readonly config: AppConfig) {}

  encrypt(plaintext: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv(ALGORITHM, this.config.encryptionKey, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [VERSION, iv, tag, ciphertext].map((p) => (typeof p === "string" ? p : p.toString("base64url"))).join(".");
  }

  decrypt(payload: string): string {
    const [version, iv, tag, ciphertext] = payload.split(".");
    if (version !== VERSION || !iv || !tag || !ciphertext) throw new Error("Malformed ciphertext");
    const decipher = createDecipheriv(ALGORITHM, this.config.encryptionKey, Buffer.from(iv, "base64url"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertext, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  }
}

export const sha256 = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
export const randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url");
