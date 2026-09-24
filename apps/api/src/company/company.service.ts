import { Injectable } from "@nestjs/common";
import type { Company, UpdateCompanyInput } from "@repo/contracts";
import { AuditService } from "../audit/audit.service.js";
import type { Actor } from "../authz/actor.js";
import { AuthzService } from "../authz/authz.service.js";
import { definedOnly } from "../common/serialization/index.js";
import { PrismaService } from "../prisma/prisma.service.js";

const COMPANY_ID = "company";

@Injectable()
export class CompanyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authz: AuthzService,
    private readonly audit: AuditService,
  ) {}

  /** The singleton row is created lazily so a fresh database is usable at once. */
  async settings() {
    return this.prisma.company.upsert({
      where: { id: COMPANY_ID },
      create: { id: COMPANY_ID, name: "My Company" },
      update: {},
    });
  }

  async get(actor: Actor): Promise<Company> {
    this.authz.assert(actor.principal, "read", "Company");
    return toCompany(await this.settings());
  }

  async update(actor: Actor, input: UpdateCompanyInput): Promise<Company> {
    this.authz.assert(actor.principal, "update", "Company");
    await this.settings();
    const row = await this.prisma.company.update({ where: { id: COMPANY_ID }, data: definedOnly(input) });
    await this.audit.record(actor, {
      action: "company.updated",
      entityType: "Company",
      entityId: COMPANY_ID,
      summary: `Updated company settings: ${Object.keys(definedOnly(input)).join(", ")}`,
    });
    return toCompany(row);
  }
}

function toCompany(row: Awaited<ReturnType<CompanyService["settings"]>>): Company {
  return {
    id: row.id,
    name: row.name,
    legalName: row.legalName,
    website: row.website,
    logoUrl: row.logoUrl,
    timezone: row.timezone,
    currency: row.currency,
    workingHoursPerDay: row.workingHoursPerDay,
    workingDays: row.workingDays,
    aiInstructions: row.aiInstructions,
    updatedAt: row.updatedAt.toISOString(),
  };
}
