import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { describe, expect, it } from "vitest";
import { allocateBudget, describeAttachments, omitAttachmentBodies } from "./attachment-context.js";
import { buildHistory } from "./history.js";

const file = (fileName: string, text: string | null) => ({ fileName, mimeType: "text/plain", sizeBytes: 10, text });

describe("allocateBudget", () => {
  it("keeps short files whole and gives the rest to long ones", () => {
    expect(allocateBudget([10, 1000, 20], 300)).toEqual([10, 270, 20]);
  });

  it("splits evenly when every file is too long", () => {
    expect(allocateBudget([500, 500, 500], 300)).toEqual([100, 100, 100]);
  });

  it("never exceeds the budget", () => {
    const allocation = allocateBudget([7, 99, 13, 250, 1], 100);
    expect(allocation.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(100);
  });
});

describe("describeAttachments", () => {
  it("marks unreadable files and truncates over-budget text", () => {
    const out = describeAttachments([file("a.txt", "x".repeat(50)), file("photo.png", null)], 20);
    expect(out).toContain(`<attachment name="a.txt" type="text/plain" bytes="10">\n${"x".repeat(20)}\n… [truncated`);
    expect(out).toContain(`name="photo.png"`);
    expect(out).toContain(`readable="false"`);
  });

  it("escapes attribute values", () => {
    expect(describeAttachments([file(`a"<b>.txt`, "hi")])).toContain(`name="a&quot;&lt;b>.txt"`);
  });
});

describe("attachments in history", () => {
  const withFile = (text: string) => `Summarize\n\n${describeAttachments([file("spec.md", text)])}`;

  it("omitAttachmentBodies keeps the element but drops its content", () => {
    expect(omitAttachmentBodies(withFile("secret body"))).toBe(
      `Summarize\n\n<attachment name="spec.md" type="text/plain" bytes="10">[content omitted from an older turn]</attachment>`,
    );
  });

  it("replays only the previous turn's attachment contents", () => {
    const turns = [
      [new HumanMessage(withFile("old body"))],
      [new AIMessage("ok")],
      [new HumanMessage(withFile("recent body"))],
      [new AIMessage("ok")],
    ];
    const contents = buildHistory(turns).map((m) => String(m.content));
    expect(contents[0]).not.toContain("old body");
    expect(contents[0]).toContain(`name="spec.md"`);
    expect(contents[2]).toContain("recent body");
  });
});
