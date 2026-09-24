import type { ChatPageContext } from "@repo/contracts";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

const ENTITY_ROUTES = [
  { pattern: /^\/projects\/([^/]+)/, key: "projectId" },
  { pattern: /^\/people\/([^/]+)/, key: "userId" },
  { pattern: /^\/clients\/([^/]+)/, key: "clientId" },
] as const;

const RESERVED = new Set(["new"]);

/** What the user is looking at, so the assistant can resolve "this project". */
export function usePageContext(): ChatPageContext {
  const pathname = usePathname();
  return useMemo(() => {
    const context: ChatPageContext = { pathname };
    for (const { pattern, key } of ENTITY_ROUTES) {
      const id = pathname.match(pattern)?.[1];
      if (id && !RESERVED.has(id)) context[key] = id;
    }
    return context;
  }, [pathname]);
}
