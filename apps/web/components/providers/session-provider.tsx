"use client";

import {
  can,
  type Action,
  type Principal,
  type ResourceAttributes,
  type Subject,
  type UserDetail,
} from "@repo/contracts";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, type ReactNode } from "react";
import { SESSION_EXPIRED_EVENT } from "@/lib/api/client";
import { sessionQuery } from "@/lib/api/session";
import { FullPageLoader } from "@/components/app/full-page-loader";

interface SessionContextValue {
  user: UserDetail;
  principal: Principal;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { data, isError } = useQuery(sessionQuery);

  useEffect(() => {
    const onExpired = () => {
      queryClient.clear();
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, [pathname, queryClient, router]);

  useEffect(() => {
    if (isError) router.replace("/login");
  }, [isError, router]);

  if (!data) return <FullPageLoader />;
  return <SessionContext.Provider value={data}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used inside <SessionProvider>");
  return value;
}

/**
 * ABAC checks in the UI, evaluated with exactly the same policies as the API.
 * The UI uses them to hide affordances; the API remains the authority.
 */
export function useCan() {
  const { principal } = useSession();
  return useCallback(
    (action: Action, subject: Subject, resource?: ResourceAttributes, field?: string) =>
      can(principal, action, subject, resource, field),
    [principal],
  );
}

export function Can({
  action,
  subject,
  resource,
  field,
  children,
  fallback = null,
}: {
  action: Action;
  subject: Subject;
  resource?: ResourceAttributes;
  field?: string;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const check = useCan();
  return check(action, subject, resource, field) ? children : fallback;
}
