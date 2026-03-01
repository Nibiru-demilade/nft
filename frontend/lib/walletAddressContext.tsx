'use client'

import React, { createContext, useContext } from 'react'

export type WalletAddressValue = {
  address: string | null
  isConnected: boolean
  openView: () => void
}

const WalletAddressContext = createContext<WalletAddressValue | null>(null)

export function useWalletAddress(): WalletAddressValue {
  const ctx = useContext(WalletAddressContext)
  return ctx ?? { address: null, isConnected: false, openView: () => {} }
}

export function WalletAddressProvider({
  value,
  children,
}: {
  value: WalletAddressValue
  children: React.ReactNode
}) {
  return (
    <WalletAddressContext.Provider value={value}>
      {children}
    </WalletAddressContext.Provider>
  )
}
