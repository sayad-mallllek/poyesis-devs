import { type } from "arktype";

const envSchema = type({
  NODE_ENV: "'development' | 'production' | 'test' = 'development'",
  PORT: "string.integer.parse = '4000'",
  LOG_LEVEL: "'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' = 'info'",
  WEB_ORIGIN: "string.url = 'http://localhost:3000'",
  DATABASE_URL: "string > 0",
  JWT_ACCESS_SECRET: "string >= 32",
  ACCESS_TOKEN_TTL_SECONDS: "string.integer.parse = '900'",
  REFRESH_TOKEN_TTL_SECONDS: "string.integer.parse = '2592000'",
  ENCRYPTION_KEY: type("string.base64").narrow(
    (key, ctx) =>
      Buffer.from(key, "base64").length === 32 || ctx.mustBe("a base64-encoded 32-byte key"),
  ),
  STORAGE_DIR: "string = './storage'",
  MAX_UPLOAD_BYTES: "string.integer.parse = '26214400'",
  AI_API_KEY: "string = ''",
  AI_BASE_URL: "string.url = 'https://api.commandcode.ai/provider/v1'",
  AI_MODEL: "string = 'deepseek/deepseek-v4.1-flash'",
});

export type Env = typeof envSchema.infer;

/** Validates `process.env` once at boot; the process refuses to start on error. */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const env = envSchema(source);
  if (env instanceof type.errors) {
    throw new Error(`Invalid environment configuration:\n${env.summary}`);
  }
  return env;
}
