import { Body, Controller, Get, Patch } from "@nestjs/common";
import { updateCompanySchema, type UpdateCompanyInput } from "@repo/contracts";
import type { Actor } from "../authz/actor.js";
import { CurrentActor, RequirePermission } from "../authz/decorators.js";
import { ark } from "../common/validation/ark.pipe.js";
import { CompanyService } from "./company.service.js";

@Controller("company")
export class CompanyController {
  constructor(private readonly company: CompanyService) {}

  @Get()
  get(@CurrentActor() actor: Actor) {
    return this.company.get(actor);
  }

  @Patch()
  @RequirePermission("update", "Company")
  update(@CurrentActor() actor: Actor, @Body(ark(updateCompanySchema)) input: UpdateCompanyInput) {
    return this.company.update(actor, input);
  }
}
