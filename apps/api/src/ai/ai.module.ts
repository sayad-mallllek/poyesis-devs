import { Module } from "@nestjs/common";
import { ClientsModule } from "../clients/clients.module.js";
import { DashboardModule } from "../dashboard/dashboard.module.js";
import { IntegrationsModule } from "../integrations/integrations.module.js";
import { PeopleModule } from "../people/people.module.js";
import { ProjectsModule } from "../projects/projects.module.js";
import { SchedulingModule } from "../scheduling/scheduling.module.js";
import { UsersModule } from "../users/users.module.js";
import { AssistantController } from "./assistant.controller.js";
import { AssistantService } from "./assistant.service.js";
import { ChatSessionsService } from "./chat-sessions.service.js";
import { AssistantModel } from "./model/assistant-model.js";
import { CommandCodeModel } from "./model/command-code.model.js";
import { ToolRegistry } from "./tools/tool-registry.service.js";

@Module({
  imports: [
    UsersModule,
    ClientsModule,
    ProjectsModule,
    SchedulingModule,
    PeopleModule,
    IntegrationsModule,
    DashboardModule,
  ],
  controllers: [AssistantController],
  providers: [
    AssistantService,
    ChatSessionsService,
    ToolRegistry,
    { provide: AssistantModel, useClass: CommandCodeModel },
  ],
})
export class AiModule {}
