import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { Public } from "../authz/decorators.js";
import { PrismaService } from "../prisma/prisma.service.js";

@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  async check() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: "ok" };
    } catch {
      throw new ServiceUnavailableException("Database unavailable");
    }
  }
}
