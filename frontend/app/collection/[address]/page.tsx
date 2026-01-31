'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { NFTCard } from '@/components/ui/nft-card'
import { Button } from '@/components/ui/button'
import { formatAddress } from '@/lib/utils'
import { 
  Verified, ExternalLink, Twitter, Globe, Share2, 
  Grid, List, Filter, Copy, Check 
} from 'lucide-react'

// Mock collection data
const mockCollection = {
  address: 'nibi1abc123def456ghi789',
  name: 'Cosmic Apes',
  description: 'A collection of 10,000 unique cosmic apes exploring the Nibiru galaxy. Each ape is procedurally generated with over 200 possible traits.',
  image: 'https://picsum.photos/seed/cosmicapes/200',
  banner: 'https://picsum.photos/seed/cosmicapesbanner/1200/400',
  creator: 'nibi1creator123',
  isVerified: true,
  floorPrice: '25.5',
  totalVolume: '12,345',
  itemCount: 10000,
  ownerCount: 5432,
  royalty: '5%',
  socials: {
    twitter: 'https://twitter.com/cosmicapes',
    website: 'https://cosmicapes.io',
    discord: 'https://discord.gg/cosmicapes',
  },
}

// Mock NFTs
const mockNFTs = Array.from({ length: 20 }, (_, i) => ({
  id: String(i + 1),
  name: `Cosmic Ape #${i + 1}`,
  image: `https://picsum.photos/seed/cosmicape${i}/400`,
  collection: 'Cosmic Apes',
  collectionAddress: 'nibi1abc123def456ghi789',
  price: i % 3 === 0 ? undefined : String((Math.random() * 50 + 10).toFixed(2)),
  currency: 'NIBI',
  likes: Math.floor(Math.random() * 100),
}))

export default function CollectionPage() {
  const params = useParams()
  const [activeTab, setActiveTab] = useState<'items' | 'activity'>('items')
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(mockCollection.address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      {/* Banner */}
      <div className="relative h-48 md:h-64 lg:h-80">
        <Image
          src={mockCollection.banner}
          alt={`${mockCollection.name} banner`}
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
      </div>

      <div className="container mx-auto px-4">
        {/* Profile Section */}
        <div className="relative -mt-16 md:-mt-20 mb-8">
          <div className="flex flex-col md:flex-row md:items-end gap-6">
            {/* Avatar */}
            <div className="h-32 w-32 md:h-40 md:w-40 rounded-2xl border-4 border-background overflow-hidden">
              <Image
                src={mockCollection.image}
                alt={mockCollection.name}
                width={160}
                height={160}
                className="object-cover"
              />
            </div>

            {/* Info */}
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-2">
                <h1 className="text-3xl md:text-4xl font-bold">{mockCollection.name}</h1>
                {mockCollection.isVerified && (
                  <Verified className="h-6 w-6 text-primary fill-primary" />
                )}
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  {formatAddress(mockCollection.address)}
                  {copied ? (
                    <Check className="h-3 w-3 text-green-500" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </button>
                <span>Royalty: {mockCollection.royalty}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {mockCollection.socials.twitter && (
                <Button variant="outline" size="icon" asChild>
                  <a href={mockCollection.socials.twitter} target="_blank" rel="noopener noreferrer">
                    <Twitter className="h-4 w-4" />
                  </a>
                </Button>
              )}
              {mockCollection.socials.website && (
                <Button variant="outline" size="icon" asChild>
                  <a href={mockCollection.socials.website} target="_blank" rel="noopener noreferrer">
                    <Globe className="h-4 w-4" />
                  </a>
                </Button>
              )}
              <Button variant="outline" size="icon">
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Description */}
          <p className="mt-4 text-muted-foreground max-w-3xl">{mockCollection.description}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="p-4 rounded-xl bg-card border border-border">
            <p className="text-sm text-muted-foreground">Floor Price</p>
            <p className="text-2xl font-bold">{mockCollection.floorPrice} NIBI</p>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border">
            <p className="text-sm text-muted-foreground">Total Volume</p>
            <p className="text-2xl font-bold">{mockCollection.totalVolume} NIBI</p>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border">
            <p className="text-sm text-muted-foreground">Items</p>
            <p className="text-2xl font-bold">{mockCollection.itemCount.toLocaleString()}</p>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border">
            <p className="text-sm text-muted-foreground">Owners</p>
            <p className="text-2xl font-bold">{mockCollection.ownerCount.toLocaleString()}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-border mb-6">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab('items')}
              className={`pb-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'items'
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Items
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`pb-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'activity'
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Activity
            </button>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'items' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
            {mockNFTs.map((nft) => (
              <NFTCard key={nft.id} {...nft} />
            ))}
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
                    <td className="px-4 py-3 text-sm">Sale</td>
                    <td className="px-4 py-3 text-sm">Cosmic Ape #{i}</td>
                    <td className="px-4 py-3 text-sm font-medium">25.5 NIBI</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">nibi1abc...</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">nibi1def...</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">2 hours ago</td>
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
