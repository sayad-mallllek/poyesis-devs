import { describe, expect, it } from "vitest";
import { peopleTools } from "./people.tools.js";
import { projectTools } from "./project.tools.js";
import { scheduleTools } from "./schedule.tools.js";
import type { ToolDeps } from "./tool-deps.js";
import { toOpenAiTool } from "./tool-kit.js";
import { uiTools } from "./ui.tools.js";
import { workspaceTools } from "./workspace.tools.js";

// Factories only capture deps; nothing is called at definition time.
const deps = {} as ToolDeps;
const tools = [...workspaceTools(deps), ...projectTools(deps), ...peopleTools(deps), ...scheduleTools(deps), ...uiTools()];

describe("assistant tools", () => {
  it("have unique, API-safe names", () => {
    const names = tools.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
    for (const name of names) expect(name).toMatch(/^[a-z][a-z0-9_]{2,63}$/);
  });

  it.each(tools.map((t) => [t.name, t] as const))("%s converts to an OpenAI function schema", (_name, tool) => {
    const definition = toOpenAiTool(tool);
    expect(definition.function.parameters).toMatchObject({ type: "object" });
    expect(definition.function.parameters).not.toHaveProperty("$schema");
    expect(definition.function.description.length).toBeGreaterThan(0);
  });

  it("gate destructive tools behind confirmation", () => {
    const destructive = tools.filter((t) => /^(archive|delete|remove|suspend)_/.test(t.name));
    expect(destructive.length).toBeGreaterThan(0);
    for (const tool of destructive) {
      expect(tool.mode).toBe("confirm");
      expect(tool.describe).toBeTypeOf("function");
    }
  });
});
