'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ChainProvider } from '@cosmos-kit/react'
import { wallets as keplrWallets } from '@cosmos-kit/keplr'
import { wallets as leapWallets } from '@cosmos-kit/leap'
import { chains, assets } from 'chain-registry'
import { useState } from 'react'

// Nibiru chain config (testnet)
const nibiruTestnet = {
  chain_name: 'nibirutestnet',
  status: 'live',
  network_type: 'testnet',
  pretty_name: 'Nibiru Testnet',
  chain_id: 'nibiru-testnet-1',
  bech32_prefix: 'nibi',
  daemon_name: 'nibid',
  node_home: '$HOME/.nibid',
  slip44: 118,
  fees: {
    fee_tokens: [
      {
        denom: 'unibi',
        fixed_min_gas_price: 0.025,
        low_gas_price: 0.025,
        average_gas_price: 0.05,
        high_gas_price: 0.1,
      },
    ],
  },
  staking: {
    staking_tokens: [{ denom: 'unibi' }],
  },
  apis: {
    rpc: [{ address: 'https://rpc.testnet.nibiru.fi', provider: 'Nibiru' }],
    rest: [{ address: 'https://lcd.testnet.nibiru.fi', provider: 'Nibiru' }],
  },
}

const nibiruAssets = {
  chain_name: 'nibirutestnet',
  assets: [
    {
      description: 'The native token of Nibiru Chain',
      denom_units: [
        { denom: 'unibi', exponent: 0 },
        { denom: 'nibi', exponent: 6 },
      ],
      base: 'unibi',
      name: 'Nibiru',
      display: 'nibi',
      symbol: 'NIBI',
    },
  ],
}

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
      <ChainProvider
        chains={[...chains, nibiruTestnet as any]}
        assetLists={[...assets, nibiruAssets as any]}
        wallets={[...keplrWallets, ...leapWallets]}
        walletConnectOptions={{
          signClient: {
            projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '',
          },
        }}
        signerOptions={{
          preferredSignType: () => 'direct',
        }}
        endpointOptions={{
          endpoints: {
            nibirutestnet: {
              rpc: ['https://rpc.testnet.nibiru.fi'],
              rest: ['https://lcd.testnet.nibiru.fi'],
            },
          },
        }}
      >
        {children}
      </ChainProvider>
    </QueryClientProvider>
  )
}
