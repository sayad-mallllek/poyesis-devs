export interface RepositoryReference {
  owner: string;
  name: string;
}

const OWNER = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
const NAME = /^[A-Za-z0-9._-]{1,100}$/;

/**
 * Accepts `owner/name`, `https://github.com/owner/name(.git)` (any host, for
 * GitHub Enterprise), deep links such as `/tree/main`, `github.com/owner/name`
 * and SSH remotes (`git@github.com:owner/name.git`). Returns `null` otherwise.
 */
export function parseRepositoryReference(input: string): RepositoryReference | null {
  const value = input.trim();
  const ssh = /^[\w.-]+@[\w.-]+:(.+)$/.exec(value);
  let path: string;
  if (ssh) {
    path = ssh[1]!;
  } else if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) {
    try {
      path = new URL(value).pathname;
    } catch {
      return null;
    }
  } else {
    // `github.com/owner/name` or `owner/name`: a first segment containing a dot is a host.
    const segments = value.split("/");
    path = segments[0]?.includes(".") && segments.length > 2 ? segments.slice(1).join("/") : value;
  }

  const [owner, rawName] = path.split("/").filter(Boolean);
  const name = rawName?.replace(/\.git$/i, "");
  if (!owner || !name || !OWNER.test(owner) || !NAME.test(name) || name === "." || name === "..") {
    return null;
  }
  return { owner, name };
}
