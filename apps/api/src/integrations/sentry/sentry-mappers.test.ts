import { describe, expect, it } from "vitest";
import { toAvailableProject, toSentryIssue, toSentryLink } from "./sentry-mappers.js";

// Shaped after `GET /api/0/projects/{org}/{project}/issues/` from the Sentry API docs.
const issue = {
  annotations: [],
  assignedTo: null,
  count: "150",
  culprit: "raven.scripts.runner in main",
  firstSeen: "2018-11-06T21:19:55Z",
  hasSeen: false,
  id: "1",
  isBookmarked: false,
  isPublic: false,
  isSubscribed: true,
  lastSeen: "2018-11-06T21:19:55Z",
  level: "error",
  logger: null,
  metadata: { title: "This is an example Python exception" },
  numComments: 0,
  permalink: "https://sentry.io/the-interstellar-jurisdiction/pump-station/issues/1/",
  project: { id: "2", name: "Pump Station", slug: "pump-station" },
  shareId: null,
  shortId: "PUMP-STATION-1",
  stats: {
    "24h": [
      [1541455200, 473],
      [1541458800, 914],
      [1541462400, 991],
    ],
  },
  status: "unresolved",
  statusDetails: {},
  subscriptionDetails: null,
  title: "This is an example Python exception",
  type: "default",
  userCount: 0,
};

const link = { id: "slink_1", projectSlug: "pump-station" };

describe("Sentry mappers", () => {
  it("maps an issue, converting the count and stats buckets to numbers", () => {
    expect(toSentryIssue(link, issue, "24h")).toEqual({
      sentryLinkId: "slink_1",
      sentryProject: "pump-station",
      id: "1",
      shortId: "PUMP-STATION-1",
      title: "This is an example Python exception",
      culprit: "raven.scripts.runner in main",
      level: "error",
      status: "unresolved",
      count: 150,
      userCount: 0,
      permalink: "https://sentry.io/the-interstellar-jurisdiction/pump-station/issues/1/",
      firstSeen: "2018-11-06T21:19:55.000Z",
      lastSeen: "2018-11-06T21:19:55.000Z",
      stats: [473, 914, 991],
    });
  });

  it("yields empty stats when the period is missing", () => {
    expect(toSentryIssue(link, { ...issue, culprit: "" }, "14d")).toMatchObject({ stats: [], culprit: null });
    expect(toSentryIssue(link, { ...issue, stats: undefined }, "24h").stats).toEqual([]);
  });

  it("maps an available project", () => {
    const project = { id: "2", slug: "pump-station", name: "Pump Station", platform: "python", isMember: true };
    expect(toAvailableProject(project)).toEqual({ slug: "pump-station", name: "Pump Station", platform: "python" });
    expect(toAvailableProject({ slug: "x", name: "X", platform: null }).platform).toBeNull();
  });

  it("maps a stored link", () => {
    const createdBy = {
      id: "u1",
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@poyesis.dev",
      avatarUrl: null,
      jobTitle: null,
    };
    expect(
      toSentryLink({
        id: "slink_1",
        projectId: "p1",
        organizationSlug: "acme",
        projectSlug: "pump-station",
        environment: "production",
        name: "Pump Station",
        platform: "python",
        createdAt: new Date("2026-09-24T09:00:00.000Z"),
        createdBy,
      }),
    ).toEqual({
      id: "slink_1",
      projectId: "p1",
      organizationSlug: "acme",
      projectSlug: "pump-station",
      environment: "production",
      name: "Pump Station",
      platform: "python",
      createdAt: "2026-09-24T09:00:00.000Z",
      createdBy,
    });
  });
});
