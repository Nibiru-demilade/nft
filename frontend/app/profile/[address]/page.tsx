'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useChain } from '@cosmos-kit/react'
import { NFTCard } from '@/components/ui/nft-card'
import { Button } from '@/components/ui/button'
import { formatAddress } from '@/lib/utils'
import { Copy, Check, Settings, Share2, ExternalLink } from 'lucide-react'

// Mock user data
const mockUser = {
  address: 'nibi1abc123def456ghi789jkl012mno345',
  username: 'CryptoCollector',
  bio: 'Passionate NFT collector and digital art enthusiast. Building on Nibiru Chain.',
  avatar: 'https://picsum.photos/seed/avatar1/200',
  banner: 'https://picsum.photos/seed/userbanner/1200/400',
  joinedAt: 'January 2024',
  stats: {
    collected: 42,
    created: 12,
    favorites: 156,
    volumeTraded: '234.5',
  },
  socials: {
    twitter: 'https://twitter.com/collector',
    website: 'https://collector.io',
  },
}

// Mock NFTs
const mockOwnedNFTs = Array.from({ length: 12 }, (_, i) => ({
  id: String(i + 1),
  name: `Collected NFT #${i + 1}`,
  image: `https://picsum.photos/seed/owned${i}/400`,
  collection: ['Cosmic Apes', 'Nibiru Punks', 'Abstract Dreams'][i % 3],
  collectionAddress: ['nibi1abc123', 'nibi1def456', 'nibi1ghi789'][i % 3],
  price: i % 2 === 0 ? String((Math.random() * 50 + 5).toFixed(2)) : undefined,
  currency: 'NIBI',
  likes: Math.floor(Math.random() * 100),
}))

const mockCreatedNFTs = Array.from({ length: 6 }, (_, i) => ({
  id: String(i + 100),
  name: `Created NFT #${i + 1}`,
  image: `https://picsum.photos/seed/created${i}/400`,
  collection: 'My Collection',
  collectionAddress: 'nibi1mycollection',
  price: String((Math.random() * 30 + 10).toFixed(2)),
  currency: 'NIBI',
  likes: Math.floor(Math.random() * 50),
}))

type Tab = 'collected' | 'created' | 'favorited' | 'activity'

export default function ProfilePage() {
  const params = useParams()
  const { address: connectedAddress } = useChain('nibirutestnet')
  const [activeTab, setActiveTab] = useState<Tab>('collected')
  const [copied, setCopied] = useState(false)

  const isOwnProfile = connectedAddress === params.address

  const handleCopy = async () => {
    await navigator.clipboard.writeText(mockUser.address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'collected', label: 'Collected', count: mockUser.stats.collected },
    { id: 'created', label: 'Created', count: mockUser.stats.created },
    { id: 'favorited', label: 'Favorited', count: mockUser.stats.favorites },
    { id: 'activity', label: 'Activity' },
  ]

  return (
    <div>
      {/* Banner */}
      <div className="relative h-48 md:h-64 lg:h-72">
        <Image
          src={mockUser.banner}
          alt="Profile banner"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
      </div>

      <div className="container mx-auto px-4">
        {/* Profile Section */}
        <div className="relative -mt-16 md:-mt-20 mb-8">
          <div className="flex flex-col md:flex-row md:items-end gap-6">
            {/* Avatar */}
            <div className="relative">
              <div className="h-32 w-32 md:h-40 md:w-40 rounded-2xl border-4 border-background overflow-hidden">
                <Image
                  src={mockUser.avatar}
                  alt={mockUser.username}
                  width={160}
                  height={160}
                  className="object-cover"
                />
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 space-y-3">
              <h1 className="text-3xl md:text-4xl font-bold">{mockUser.username}</h1>

              <div className="flex items-center gap-4">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {formatAddress(mockUser.address)}
                  {copied ? (
                    <Check className="h-3 w-3 text-green-500" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </button>
                <span className="text-sm text-muted-foreground">
                  Joined {mockUser.joinedAt}
                </span>
              </div>

              {mockUser.bio && (
                <p className="text-muted-foreground max-w-2xl">{mockUser.bio}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {mockUser.socials.twitter && (
                <Button variant="outline" size="sm" asChild>
                  <a href={mockUser.socials.twitter} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Twitter
                  </a>
                </Button>
              )}
              <Button variant="outline" size="icon">
                <Share2 className="h-4 w-4" />
              </Button>
              {isOwnProfile && (
                <Button variant="outline" size="icon" asChild>
                  <Link href="/settings">
                    <Settings className="h-4 w-4" />
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="p-4 rounded-xl bg-card border border-border text-center">
            <p className="text-2xl font-bold">{mockUser.stats.collected}</p>
            <p className="text-sm text-muted-foreground">Collected</p>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border text-center">
            <p className="text-2xl font-bold">{mockUser.stats.created}</p>
            <p className="text-sm text-muted-foreground">Created</p>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border text-center">
            <p className="text-2xl font-bold">{mockUser.stats.favorites}</p>
            <p className="text-sm text-muted-foreground">Favorited</p>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border text-center">
            <p className="text-2xl font-bold">{mockUser.stats.volumeTraded}</p>
            <p className="text-sm text-muted-foreground">NIBI Volume</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-border mb-6">
          <div className="flex gap-6 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span className="ml-2 px-2 py-0.5 rounded-full bg-muted text-xs">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'collected' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
            {mockOwnedNFTs.map((nft) => (
              <NFTCard key={`${nft.collectionAddress}-${nft.id}`} {...nft} />
            ))}
          </div>
        )}

        {activeTab === 'created' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
            {mockCreatedNFTs.map((nft) => (
              <NFTCard key={`${nft.collectionAddress}-${nft.id}`} {...nft} />
            ))}
          </div>
        )}

        {activeTab === 'favorited' && (
          <div className="text-center py-12 text-muted-foreground">
            <p>No favorited items yet</p>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium">Event</th>
                  <th className="text-left px-4 py-3 text-sm font-medium">Item</th>
                  <th className="text-left px-4 py-3 text-sm font-medium">Price</th>
                  <th className="text-left px-4 py-3 text-sm font-medium">From</th>
                  <th className="text-left px-4 py-3 text-sm font-medium">To</th>
                  <th className="text-left px-4 py-3 text-sm font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} className="border-t border-border hover:bg-muted/50">
                    <td className="px-4 py-3 text-sm">{i % 2 === 0 ? 'Purchase' : 'Sale'}</td>
                    <td className="px-4 py-3 text-sm">NFT #{i}</td>
                    <td className="px-4 py-3 text-sm font-medium">{(10 + i * 5).toFixed(2)} NIBI</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {i % 2 === 0 ? 'nibi1seller...' : formatAddress(mockUser.address)}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {i % 2 === 0 ? formatAddress(mockUser.address) : 'nibi1buyer...'}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{i} days ago</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="h-16" />
      </div>
    </div>
  )
}
