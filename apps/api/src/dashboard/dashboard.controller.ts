import { Controller, Get } from "@nestjs/common";
import type { Actor } from "../authz/actor.js";
import { CurrentActor } from "../authz/decorators.js";
import { DashboardService } from "./dashboard.service.js";

@Controller("dashboard")
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get()
  overview(@CurrentActor() actor: Actor) {
    return this.dashboard.overview(actor);
  }
}
