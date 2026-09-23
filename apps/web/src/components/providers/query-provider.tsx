"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ComponentProps, type ReactNode } from "react";

export function QueryProvider({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            staleTime: 30_000,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children as ComponentProps<typeof QueryClientProvider>["children"]}
    </QueryClientProvider>
  );
}
