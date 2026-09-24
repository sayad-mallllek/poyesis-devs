import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Action, Subject } from "@repo/contracts";
import { AuthzService } from "../authz/authz.service.js";
import {
  IS_PUBLIC,
  REQUIRED_PERMISSION,
  type AuthenticatedRequest,
} from "../authz/decorators.js";
import { PrincipalService } from "../authz/principal.service.js";
import { AuthService } from "./auth.service.js";

/**
 * Global guard: authenticates every non-public route with a Bearer access
 * token, resolves the ABAC principal, then enforces `@RequirePermission`.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService,
    private readonly principals: PrincipalService,
    private readonly authz: AuthzService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets)) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
    if (!token) throw new UnauthorizedException("Missing access token");

    const payload = await this.auth.verifyAccessToken(token);
    const principal = await this.principals.load(payload.sub);
    if (!principal) throw new UnauthorizedException("This account is no longer active");
    request.principal = principal;

    const required = this.reflector.getAllAndOverride<{ action: Action; subject: Subject }>(
      REQUIRED_PERMISSION,
      targets,
    );
    if (required && !this.authz.can(principal, required.action, required.subject)) {
      throw new ForbiddenException(`You are not allowed to ${required.action} ${required.subject}`);
    }
    return true;
  }
}
