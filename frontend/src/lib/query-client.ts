import { QueryClient } from "@tanstack/react-query";

import { DEFAULT_QUERY_STALE_TIME } from "./constants";

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => {
          if (error instanceof Error && "status" in error && error.status === 401) return false;
          return failureCount < 1;
        },
        staleTime: DEFAULT_QUERY_STALE_TIME,
        refetchOnWindowFocus: false,
      },
      mutations: { retry: false },
    },
  });
}
