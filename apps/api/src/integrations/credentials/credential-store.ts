import { Injectable, PreconditionFailedException } from "@nestjs/common";
import type { IntegrationProvider } from "@repo/contracts";
import { PrismaService } from "../../prisma/prisma.service.js";
import { EncryptionService } from "../../security/encryption.service.js";

export const PROVIDER_LABEL: Record<IntegrationProvider, "GitHub" | "Sentry"> = {
  GITHUB: "GitHub",
  SENTRY: "Sentry",
};

export interface StoredCredential {
  token: string;
  config: Record<string, string>;
  /**
   * Changes whenever the credential row is written. Clients and response
   * caches are keyed by it, so reconfiguring an integration invalidates them.
   */
  version: number;
}

/** Only string values are kept: config is non-secret, flat and provider-defined. */
export function toStringRecord(json: unknown): Record<string, string> {
  if (!json || typeof json !== "object" || Array.isArray(json)) return {};
  return Object.fromEntries(
    Object.entries(json).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
}

/** Internal access to decrypted integration credentials. Never expose `token`. */
@Injectable()
export class CredentialStore {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  async find(provider: IntegrationProvider): Promise<StoredCredential | null> {
    const row = await this.prisma.integrationCredential.findUnique({ where: { provider } });
    if (!row) return null;
    let token: string;
    try {
      token = this.encryption.decrypt(row.encryptedToken);
    } catch {
      // Typically an ENCRYPTION_KEY rotation; the only fix is to re-enter the token.
      throw new PreconditionFailedException(
        `The stored ${PROVIDER_LABEL[provider]} token cannot be decrypted; configure the integration again`,
      );
    }
    return { token, config: toStringRecord(row.config), version: row.updatedAt.getTime() };
  }

  async require(provider: IntegrationProvider): Promise<StoredCredential> {
    const credential = await this.find(provider);
    if (!credential) {
      throw new PreconditionFailedException(`${PROVIDER_LABEL[provider]} integration is not configured`);
    }
    return credential;
  }

  /** Non-secret configuration, without decrypting the token. */
  async config(provider: IntegrationProvider): Promise<Record<string, string> | null> {
    const row = await this.prisma.integrationCredential.findUnique({
      where: { provider },
      select: { config: true },
    });
    return row ? toStringRecord(row.config) : null;
  }
}
