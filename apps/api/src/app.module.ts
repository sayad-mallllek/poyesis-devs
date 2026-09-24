import { Module } from "@nestjs/common";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { LoggerModule } from "nestjs-pino";
import { AiModule } from "./ai/ai.module.js";
import { AuditModule } from "./audit/audit.module.js";
import { AuthModule } from "./auth/auth.module.js";
import { AuthzModule } from "./authz/authz.module.js";
import { ClientsModule } from "./clients/clients.module.js";
import { AllExceptionsFilter } from "./common/http/exception.filter.js";
import { CompanyModule } from "./company/company.module.js";
import { AppConfig } from "./config/app-config.js";
import { ConfigModule } from "./config/config.module.js";
import { HealthController } from "./health/health.controller.js";
import { PrismaModule } from "./prisma/prisma.module.js";
import { SecurityModule } from "./security/security.module.js";
import { UsersModule } from "./users/users.module.js";
import { DashboardModule } from "./dashboard/dashboard.module.js";
import { IntegrationsModule } from "./integrations/integrations.module.js";
import { PeopleModule } from "./people/people.module.js";
import { ProjectsModule } from "./projects/projects.module.js";
import { SchedulingModule } from "./scheduling/scheduling.module.js";

@Module({
  imports: [
    ConfigModule,
    LoggerModule.forRootAsync({
      inject: [AppConfig],
      useFactory: (config: AppConfig) => ({
        pinoHttp: {
          level: config.logLevel,
          transport: config.isProduction ? undefined : { target: "pino-pretty", options: { singleLine: true } },
          redact: ["req.headers.authorization", "req.headers.cookie"],
          autoLogging: { ignore: (req) => req.url === "/v1/health" },
          serializers: {
            req: (req: { id: string; method: string; url: string }) => ({
              id: req.id,
              method: req.method,
              url: req.url,
            }),
            res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
          },
        },
      }),
    }),
    ThrottlerModule.forRoot([{ name: "default", ttl: 60_000, limit: 600 }]),
    PrismaModule,
    SecurityModule,
    AuthzModule,
    AuditModule,
    CompanyModule,
    AuthModule,
    UsersModule,
    ClientsModule,
    ProjectsModule,
    SchedulingModule,
    PeopleModule,
    IntegrationsModule,
    DashboardModule,
    AiModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
