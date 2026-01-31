'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useChain } from '@cosmos-kit/react'
import { Button } from '@/components/ui/button'
import { formatAddress } from '@/lib/utils'
import {
  Heart, Share2, ExternalLink, RefreshCw, Eye, Tag,
  Clock, Verified, ArrowUpRight, Copy, Check
} from 'lucide-react'

// Mock NFT data
const mockNFT = {
  tokenId: '1234',
  contract: 'nibi1abc123def456ghi789',
  name: 'Cosmic Ape #1234',
  description: 'A rare cosmic ape with legendary traits. This ape has explored the furthest reaches of the Nibiru galaxy and returned with stories to tell.',
  image: 'https://picsum.photos/seed/cosmicape1234/800',
  collection: {
    name: 'Cosmic Apes',
    address: 'nibi1abc123def456ghi789',
    isVerified: true,
  },
  owner: 'nibi1owner123abc',
  creator: 'nibi1creator123abc',
  attributes: [
    { trait_type: 'Background', value: 'Nebula', rarity: '5%' },
    { trait_type: 'Skin', value: 'Golden', rarity: '2%' },
    { trait_type: 'Eyes', value: 'Laser', rarity: '8%' },
    { trait_type: 'Mouth', value: 'Smile', rarity: '15%' },
    { trait_type: 'Hat', value: 'Crown', rarity: '1%' },
    { trait_type: 'Accessory', value: 'Diamond Chain', rarity: '3%' },
  ],
  price: '35.5',
  lastSale: '28.2',
  views: 1234,
  favorites: 89,
}

const mockActivity = [
  { type: 'Listed', price: '35.5', from: 'nibi1owner123', to: null, time: '2 hours ago' },
  { type: 'Transfer', price: null, from: 'nibi1abc123', to: 'nibi1owner123', time: '1 day ago' },
  { type: 'Sale', price: '28.2', from: 'nibi1abc123', to: 'nibi1def456', time: '3 days ago' },
  { type: 'Listed', price: '30.0', from: 'nibi1abc123', to: null, time: '5 days ago' },
  { type: 'Mint', price: null, from: null, to: 'nibi1abc123', time: '2 weeks ago' },
]

export default function NFTDetailPage() {
  const params = useParams()
  const { isWalletConnected, address } = useChain('nibirutestnet')
  const [activeTab, setActiveTab] = useState<'properties' | 'activity' | 'offers'>('properties')
  const [liked, setLiked] = useState(false)
  const [copied, setCopied] = useState(false)

  const isOwner = address === mockNFT.owner

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left Column - Image */}
        <div className="space-y-4">
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-muted">
            <Image
              src={mockNFT.image}
              alt={mockNFT.name}
              fill
              className="object-cover"
              priority
            />
            {/* Action buttons on image */}
            <div className="absolute top-4 right-4 flex gap-2">
              <button
                onClick={() => setLiked(!liked)}
                className="p-2 rounded-lg bg-black/50 backdrop-blur-sm hover:bg-black/70 transition-colors"
              >
                <Heart className={`h-5 w-5 ${liked ? 'fill-red-500 text-red-500' : 'text-white'}`} />
              </button>
              <button className="p-2 rounded-lg bg-black/50 backdrop-blur-sm hover:bg-black/70 transition-colors">
                <Share2 className="h-5 w-5 text-white" />
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              <span>{mockNFT.views} views</span>
            </div>
            <div className="flex items-center gap-1">
              <Heart className="h-4 w-4" />
              <span>{mockNFT.favorites} favorites</span>
            </div>
          </div>
        </div>

        {/* Right Column - Details */}
        <div className="space-y-6">
          {/* Collection */}
          <Link
            href={`/collection/${mockNFT.collection.address}`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {mockNFT.collection.name}
            {mockNFT.collection.isVerified && (
              <Verified className="h-4 w-4 text-primary fill-primary" />
            )}
          </Link>

          {/* Name */}
          <h1 className="text-3xl md:text-4xl font-bold">{mockNFT.name}</h1>

          {/* Owner */}
          <div className="flex items-center gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Owned by </span>
              <Link href={`/profile/${mockNFT.owner}`} className="text-primary hover:underline">
                {formatAddress(mockNFT.owner)}
              </Link>
            </div>
          </div>

          {/* Price Card */}
          <div className="p-6 rounded-2xl bg-card border border-border space-y-4">
            {mockNFT.price ? (
              <>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Tag className="h-4 w-4" />
                  <span>Current price</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold">{mockNFT.price}</span>
                  <span className="text-xl text-muted-foreground">NIBI</span>
                </div>

                {isOwner ? (
                  <div className="flex gap-3">
                    <Button className="flex-1" variant="outline">
                      Edit Listing
                    </Button>
                    <Button className="flex-1" variant="destructive">
                      Cancel Listing
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <Button className="flex-1" variant="gradient">
                      Buy Now
                    </Button>
                    <Button className="flex-1" variant="outline">
                      Make Offer
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="text-muted-foreground">Not listed for sale</div>
                {isOwner ? (
                  <Button className="w-full" variant="gradient">
                    List for Sale
                  </Button>
                ) : (
                  <Button className="w-full" variant="outline">
                    Make Offer
                  </Button>
                )}
              </>
            )}

            {mockNFT.lastSale && (
              <p className="text-sm text-muted-foreground">
                Last sale: {mockNFT.lastSale} NIBI
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <h3 className="font-semibold mb-2">Description</h3>
            <p className="text-muted-foreground">{mockNFT.description}</p>
          </div>

          {/* Tabs */}
          <div className="border-b border-border">
            <div className="flex gap-6">
              {(['properties', 'activity', 'offers'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-3 text-sm font-medium capitalize border-b-2 transition-colors ${
                    activeTab === tab
                      ? 'border-primary text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'properties' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {mockNFT.attributes.map((attr) => (
                <div
                  key={attr.trait_type}
                  className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-center"
                >
                  <p className="text-xs text-primary font-medium uppercase">{attr.trait_type}</p>
                  <p className="font-semibold mt-1">{attr.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{attr.rarity} have this trait</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="space-y-3">
              {mockActivity.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-xl bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-background">
                      {item.type === 'Sale' && <Tag className="h-4 w-4 text-green-500" />}
                      {item.type === 'Listed' && <Tag className="h-4 w-4 text-primary" />}
                      {item.type === 'Transfer' && <ArrowUpRight className="h-4 w-4" />}
                      {item.type === 'Mint' && <RefreshCw className="h-4 w-4 text-blue-500" />}
                    </div>
                    <div>
                      <p className="font-medium">{item.type}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.from && `From ${formatAddress(item.from)}`}
                        {item.to && ` To ${formatAddress(item.to)}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {item.price && <p className="font-medium">{item.price} NIBI</p>}
                    <p className="text-xs text-muted-foreground">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'offers' && (
            <div className="text-center py-8 text-muted-foreground">
              No offers yet
            </div>
          )}

          {/* Details */}
          <div className="p-4 rounded-xl bg-card border border-border space-y-3">
            <h3 className="font-semibold">Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Contract Address</span>
                <button
                  onClick={() => handleCopy(mockNFT.contract)}
                  className="flex items-center gap-1 hover:text-primary transition-colors"
                >
                  {formatAddress(mockNFT.contract)}
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Token ID</span>
                <span>{mockNFT.tokenId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Token Standard</span>
                <span>CW721</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Chain</span>
                <span>Nibiru</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
