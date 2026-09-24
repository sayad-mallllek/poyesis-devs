import { Global, Module } from "@nestjs/common";
import { AuthzService } from "./authz.service.js";
import { PrincipalService } from "./principal.service.js";

@Global()
@Module({ providers: [AuthzService, PrincipalService], exports: [AuthzService, PrincipalService] })
export class AuthzModule {}
