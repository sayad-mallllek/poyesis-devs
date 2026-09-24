import { isoDateSchema, type FormField, type UiBlock } from "@repo/contracts";
import { type } from "arktype";
import { defineTool, type AssistantTool } from "./tool-kit.js";

const tone = type("'default' | 'positive' | 'warning' | 'danger' | 'info'");
const cell = type("string | number | boolean | null");

const chartSchema = type({
  chartType: "'bar' | 'line' | 'area' | 'pie'",
  title: "0 < string <= 120",
  "description?": "string <= 300",
  xKey: type("string > 0").describe("key of the category / x value in each datum"),
  series: type({ key: "string > 0", label: "string > 0" }).array().atLeastLength(1).atMostLength(6),
  data: type({ "[string]": "string | number | null" }).array().atLeastLength(1).atMostLength(200),
  "unit?": type("string <= 12").describe("e.g. h, %, €"),
  "stacked?": "boolean",
});

const formFieldSchema = type({
  name: /^[a-zA-Z][a-zA-Z0-9_]*$/,
  label: "0 < string <= 80",
  type: "'text' | 'textarea' | 'number' | 'date' | 'select' | 'multiselect' | 'boolean'",
  "required?": "boolean",
  "placeholder?": "string <= 120",
  "description?": "string <= 200",
  "options?": type({ value: "string", label: "string" }).array().atMostLength(50),
  "defaultValue?": "string | number | boolean | string[] | null",
  "min?": "number",
  "max?": "number",
});

const RENDERED = { rendered: true, note: "Shown to the user. Refer to it briefly instead of repeating the data." };

/** Checks the model didn't reference series keys absent from the data. */
function assertSeriesPresent(block: { xKey: string; series: { key: string }[]; data: Record<string, unknown>[] }) {
  const keys = new Set(block.data.flatMap((d) => Object.keys(d)));
  const missing = [block.xKey, ...block.series.map((s) => s.key)].filter((k) => !keys.has(k));
  if (missing.length) throw new Error(`Keys not found in data: ${missing.join(", ")}`);
}

function assertSelectOptions(fields: FormField[]) {
  const bad = fields.filter((f) => (f.type === "select" || f.type === "multiselect") && !f.options?.length);
  if (bad.length) throw new Error(`Select fields need options: ${bad.map((f) => f.name).join(", ")}`);
}

function show(emit: (block: UiBlock) => void, block: UiBlock) {
  emit(block);
  return RENDERED;
}

export function uiTools(): AssistantTool[] {
  return [
    defineTool({
      name: "render_chart",
      label: "Drawing chart",
      description:
        "Render a chart in the chat. Prefer this over listing numbers: bar for comparisons, line/area for trends over time, pie only for parts of a whole with ≤6 slices.",
      schema: chartSchema,
      run: async ({ emit }, input) => {
        assertSeriesPresent(input);
        return show(emit, { kind: "chart", ...input });
      },
    }),
    defineTool({
      name: "render_stats",
      label: "Summarizing key figures",
      description: "Render a row of KPI tiles (2–6 items) with optional hint and tone.",
      schema: type({
        "title?": "string <= 120",
        items: type({ label: "string > 0", value: "string | number", "hint?": "string <= 80", "tone?": tone })
          .array()
          .atLeastLength(1)
          .atMostLength(8),
      }),
      run: async ({ emit }, input) => show(emit, { kind: "stats", ...input }),
    }),
    defineTool({
      name: "render_table",
      label: "Building table",
      description: "Render a compact table for row-level details (≤50 rows).",
      schema: type({
        "title?": "string <= 120",
        columns: type({ key: "string > 0", label: "string > 0", "align?": "'left' | 'right' | 'center'" })
          .array()
          .atLeastLength(1)
          .atMostLength(8),
        rows: type({ "[string]": cell }).array().atMostLength(50),
      }),
      run: async ({ emit }, input) => show(emit, { kind: "table", ...input }),
    }),
    defineTool({
      name: "render_entity_list",
      label: "Listing results",
      description: "Render clickable cards for projects, people or clients (use real ids from tool results).",
      schema: type({
        "title?": "string <= 120",
        entity: "'project' | 'user' | 'client'",
        items: type({ id: "string > 0", title: "string > 0", "subtitle?": "string", "badge?": "string", "tone?": tone })
          .array()
          .atLeastLength(1)
          .atMostLength(20),
      }),
      run: async ({ emit }, input) => show(emit, { kind: "entityList", ...input }),
    }),
    defineTool({
      name: "render_timeline",
      label: "Drawing timeline",
      description: "Render dated events (milestones, deadlines, releases) on a vertical timeline.",
      schema: type({
        "title?": "string <= 120",
        items: type({ date: isoDateSchema, label: "string > 0", "description?": "string <= 200", "tone?": tone })
          .array()
          .atLeastLength(1)
          .atMostLength(30),
      }),
      run: async ({ emit }, input) => show(emit, { kind: "timeline", ...input }),
    }),
    defineTool({
      name: "ask_user",
      label: "Asking for details",
      description:
        "Show a form to collect missing or ambiguous information, then stop and wait. Prefer `select` with options drawn from real data (ids as values, names as labels) over free text. Use defaults when you can infer them.",
      mode: "awaitUser",
      schema: type({
        title: "0 < string <= 120",
        "description?": "string <= 300",
        "submitLabel?": "string <= 30",
        fields: formFieldSchema.array().atLeastLength(1).atMostLength(12),
      }),
      run: async ({ emit, callId }, input) => {
        assertSelectOptions(input.fields);
        emit({ kind: "form", id: callId, ...input });
        return { shown: true, note: "The form is displayed. End your turn; the answers arrive in the next message." };
      },
    }),
  ];
}
