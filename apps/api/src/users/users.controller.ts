import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from "@nestjs/common";
import {
  changePasswordSchema,
  createUserSchema,
  listUsersQuerySchema,
  updateUserSchema,
  type ChangePasswordInput,
  type CreateUserInput,
  type ListUsersQuery,
  type UpdateUserInput,
} from "@repo/contracts";
import type { Actor } from "../authz/actor.js";
import { CurrentActor, RequirePermission } from "../authz/decorators.js";
import { ark } from "../common/validation/ark.pipe.js";
import { UsersService } from "./users.service.js";

@Controller("users")
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @RequirePermission("read", "User")
  list(@CurrentActor() actor: Actor, @Query(ark(listUsersQuerySchema)) query: ListUsersQuery) {
    return this.users.list(actor, query);
  }

  @Post()
  @RequirePermission("create", "User")
  create(@CurrentActor() actor: Actor, @Body(ark(createUserSchema)) input: CreateUserInput) {
    return this.users.create(actor, input);
  }

  @Post("me/password")
  @HttpCode(204)
  changePassword(
    @CurrentActor() actor: Actor,
    @Body(ark(changePasswordSchema)) input: ChangePasswordInput,
  ) {
    return this.users.changePassword(actor, input);
  }

  @Get(":id")
  get(@CurrentActor() actor: Actor, @Param("id") id: string) {
    return this.users.get(actor, id);
  }

  @Patch(":id")
  update(
    @CurrentActor() actor: Actor,
    @Param("id") id: string,
    @Body(ark(updateUserSchema)) input: UpdateUserInput,
  ) {
    return this.users.update(actor, id, input);
  }

  @Delete(":id")
  suspend(@CurrentActor() actor: Actor, @Param("id") id: string) {
    return this.users.suspend(actor, id);
  }
}
