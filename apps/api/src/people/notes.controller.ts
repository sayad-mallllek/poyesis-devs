import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from "@nestjs/common";
import {
  createUserNoteSchema,
  updateUserNoteSchema,
  type CreateUserNoteInput,
  type UpdateUserNoteInput,
} from "@repo/contracts";
import type { Actor } from "../authz/actor.js";
import { CurrentActor, RequirePermission } from "../authz/decorators.js";
import { ark } from "../common/validation/ark.pipe.js";
import { NotesService } from "./notes.service.js";

@Controller("users/:userId/notes")
export class UserNotesController {
  constructor(private readonly notes: NotesService) {}

  @Get()
  @RequirePermission("read", "UserNote")
  list(@CurrentActor() actor: Actor, @Param("userId") userId: string) {
    return this.notes.list(actor, userId);
  }

  @Post()
  @RequirePermission("create", "UserNote")
  create(
    @CurrentActor() actor: Actor,
    @Param("userId") userId: string,
    @Body(ark(createUserNoteSchema)) input: CreateUserNoteInput,
  ) {
    return this.notes.create(actor, userId, input);
  }
}

@Controller("notes")
export class NotesController {
  constructor(private readonly notes: NotesService) {}

  @Patch(":id")
  update(
    @CurrentActor() actor: Actor,
    @Param("id") id: string,
    @Body(ark(updateUserNoteSchema)) input: UpdateUserNoteInput,
  ) {
    return this.notes.update(actor, id, input);
  }

  @Delete(":id")
  @HttpCode(204)
  remove(@CurrentActor() actor: Actor, @Param("id") id: string) {
    return this.notes.remove(actor, id);
  }
}
