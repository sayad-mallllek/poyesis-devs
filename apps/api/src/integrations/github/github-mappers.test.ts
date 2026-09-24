import { describe, expect, it } from "vitest";
import {
  githubWebUrl,
  newestFirst,
  toGithubDeployment,
  toGithubPullRequest,
  toGithubRelease,
  toGithubWorkflowRun,
  toRepositoryLink,
  toRepositoryOverview,
} from "./github-mappers.js";

// Trimmed from the GitHub REST v3 documentation examples (extra fields kept on purpose).
const octocat = {
  login: "octocat",
  id: 1,
  node_id: "MDQ6VXNlcjE=",
  avatar_url: "https://github.com/images/error/octocat_happy.gif",
  gravatar_id: "",
  url: "https://api.github.com/users/octocat",
  html_url: "https://github.com/octocat",
  type: "User",
  site_admin: false,
};

const pullRequest = {
  url: "https://api.github.com/repos/octocat/Hello-World/pulls/1347",
  id: 1,
  html_url: "https://github.com/octocat/Hello-World/pull/1347",
  number: 1347,
  state: "closed",
  locked: false,
  title: "Amazing new feature",
  user: octocat,
  body: "Please pull these awesome changes in!",
  labels: [
    { id: 208045946, node_id: "MDU6TGFiZWwyMDgwNDU5NDY=", url: "", name: "bug", description: "Something isn't working", color: "f29513", default: true },
  ],
  created_at: "2011-01-26T19:01:12Z",
  updated_at: "2011-01-26T19:01:12Z",
  closed_at: "2011-01-26T19:01:12Z",
  merged_at: "2011-01-26T19:01:12Z",
  merge_commit_sha: "e5bd3914e2e596debea16f433f57875b5b90bcd6",
  requested_reviewers: [{ ...octocat, login: "other_user" }],
  requested_teams: [{ id: 1, name: "Justice League", slug: "justice-league" }],
  head: { label: "octocat:new-topic", ref: "new-topic", sha: "6dcb09b5b57875f334f61aebed695e2e4193db5e" },
  base: { label: "octocat:master", ref: "master", sha: "6dcb09b5b57875f334f61aebed695e2e4193db5e" },
  author_association: "OWNER",
  draft: false,
};

const workflowRun = {
  id: 30433642,
  name: "Build",
  node_id: "MDEyOldvcmtmbG93IFJ1bjI2OTI4OQ==",
  head_branch: "master",
  head_sha: "acb5820ced9479c074f688cc328bf03f341a511d",
  path: ".github/workflows/build.yml@main",
  display_title: "Update README.md",
  run_number: 562,
  event: "push",
  status: "completed",
  conclusion: "success",
  workflow_id: 159038,
  html_url: "https://github.com/octo-org/octo-repo/actions/runs/30433642",
  created_at: "2020-01-22T19:33:08Z",
  updated_at: "2020-01-22T19:35:38Z",
  run_started_at: "2020-01-22T19:33:08Z",
  actor: octocat,
  triggering_actor: { ...octocat, login: "hubot" },
  run_attempt: 1,
};

const deployment = {
  url: "https://api.github.com/repos/octocat/example/deployments/1",
  id: 1,
  node_id: "MDEwOkRlcGxveW1lbnQx",
  sha: "a84d88e7554fc1fa21bcbc4efae3c782a70d2b9d",
  ref: "topic-branch",
  task: "deploy",
  payload: {},
  original_environment: "staging",
  environment: "production",
  description: "Deploy request from hubot",
  creator: octocat,
  created_at: "2012-07-20T01:19:13Z",
  updated_at: "2012-07-20T01:19:13Z",
  transient_environment: false,
  production_environment: true,
};

const deploymentStatus = {
  id: 1,
  state: "success",
  creator: octocat,
  description: "Deployment finished successfully.",
  environment: "production",
  target_url: "https://example.com/deployment/42/output",
  environment_url: "https://prod.example.com",
  created_at: "2012-07-20T01:19:13Z",
};

const release = {
  url: "https://api.github.com/repos/octocat/Hello-World/releases/1",
  html_url: "https://github.com/octocat/Hello-World/releases/v1.0.0",
  id: 1,
  tag_name: "v1.0.0",
  target_commitish: "master",
  name: "v1.0.0",
  body: "Description of the release",
  draft: false,
  prerelease: false,
  created_at: "2013-02-27T19:35:32Z",
  published_at: "2013-02-27T19:35:32Z",
  author: octocat,
  assets: [],
};

const linkRow = {
  id: "link_1",
  projectId: "proj_1",
  owner: "octocat",
  name: "Hello-World",
  defaultBranch: "main",
  isPrivate: false,
  createdAt: new Date("2026-09-01T08:00:00.000Z"),
};

describe("githubWebUrl", () => {
  it("maps the public API to github.com", () => {
    expect(githubWebUrl("https://api.github.com")).toBe("https://github.com");
  });
  it("strips the Enterprise API prefix", () => {
    expect(githubWebUrl("https://ghe.example.com/api/v3")).toBe("https://ghe.example.com");
    expect(githubWebUrl("https://ghe.example.com/api/v3/")).toBe("https://ghe.example.com");
  });
});

describe("GitHub mappers", () => {
  it("maps a repository link", () => {
    expect(toRepositoryLink(linkRow, "https://github.com")).toEqual({
      id: "link_1",
      projectId: "proj_1",
      owner: "octocat",
      name: "Hello-World",
      fullName: "octocat/Hello-World",
      url: "https://github.com/octocat/Hello-World",
      defaultBranch: "main",
      isPrivate: false,
      createdAt: "2026-09-01T08:00:00.000Z",
    });
  });

  it("maps repository metadata or a per-repository error", () => {
    const link = toRepositoryLink(linkRow, "https://github.com");
    const repo = { stargazers_count: 80, open_issues_count: 3, pushed_at: "2011-01-26T19:06:43Z", language: null, forks: 9 };
    expect(toRepositoryOverview(link, repo, null)).toMatchObject({
      stars: 80,
      openIssues: 3,
      pushedAt: "2011-01-26T19:06:43.000Z",
      language: null,
      error: null,
    });
    expect(toRepositoryOverview(link, null, "Not found")).toMatchObject({ stars: null, pushedAt: null, error: "Not found" });
  });

  it("maps a pull request with reviewers, labels and merge state", () => {
    expect(toGithubPullRequest("octocat/Hello-World", pullRequest)).toEqual({
      repository: "octocat/Hello-World",
      number: 1347,
      title: "Amazing new feature",
      url: "https://github.com/octocat/Hello-World/pull/1347",
      state: "closed",
      draft: false,
      merged: true,
      author: {
        login: "octocat",
        avatarUrl: "https://github.com/images/error/octocat_happy.gif",
        url: "https://github.com/octocat",
      },
      headRef: "new-topic",
      baseRef: "master",
      labels: [{ name: "bug", color: "f29513" }],
      reviewers: ["other_user", "justice-league"],
      createdAt: "2011-01-26T19:01:12.000Z",
      updatedAt: "2011-01-26T19:01:12.000Z",
      mergedAt: "2011-01-26T19:01:12.000Z",
      closedAt: "2011-01-26T19:01:12.000Z",
    });
  });

  it("treats an open pull request without merge timestamp as unmerged", () => {
    const open = { ...pullRequest, state: "open", merged_at: null, closed_at: null, user: null, requested_teams: undefined };
    expect(toGithubPullRequest("r", open)).toMatchObject({
      state: "open",
      merged: false,
      mergedAt: null,
      author: null,
      reviewers: ["other_user"],
    });
  });

  it("maps a completed workflow run with its duration", () => {
    expect(toGithubWorkflowRun("octo-org/octo-repo", workflowRun)).toEqual({
      repository: "octo-org/octo-repo",
      id: 30433642,
      name: "Build",
      displayTitle: "Update README.md",
      url: "https://github.com/octo-org/octo-repo/actions/runs/30433642",
      event: "push",
      branch: "master",
      status: "completed",
      conclusion: "success",
      actor: { login: "hubot", avatarUrl: octocat.avatar_url, url: octocat.html_url },
      runNumber: 562,
      durationSeconds: 150,
      createdAt: "2020-01-22T19:33:08.000Z",
      updatedAt: "2020-01-22T19:35:38.000Z",
    });
  });

  it("has no duration while a run is in progress", () => {
    const running = { ...workflowRun, status: "in_progress", conclusion: null };
    expect(toGithubWorkflowRun("r", running).durationSeconds).toBeNull();
  });

  it("maps a deployment with its latest status", () => {
    expect(toGithubDeployment("octocat/example", deployment, deploymentStatus)).toEqual({
      repository: "octocat/example",
      id: 1,
      environment: "production",
      ref: "topic-branch",
      sha: "a84d88e7554fc1fa21bcbc4efae3c782a70d2b9d",
      description: "Deploy request from hubot",
      creator: { login: "octocat", avatarUrl: octocat.avatar_url, url: octocat.html_url },
      state: "success",
      environmentUrl: "https://prod.example.com",
      createdAt: "2012-07-20T01:19:13.000Z",
      updatedAt: "2012-07-20T01:19:13.000Z",
    });
  });

  it("maps a deployment without statuses", () => {
    const result = toGithubDeployment("r", { ...deployment, description: "" }, undefined);
    expect(result).toMatchObject({ state: null, environmentUrl: null, description: null });
  });

  it("maps releases, including drafts", () => {
    expect(toGithubRelease("octocat/Hello-World", release)).toEqual({
      repository: "octocat/Hello-World",
      id: 1,
      name: "v1.0.0",
      tagName: "v1.0.0",
      url: "https://github.com/octocat/Hello-World/releases/v1.0.0",
      draft: false,
      prerelease: false,
      author: { login: "octocat", avatarUrl: octocat.avatar_url, url: octocat.html_url },
      publishedAt: "2013-02-27T19:35:32.000Z",
    });
    const draft = toGithubRelease("r", { ...release, draft: true, name: "", published_at: null });
    expect(draft).toMatchObject({ draft: true, name: null, publishedAt: null });
  });

  it("sorts newest first with nulls last", () => {
    const items = [{ at: "2026-01-01T00:00:00.000Z" }, { at: null }, { at: "2026-03-01T00:00:00.000Z" }];
    expect(items.sort(newestFirst((i) => i.at)).map((i) => i.at)).toEqual([
      "2026-03-01T00:00:00.000Z",
      "2026-01-01T00:00:00.000Z",
      null,
    ]);
  });
});
