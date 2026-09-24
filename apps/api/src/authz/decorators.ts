import { createParamDecorator, SetMetadata, type ExecutionContext } from "@nestjs/common";
import type { Action, Principal, Subject } from "@repo/contracts";
import type { FastifyRequest } from "fastify";
import type { Actor } from "./actor.js";

export const IS_PUBLIC = Symbol("isPublic");
/** Opts a route out of authentication. */
export const Public = () => SetMetadata(IS_PUBLIC, true);

export const REQUIRED_PERMISSION = Symbol("requiredPermission");
/**
 * Coarse, resource-less check performed by the guard ("may this role ever
 * `action` a `subject`?"). Resource-level checks happen in services.
 */
export const RequirePermission = (action: Action, subject: Subject) =>
  SetMetadata(REQUIRED_PERMISSION, { action, subject });

export interface AuthenticatedRequest extends FastifyRequest {
  principal?: Principal;
}

export const CurrentPrincipal = createParamDecorator((_: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
  if (!request.principal) throw new Error("CurrentPrincipal used on a public route");
  return request.principal;
});

/** The acting principal for REST requests (`origin: "web"`). */
export const CurrentActor = createParamDecorator((_: unknown, ctx: ExecutionContext): Actor => {
  const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
  if (!request.principal) throw new Error("CurrentActor used on a public route");
  return { principal: request.principal, origin: "web" };
});
