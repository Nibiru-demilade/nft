'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import dynamic from 'next/dynamic'
import { useState } from 'react'

// Load Cosmos Kit + chain-registry only on the client to avoid SSR 500 and SES intrinsics errors
const CosmosProviders = dynamic(
  () => import('@/components/cosmos-providers').then((m) => m.CosmosProviders),
  { ssr: false, loading: () => null }
)

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <CosmosProviders>{children}</CosmosProviders>
    </QueryClientProvider>
  )
}
