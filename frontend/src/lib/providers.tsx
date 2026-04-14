"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { useInitFilters } from "@/lib/hooks/useInitFilters";

function InitFilters() {
  useInitFilters();
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,
            gcTime: 30 * 60 * 1000,
            retry: 2,
            retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
          },
        },
      })
  );
  return (
    <QueryClientProvider client={queryClient}>
      <InitFilters />
      {children}
    </QueryClientProvider>
  );
}
