import { type } from "arktype";
import { describe, expect, it } from "vitest";
import {
  createAllocationSchema,
  createProjectSchema,
  listProjectsQuerySchema,
  loginSchema,
  sendChatMessageSchema,
} from "../src/index.js";

describe("schemas", () => {
  it("parses numeric query strings", () => {
    const out = listProjectsQuerySchema({ page: "2", pageSize: "10", status: "ACTIVE" });
    expect(out).toEqual({ page: 2, pageSize: 10, status: "ACTIVE" });
    expect(listProjectsQuerySchema({ pageSize: "500" })).toBeInstanceOf(type.errors);
  });

  it("rejects inverted date ranges with a field path", () => {
    const out = createAllocationSchema({
      userId: "u",
      projectId: "p",
      startDate: "2026-10-10",
      endDate: "2026-10-01",
      hoursPerDay: 4,
    });
    expect(out).toBeInstanceOf(type.errors);
    expect((out as type.errors)[0]?.path.join(".")).toBe("endDate");
  });

  it("validates projects", () => {
    expect(createProjectSchema({ name: "Website", code: "ACME-WEB", tags: ["a"] })).not.toBeInstanceOf(type.errors);
    expect(createProjectSchema({ name: "", code: "bad code" })).toBeInstanceOf(type.errors);
  });

  it("requires content or a form response", () => {
    expect(sendChatMessageSchema({})).toBeInstanceOf(type.errors);
    expect(sendChatMessageSchema({ formResponse: { formId: "f", values: null } })).not.toBeInstanceOf(type.errors);
  });

  it("validates emails", () => {
    expect(loginSchema({ email: "nope", password: "x" })).toBeInstanceOf(type.errors);
  });
});
