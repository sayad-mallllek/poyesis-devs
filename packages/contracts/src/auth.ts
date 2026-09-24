import { type } from "arktype";
import type { Principal } from "./authz/model.js";
import type { UserDetail } from "./users.js";

export const PASSWORD_MIN_LENGTH = 10;

export const passwordSchema = type(`string >= ${PASSWORD_MIN_LENGTH}`)
  .narrow(
    (value, ctx) =>
      (/[a-z]/i.test(value) && /\d/.test(value)) ||
      ctx.mustBe("a password containing at least one letter and one digit"),
  )
  .describe(`at least ${PASSWORD_MIN_LENGTH} characters with a letter and a digit`);

export const loginSchema = type({
  email: "string.email",
  password: "string > 0",
});
export type LoginInput = typeof loginSchema.infer;

export const refreshSchema = type({ refreshToken: "string > 0" });
export type RefreshInput = typeof refreshSchema.infer;

export const changePasswordSchema = type({
  currentPassword: "string > 0",
  newPassword: passwordSchema,
});
export type ChangePasswordInput = typeof changePasswordSchema.infer;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  /** Access token lifetime in seconds. */
  accessTokenExpiresIn: number;
  /** Refresh token lifetime in seconds. */
  refreshTokenExpiresIn: number;
}

export interface Session {
  user: UserDetail;
  principal: Principal;
}

export interface LoginResponse extends Session {
  tokens: AuthTokens;
}
