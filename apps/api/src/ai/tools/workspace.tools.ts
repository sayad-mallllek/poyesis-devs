import {
  CLIENT_STATUSES,
  createClientSchema,
  linkRepositorySchema,
  linkSentryProjectSchema,
  updateClientSchema,
} from "@repo/contracts";
import { type } from "arktype";
import type { ToolDeps } from "./tool-deps.js";
import { defineTool, idArg, noArgs, type AssistantTool } from "./tool-kit.js";

const GITHUB_KINDS = ["overview", "pull_requests", "workflow_runs", "deployments", "releases"] as const;

/** Dashboard, clients, integrations and audit. */
export function workspaceTools(deps: ToolDeps): AssistantTool[] {
  return [
    defineTool({
      name: "get_dashboard",
      label: "Reading portfolio overview",
      description:
        "Portfolio overview: project counts by status and health, upcoming deadlines, overdue milestones, this week's utilization with over/under-booked people.",
      schema: noArgs,
      run: ({ actor }) => deps.dashboard.overview(actor),
    }),
    defineTool({
      name: "search_clients",
      label: "Searching clients",
      description: "List clients, optionally filtered by name or status. Returns ids.",
      requires: { action: "read", subject: "Client" },
      schema: type({ "search?": "string", "status?": type.enumerated(...CLIENT_STATUSES) }),
      run: async ({ actor }, input) => {
        const page = await deps.clients.list(actor, { ...input, pageSize: 50 });
        return { total: page.total, clients: page.items };
      },
    }),
    defineTool({
      name: "get_client",
      label: "Reading client",
      description: "A client's details, contacts and projects.",
      requires: { action: "read", subject: "Client" },
      schema: type({ clientId: idArg }),
      run: ({ actor }, { clientId }) => deps.clients.get(actor, clientId),
    }),
    defineTool({
      name: "create_client",
      label: "Creating client",
      description: "Create a client, optionally with contacts.",
      requires: { action: "create", subject: "Client" },
      schema: createClientSchema,
      run: ({ actor }, input) => deps.clients.create(actor, input),
    }),
    defineTool({
      name: "update_client",
      label: "Updating client",
      description: "Update a client. Sending `contacts` replaces the whole contact list.",
      requires: { action: "update", subject: "Client" },
      schema: type({ clientId: idArg, changes: updateClientSchema }),
      run: ({ actor }, { clientId, changes }) => deps.clients.update(actor, clientId, changes),
    }),
    defineTool({
      name: "delete_client",
      label: "Delete client",
      description: "Delete a client (its projects are kept, unlinked). The user is asked to confirm.",
      requires: { action: "delete", subject: "Client" },
      mode: "confirm",
      schema: type({ clientId: idArg, clientName: "string" }),
      describe: ({ clientName }) => `Delete the client "${clientName}". Its projects are kept but unlinked.`,
      run: async ({ actor }, { clientId }) => {
        await deps.clients.remove(actor, clientId);
        return { deleted: true };
      },
    }),
    defineTool({
      name: "get_github_activity",
      label: "Reading GitHub activity",
      description:
        "GitHub data for a project's linked repositories: overview, open/closed pull requests, Actions workflow runs, deployments or releases.",
      requires: { action: "read", subject: "RepositoryLink" },
      schema: type({
        projectId: idArg,
        kind: type.enumerated(...GITHUB_KINDS),
        "state?": "'open' | 'closed' | 'all'",
        "limit?": "1 <= number.integer <= 50",
      }),
      run: ({ actor }, { projectId, kind, state, limit = 20 }) => {
        const query = { state, limit };
        switch (kind) {
          case "overview":
            return deps.github.overview(actor, projectId);
          case "pull_requests":
            return deps.github.pullRequests(actor, projectId, query);
          case "workflow_runs":
            return deps.github.workflowRuns(actor, projectId, query);
          case "deployments":
            return deps.github.deployments(actor, projectId, query);
          case "releases":
            return deps.github.releases(actor, projectId, query);
        }
      },
    }),
    defineTool({
      name: "get_sentry_issues",
      label: "Reading Sentry errors",
      description: "Unresolved Sentry issues across a project's linked Sentry projects, with event and user counts.",
      requires: { action: "read", subject: "SentryLink" },
      schema: type({
        projectId: idArg,
        "statsPeriod?": "'24h' | '14d'",
        "query?": type("string").describe("Sentry search, default is:unresolved"),
        "limit?": "1 <= number.integer <= 50",
      }),
      run: ({ actor }, { projectId, ...query }) => deps.sentry.issues(actor, projectId, { limit: 20, ...query }),
    }),
    defineTool({
      name: "link_repository",
      label: "Linking GitHub repository",
      description: "Link a GitHub repository (owner/name or URL) to a project.",
      requires: { action: "create", subject: "RepositoryLink" },
      schema: type({ projectId: idArg, link: linkRepositorySchema }),
      run: ({ actor }, { projectId, link }) => deps.repositories.link(actor, projectId, link),
    }),
    defineTool({
      name: "link_sentry_project",
      label: "Linking Sentry project",
      description: "Link a Sentry project (by slug) to a project.",
      requires: { action: "create", subject: "SentryLink" },
      schema: type({ projectId: idArg, link: linkSentryProjectSchema }),
      run: ({ actor }, { projectId, link }) => deps.sentryLinks.link(actor, projectId, link),
    }),
    defineTool({
      name: "get_audit_log",
      label: "Reading audit log",
      description: "Recent changes in the workspace (who changed what, including AI-initiated changes).",
      requires: { action: "read", subject: "AuditLog" },
      schema: type({ "entityType?": "string", "entityId?": "string", "actorId?": "string" }),
      run: async ({ actor }, query) => (await deps.audit.list(actor, { ...query, pageSize: 30 })).items,
    }),
  ];
}
