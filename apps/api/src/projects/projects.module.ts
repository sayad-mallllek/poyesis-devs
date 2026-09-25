import { Module } from "@nestjs/common";
import { StorageModule } from "../storage/storage.module.js";
import { AttachmentsController } from "./attachments.controller.js";
import { AttachmentsService } from "./attachments.service.js";
import { MilestonesController } from "./milestones.controller.js";
import { MilestonesService } from "./milestones.service.js";
import { ProjectAnalyticsService } from "./project-analytics.service.js";
import { ProjectContextService } from "./project-context.service.js";
import { ProjectMembersController } from "./project-members.controller.js";
import { ProjectMembersService } from "./project-members.service.js";
import { ProjectsController } from "./projects.controller.js";
import { ProjectsService } from "./projects.service.js";
import { RisksController } from "./risks.controller.js";
import { RisksService } from "./risks.service.js";
import { StatusUpdatesController } from "./status-updates.controller.js";
import { StatusUpdatesService } from "./status-updates.service.js";
import { TextExtractorService } from "./text-extractor.service.js";

const services = [
  ProjectsService,
  ProjectMembersService,
  MilestonesService,
  RisksService,
  StatusUpdatesService,
  AttachmentsService,
  ProjectAnalyticsService,
  ProjectContextService,
];

@Module({
  imports: [StorageModule],
  controllers: [
    ProjectsController,
    ProjectMembersController,
    MilestonesController,
    RisksController,
    StatusUpdatesController,
    AttachmentsController,
  ],
  providers: [...services, TextExtractorService],
  exports: [...services, TextExtractorService],
})
export class ProjectsModule {}
