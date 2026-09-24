import { type } from "arktype";
import type { IsoDateTime } from "./common.js";
import { CLIENT_STATUSES, type ClientStatus, type ProjectStatus } from "./enums.js";

export const clientContactSchema = type({
  "id?": "string",
  name: "0 < string <= 120",
  "email?": "string.email | null",
  "phone?": "string <= 40 | null",
  "position?": "string <= 120 | null",
  "isPrimary?": "boolean",
});
export type ClientContactInput = typeof clientContactSchema.infer;

export const createClientSchema = type({
  name: "0 < string <= 160",
  "legalName?": "string <= 200 | null",
  "status?": type.enumerated(...CLIENT_STATUSES),
  "industry?": "string <= 120 | null",
  "website?": "string.url | null",
  "email?": "string.email | null",
  "phone?": "string <= 40 | null",
  "address?": "string <= 500 | null",
  "country?": "string <= 80 | null",
  "vatNumber?": "string <= 60 | null",
  "notes?": "string <= 5000 | null",
  "contacts?": clientContactSchema.array(),
});
export type CreateClientInput = typeof createClientSchema.infer;

export const updateClientSchema = createClientSchema.partial();
export type UpdateClientInput = typeof updateClientSchema.infer;

export const listClientsQuerySchema = type({
  "page?": "string.integer.parse |> number.integer >= 1",
  "pageSize?": "string.integer.parse |> 1 <= number.integer <= 100",
  "search?": "string",
  "status?": type.enumerated(...CLIENT_STATUSES),
});
export type ListClientsQuery = typeof listClientsQuerySchema.infer;

export interface ClientContact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  position: string | null;
  isPrimary: boolean;
}

export interface ClientSummary {
  id: string;
  name: string;
  status: ClientStatus;
  industry: string | null;
  country: string | null;
  website: string | null;
  projectCount: number;
  createdAt: IsoDateTime;
}

export interface ClientDetail extends ClientSummary {
  legalName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  vatNumber: string | null;
  notes: string | null;
  contacts: ClientContact[];
  projects: Array<{
    id: string;
    code: string;
    name: string;
    status: ProjectStatus;
    color: string;
  }>;
  updatedAt: IsoDateTime;
}
