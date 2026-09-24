import { Module } from "@nestjs/common";
import { AllocationsController } from "./allocations.controller.js";
import { AllocationsService } from "./allocations.service.js";
import { ScheduleController } from "./schedule.controller.js";
import { SchedulingService } from "./scheduling.service.js";
import { TimeOffController } from "./time-off.controller.js";
import { TimeOffService } from "./time-off.service.js";

@Module({
  controllers: [AllocationsController, TimeOffController, ScheduleController],
  providers: [AllocationsService, TimeOffService, SchedulingService],
  exports: [AllocationsService, TimeOffService, SchedulingService],
})
export class SchedulingModule {}
