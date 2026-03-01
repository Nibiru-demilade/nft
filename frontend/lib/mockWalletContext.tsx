'use client'

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { WalletAddressProvider } from './walletAddressContext'

const MOCK_ADDRESS_KEY = 'nibiru_mock_wallet_address'

type MockWalletContextType = {
  address: string | null
  isConnected: boolean
  connect: (addressOrUsername: string) => void
  disconnect: () => void
  openView: () => void
}

const MockWalletContext = createContext<MockWalletContextType | null>(null)

export function MockWalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = localStorage.getItem(MOCK_ADDRESS_KEY)
    if (stored) setAddress(stored)
  }, [])

  const connect = useCallback((addressOrUsername: string) => {
    const trimmed = addressOrUsername.trim()
    if (!trimmed) return
    setAddress(trimmed)
    if (typeof window !== 'undefined') localStorage.setItem(MOCK_ADDRESS_KEY, trimmed)
    setShowPrompt(false)
  }, [])

  const disconnect = useCallback(() => {
    setAddress(null)
    if (typeof window !== 'undefined') localStorage.removeItem(MOCK_ADDRESS_KEY)
  }, [])

  const openView = useCallback(() => {
    setShowPrompt(true)
  }, [])

  const value: MockWalletContextType = {
    address,
    isConnected: !!address,
    connect,
    disconnect,
    openView,
  }

  return (
    <MockWalletContext.Provider value={value}>
      <WalletAddressProvider value={{ address, isConnected: !!address, openView }}>
        {children}
      </WalletAddressProvider>
      {showPrompt && (
        <MockWalletPrompt
          onConnect={connect}
          onClose={() => setShowPrompt(false)}
        />
      )}
    </MockWalletContext.Provider>
  )
}

function MockWalletPrompt({
  onConnect,
  onClose,
}: {
  onConnect: (address: string) => void
  onClose: () => void
}) {
  const [input, setInput] = useState('')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-card border border-border p-6 shadow-xl">
        <h3 className="text-lg font-semibold mb-2">Mock wallet</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Enter an address or username to use as your wallet (no Keplr needed).
        </p>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. nibi1abc... or myusername"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => { onConnect(input); }}
            className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Connect
          </button>
          <button
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

export function useMockWallet(): MockWalletContextType | null {
  return useContext(MockWalletContext)
}
