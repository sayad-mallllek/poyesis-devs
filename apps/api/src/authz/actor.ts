import type { Principal } from "@repo/contracts";

/**
 * Who performs an operation and through which channel. Every service method
 * that reads or mutates data takes an actor so that authorization and audit
 * behave identically for the REST API and for AI tool calls.
 */
export interface Actor {
  principal: Principal;
  origin: "web" | "ai" | "system";
}
