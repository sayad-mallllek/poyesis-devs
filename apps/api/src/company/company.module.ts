import { Global, Module } from "@nestjs/common";
import { CompanyController } from "./company.controller.js";
import { CompanyService } from "./company.service.js";

@Global()
@Module({ controllers: [CompanyController], providers: [CompanyService], exports: [CompanyService] })
export class CompanyModule {}
