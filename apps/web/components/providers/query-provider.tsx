"use client";

import { MutationCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { ApiError, errorMessage } from "@/lib/api/client";

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: (count, error) =>
          count < 2 && !(error instanceof ApiError && error.status >= 400 && error.status < 500),
      },
    },
    mutationCache: new MutationCache({
      // Mutations report failures centrally unless they opt out with `meta.silent`.
      onError: (error, _vars, _ctx, mutation) => {
        if (mutation.meta?.silent) return;
        if (error instanceof ApiError && error.status === 400 && Object.keys(error.issues).length) return;
        toast.error(errorMessage(error));
      },
    }),
  });
}

declare module "@tanstack/react-query" {
  interface Register {
    mutationMeta: { silent?: boolean };
  }
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(createQueryClient);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
