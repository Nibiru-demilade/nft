'use client'

import { useChain } from '@cosmos-kit/react'
import { Button } from '@/components/ui/button'
import { formatAddress } from '@/lib/utils'
import { Wallet, ChevronDown, LogOut, User, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import Link from 'next/link'
import { useMockWallet } from '@/lib/mockWalletContext'

const useMockContracts = process.env.NEXT_PUBLIC_USE_MOCK_CONTRACTS === 'true'

function WalletButtonMock() {
  const { address, disconnect, isConnected, openView } = useMockWallet()!
  const [showDropdown, setShowDropdown] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (address) {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (!isConnected) {
    return (
      <Button onClick={() => openView()} variant="gradient" className="space-x-2">
        <Wallet className="h-4 w-4" />
        <span>Connect Wallet</span>
      </Button>
    )
  }

  return (
    <div className="relative">
      <Button variant="outline" onClick={() => setShowDropdown(!showDropdown)} className="space-x-2">
        <div className="h-5 w-5 rounded-full gradient-bg" />
        <span>{formatAddress(address)}</span>
        <ChevronDown className="h-4 w-4" />
      </Button>
      {showDropdown && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
          <div className="absolute right-0 mt-2 w-56 rounded-lg bg-card border border-border shadow-lg z-50 py-2">
            <div className="px-4 py-2 border-b border-border">
              <p className="text-xs text-muted-foreground">Connected as</p>
              <button onClick={handleCopy} className="flex items-center space-x-2 text-sm font-mono hover:text-primary transition-colors">
                <span>{formatAddress(address, 6)}</span>
                {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
              </button>
            </div>
            <div className="py-1">
              <Link href={`/profile/${address}`} className="flex items-center space-x-3 px-4 py-2 text-sm hover:bg-accent transition-colors" onClick={() => setShowDropdown(false)}>
                <User className="h-4 w-4" />
                <span>My Profile</span>
              </Link>
            </div>
            <div className="border-t border-border pt-1">
              <button onClick={() => { disconnect(); setShowDropdown(false); }} className="flex items-center space-x-3 px-4 py-2 text-sm text-red-500 hover:bg-accent w-full transition-colors">
                <LogOut className="h-4 w-4" />
                <span>Disconnect</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function WalletButtonReal() {
  const { address, connect, disconnect, isWalletConnected, openView } = useChain('nibirutestnet')
  const [showDropdown, setShowDropdown] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (address) {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (!isWalletConnected) {
    return (
      <Button
        onClick={() => openView()}
        variant="gradient"
        className="space-x-2"
      >
        <Wallet className="h-4 w-4" />
        <span>Connect Wallet</span>
      </Button>
    )
  }

  return (
    <div className="relative">
      <Button
        variant="outline"
        onClick={() => setShowDropdown(!showDropdown)}
        className="space-x-2"
      >
        <div className="h-5 w-5 rounded-full gradient-bg" />
        <span>{formatAddress(address || '')}</span>
        <ChevronDown className="h-4 w-4" />
      </Button>

      {showDropdown && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDropdown(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-56 rounded-lg bg-card border border-border shadow-lg z-50 py-2">
            {/* Address */}
            <div className="px-4 py-2 border-b border-border">
              <p className="text-xs text-muted-foreground">Connected as</p>
              <button
                onClick={handleCopy}
                className="flex items-center space-x-2 text-sm font-mono hover:text-primary transition-colors"
              >
                <span>{formatAddress(address || '', 6)}</span>
                {copied ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </button>
            </div>

            {/* Menu Items */}
            <div className="py-1">
              <Link
                href={`/profile/${address}`}
                className="flex items-center space-x-3 px-4 py-2 text-sm hover:bg-accent transition-colors"
                onClick={() => setShowDropdown(false)}
              >
                <User className="h-4 w-4" />
                <span>My Profile</span>
              </Link>
            </div>

            {/* Disconnect */}
            <div className="border-t border-border pt-1">
              <button
                onClick={() => {
                  disconnect()
                  setShowDropdown(false)
                }}
                className="flex items-center space-x-3 px-4 py-2 text-sm text-red-500 hover:bg-accent w-full transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Disconnect</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export function WalletButton() {
  if (useMockContracts) return <WalletButtonMock />
  return <WalletButtonReal />
}
