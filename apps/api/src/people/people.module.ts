import { Module } from "@nestjs/common";
import { NotesController, UserNotesController } from "./notes.controller.js";
import { NotesService } from "./notes.service.js";
import { SkillsController } from "./skills.controller.js";
import { SkillsService } from "./skills.service.js";
import { UserSkillsController } from "./user-skills.controller.js";
import { UserSkillsService } from "./user-skills.service.js";

@Module({
  controllers: [SkillsController, UserSkillsController, UserNotesController, NotesController],
  providers: [SkillsService, UserSkillsService, NotesService],
  exports: [SkillsService, UserSkillsService, NotesService],
})
export class PeopleModule {}
