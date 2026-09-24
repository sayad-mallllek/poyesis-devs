import { Body, Controller, Get, HttpCode, Post, Req } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import {
  loginSchema,
  refreshSchema,
  type LoginInput,
  type Principal,
  type RefreshInput,
} from "@repo/contracts";
import type { FastifyRequest } from "fastify";
import { CurrentPrincipal, Public } from "../authz/decorators.js";
import { ark } from "../common/validation/ark.pipe.js";
import { AuthService, type ClientMeta } from "./auth.service.js";

const clientMeta = (req: FastifyRequest): ClientMeta => ({
  userAgent: req.headers["user-agent"],
  ipAddress: req.ip,
});

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post("login")
  @HttpCode(200)
  login(@Body(ark(loginSchema)) input: LoginInput, @Req() req: FastifyRequest) {
    return this.auth.login(input, clientMeta(req));
  }

  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post("refresh")
  @HttpCode(200)
  refresh(@Body(ark(refreshSchema)) { refreshToken }: RefreshInput, @Req() req: FastifyRequest) {
    return this.auth.refresh(refreshToken, clientMeta(req));
  }

  @Public()
  @Post("logout")
  @HttpCode(204)
  logout(@Body() body: { refreshToken?: string } | undefined) {
    return this.auth.logout(typeof body?.refreshToken === "string" ? body.refreshToken : undefined);
  }

  @Get("me")
  me(@CurrentPrincipal() principal: Principal) {
    return this.auth.session(principal.id);
  }
}
