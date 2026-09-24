import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from "@nestjs/common";
import {
  createClientSchema,
  listClientsQuerySchema,
  updateClientSchema,
  type CreateClientInput,
  type ListClientsQuery,
  type UpdateClientInput,
} from "@repo/contracts";
import type { Actor } from "../authz/actor.js";
import { CurrentActor, RequirePermission } from "../authz/decorators.js";
import { ark } from "../common/validation/ark.pipe.js";
import { ClientsService } from "./clients.service.js";

@Controller("clients")
export class ClientsController {
  constructor(private readonly clients: ClientsService) {}

  @Get()
  @RequirePermission("read", "Client")
  list(@CurrentActor() actor: Actor, @Query(ark(listClientsQuerySchema)) query: ListClientsQuery) {
    return this.clients.list(actor, query);
  }

  @Post()
  @RequirePermission("create", "Client")
  create(@CurrentActor() actor: Actor, @Body(ark(createClientSchema)) input: CreateClientInput) {
    return this.clients.create(actor, input);
  }

  @Get(":id")
  get(@CurrentActor() actor: Actor, @Param("id") id: string) {
    return this.clients.get(actor, id);
  }

  @Patch(":id")
  update(
    @CurrentActor() actor: Actor,
    @Param("id") id: string,
    @Body(ark(updateClientSchema)) input: UpdateClientInput,
  ) {
    return this.clients.update(actor, id, input);
  }

  @Delete(":id")
  @HttpCode(204)
  remove(@CurrentActor() actor: Actor, @Param("id") id: string) {
    return this.clients.remove(actor, id);
  }
}
