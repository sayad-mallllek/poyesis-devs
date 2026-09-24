import "reflect-metadata";
import helmet from "@fastify/helmet";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import { Logger } from "nestjs-pino";
import { randomUUID } from "node:crypto";
import { AppModule } from "./app.module.js";
import { AppConfig } from "./config/app-config.js";

async function bootstrap() {
  const adapter = new FastifyAdapter({
    trustProxy: true,
    bodyLimit: 2 * 1024 * 1024,
    genReqId: (req: { headers: Record<string, string | string[] | undefined> }) => (req.headers["x-request-id"] as string | undefined) ?? randomUUID(),
  });
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, adapter, {
    bufferLogs: true,
  });
  const config = app.get(AppConfig);
  app.useLogger(app.get(Logger));

  await app.register(helmet);
  await app.register(cors, { origin: [config.webOrigin], credentials: true });
  await app.register(multipart, { limits: { fileSize: config.storage.maxUploadBytes, files: 10 } });

  app.setGlobalPrefix("v1");
  app.enableShutdownHooks();

  await app.listen({ port: config.port, host: "0.0.0.0" });
}

void bootstrap();
