import { defineConfig, env } from "prisma/config";

// Prisma 7 no longer loads `.env` implicitly.
try {
  process.loadEnvFile();
} catch {
  // No .env file: rely on the process environment (CI, containers).
}

export default defineConfig({
  schema: "prisma/schema",
  migrations: {
    path: "prisma/migrations",
    seed: "node --env-file-if-exists=.env dist/database/seed.js",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
