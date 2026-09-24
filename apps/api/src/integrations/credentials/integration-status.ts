import type { IntegrationProvider, IntegrationStatus } from "@repo/contracts";
import { toIsoOrNull } from "../../common/serialization/index.js";
import { toStringRecord } from "./credential-store.js";

export interface CredentialStatusRow {
  tokenHint: string;
  config: unknown;
  lastVerifiedAt: Date | null;
  lastError: string | null;
  updatedAt: Date;
}

export const tokenHint = (token: string) => token.slice(-4);

export const toIntegrationStatus = (
  provider: IntegrationProvider,
  row: CredentialStatusRow | null,
): IntegrationStatus => ({
  provider,
  configured: row !== null,
  config: row ? toStringRecord(row.config) : {},
  tokenHint: row?.tokenHint ?? null,
  lastVerifiedAt: toIsoOrNull(row?.lastVerifiedAt),
  lastError: row?.lastError ?? null,
  updatedAt: toIsoOrNull(row?.updatedAt),
});
