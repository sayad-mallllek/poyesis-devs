import type { UiTone } from "@repo/contracts";
import type { Tone } from "@/components/app/status-badges";

export const UI_TONE: Record<UiTone, Tone> = {
  default: "neutral",
  positive: "success",
  warning: "warning",
  danger: "danger",
  info: "info",
};
