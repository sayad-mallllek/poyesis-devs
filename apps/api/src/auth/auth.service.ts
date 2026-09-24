import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { AuthTokens, LoginInput, LoginResponse, Session } from "@repo/contracts";
import { createId } from "../common/ids.js";
import { AppConfig } from "../config/app-config.js";
import { PrincipalService } from "../authz/principal.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { randomToken, sha256 } from "../security/encryption.service.js";
import { PasswordService } from "../security/password.service.js";
import { UsersService } from "../users/users.service.js";

export interface ClientMeta {
  userAgent?: string;
  ipAddress?: string;
}

export interface AccessTokenPayload {
  sub: string;
  sid: string;
}

const INVALID_CREDENTIALS = "Invalid email or password";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: AppConfig,
    private readonly passwords: PasswordService,
    private readonly principals: PrincipalService,
    private readonly users: UsersService,
  ) {}

  async login({ email, password }: LoginInput, meta: ClientMeta): Promise<LoginResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, passwordHash: true, status: true },
    });
    const valid = await this.passwords.verify(user?.passwordHash ?? null, password);
    if (!user || !valid) throw new UnauthorizedException(INVALID_CREDENTIALS);
    if (user.status !== "ACTIVE") throw new UnauthorizedException("This account is suspended");

    const tokens = await this.issueTokens(user.id, createId(), meta);
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    return { ...(await this.session(user.id)), tokens };
  }

  /**
   * Rotates a refresh token. Presenting an already-rotated token is treated as
   * theft: the whole token family is revoked and the caller must log in again.
   */
  async refresh(refreshToken: string, meta: ClientMeta): Promise<LoginResponse> {
    const existing = await this.prisma.authSession.findUnique({
      where: { tokenHash: sha256(refreshToken) },
    });
    if (!existing) throw new UnauthorizedException("Invalid refresh token");

    if (existing.rotatedAt || existing.revokedAt) {
      await this.revokeFamily(existing.familyId);
      throw new UnauthorizedException("Refresh token reuse detected; please sign in again");
    }
    if (existing.expiresAt <= new Date()) throw new UnauthorizedException("Session expired");

    const principal = await this.principals.load(existing.userId);
    if (!principal) {
      await this.revokeFamily(existing.familyId);
      throw new UnauthorizedException("This account is no longer active");
    }

    // Conditional update guarantees a single winner under concurrent refreshes.
    const { count } = await this.prisma.authSession.updateMany({
      where: { id: existing.id, rotatedAt: null },
      data: { rotatedAt: new Date() },
    });
    if (count === 0) throw new UnauthorizedException("Refresh token already used");

    const tokens = await this.issueTokens(existing.userId, existing.familyId, meta);
    return { ...(await this.session(existing.userId)), tokens };
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;
    const existing = await this.prisma.authSession.findUnique({
      where: { tokenHash: sha256(refreshToken) },
      select: { familyId: true },
    });
    if (existing) await this.revokeFamily(existing.familyId);
  }

  async session(userId: string): Promise<Session> {
    const principal = await this.principals.load(userId);
    if (!principal) throw new UnauthorizedException("This account is no longer active");
    const user = await this.users.get({ principal, origin: "web" }, userId);
    return { user, principal };
  }

  /** Verifies an access token and ensures its session family is still alive. */
  async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    let payload: AccessTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<AccessTokenPayload>(token);
    } catch {
      throw new UnauthorizedException("Invalid or expired access token");
    }
    const alive = await this.prisma.authSession.findFirst({
      where: { familyId: payload.sid, revokedAt: null },
      select: { id: true },
    });
    if (!alive) throw new UnauthorizedException("Session revoked");
    return payload;
  }

  private async issueTokens(userId: string, familyId: string, meta: ClientMeta): Promise<AuthTokens> {
    const { accessTtlSeconds, refreshTtlSeconds } = this.config.auth;
    const refreshToken = randomToken(48);
    await this.prisma.authSession.create({
      data: {
        userId,
        familyId,
        tokenHash: sha256(refreshToken),
        userAgent: meta.userAgent?.slice(0, 500),
        ipAddress: meta.ipAddress,
        expiresAt: new Date(Date.now() + refreshTtlSeconds * 1000),
      },
    });
    const accessToken = await this.jwt.signAsync({ sub: userId, sid: familyId } satisfies AccessTokenPayload);
    return {
      accessToken,
      refreshToken,
      accessTokenExpiresIn: accessTtlSeconds,
      refreshTokenExpiresIn: refreshTtlSeconds,
    };
  }

  private async revokeFamily(familyId: string) {
    await this.prisma.authSession.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
