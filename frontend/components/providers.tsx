'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import dynamic from 'next/dynamic'
import { useState } from 'react'
import { MockWalletProvider } from '@/lib/mockWalletContext'

const useMockContracts = process.env.NEXT_PUBLIC_USE_MOCK_CONTRACTS === 'true'

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
      {useMockContracts ? (
        <MockWalletProvider>{children}</MockWalletProvider>
      ) : (
        <CosmosProviders>{children}</CosmosProviders>
      )}
    </QueryClientProvider>
  )
}
