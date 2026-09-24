import { Injectable } from "@nestjs/common";
import { loadEnv, type Env } from "./env.js";

/** Typed, validated configuration. Inject this instead of reading `process.env`. */
@Injectable()
export class AppConfig {
  private readonly env: Env = loadEnv();

  get isProduction() {
    return this.env.NODE_ENV === "production";
  }
  get port() {
    return this.env.PORT;
  }
  get logLevel() {
    return this.env.LOG_LEVEL;
  }
  get webOrigin() {
    return this.env.WEB_ORIGIN;
  }
  get databaseUrl() {
    return this.env.DATABASE_URL;
  }
  get auth() {
    return {
      accessSecret: this.env.JWT_ACCESS_SECRET,
      accessTtlSeconds: this.env.ACCESS_TOKEN_TTL_SECONDS,
      refreshTtlSeconds: this.env.REFRESH_TOKEN_TTL_SECONDS,
    };
  }
  get encryptionKey() {
    return Buffer.from(this.env.ENCRYPTION_KEY, "base64");
  }
  get storage() {
    return { dir: this.env.STORAGE_DIR, maxUploadBytes: this.env.MAX_UPLOAD_BYTES };
  }
  get ai() {
    return {
      apiKey: this.env.AI_API_KEY,
      baseUrl: this.env.AI_BASE_URL,
      model: this.env.AI_MODEL,
      enabled: this.env.AI_API_KEY.length > 0,
    };
  }
}
