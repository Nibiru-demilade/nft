'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { formatAddress } from '@/lib/utils'
import { 
  Tag, ArrowUpRight, RefreshCw, Gavel, Heart, 
  Filter, ExternalLink 
} from 'lucide-react'

// Mock activity data
const mockActivity = Array.from({ length: 30 }, (_, i) => ({
  id: String(i + 1),
  type: ['sale', 'listing', 'transfer', 'mint', 'offer', 'bid'][i % 6] as string,
  nft: {
    tokenId: String(Math.floor(Math.random() * 10000)),
    name: `NFT #${Math.floor(Math.random() * 10000)}`,
    image: `https://picsum.photos/seed/activity${i}/100`,
    collection: {
      name: ['Cosmic Apes', 'Nibiru Punks', 'Abstract Dreams'][i % 3],
      address: ['nibi1abc', 'nibi1def', 'nibi1ghi'][i % 3],
    },
  },
  price: (Math.random() * 50 + 1).toFixed(2),
  from: `nibi1from${i}abc123`,
  to: `nibi1to${i}def456`,
  timestamp: new Date(Date.now() - Math.random() * 86400000 * 7),
  txHash: `0x${Math.random().toString(16).slice(2, 10)}`,
}))

const activityTypes = [
  { id: 'all', label: 'All' },
  { id: 'sale', label: 'Sales' },
  { id: 'listing', label: 'Listings' },
  { id: 'offer', label: 'Offers' },
  { id: 'transfer', label: 'Transfers' },
]

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'sale':
      return <Tag className="h-4 w-4 text-green-500" />
    case 'listing':
      return <Tag className="h-4 w-4 text-primary" />
    case 'transfer':
      return <ArrowUpRight className="h-4 w-4 text-blue-500" />
    case 'mint':
      return <RefreshCw className="h-4 w-4 text-purple-500" />
    case 'offer':
      return <Heart className="h-4 w-4 text-pink-500" />
    case 'bid':
      return <Gavel className="h-4 w-4 text-orange-500" />
    default:
      return <Tag className="h-4 w-4" />
  }
}

const formatTimeAgo = (date: Date) => {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function ActivityPage() {
  const [selectedType, setSelectedType] = useState('all')

  const filteredActivity =
    selectedType === 'all'
      ? mockActivity
      : mockActivity.filter((a) => a.type === selectedType)

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold">Activity</h1>
        <p className="text-muted-foreground mt-2">
          Real-time marketplace activity across all collections
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {activityTypes.map((type) => (
          <Button
            key={type.id}
            variant={selectedType === type.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedType(type.id)}
          >
            {type.label}
          </Button>
        ))}
      </div>

      {/* Activity Feed */}
      <div className="space-y-2">
        {filteredActivity.map((activity) => (
          <div
            key={activity.id}
            className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors"
          >
            {/* Icon */}
            <div className="p-2 rounded-lg bg-muted">
              {getActivityIcon(activity.type)}
            </div>

            {/* NFT Info */}
            <Link
              href={`/nft/${activity.nft.collection.address}/${activity.nft.tokenId}`}
              className="flex items-center gap-3 flex-1 min-w-0"
            >
              <Image
                src={activity.nft.image}
                alt={activity.nft.name}
                width={48}
                height={48}
                className="rounded-lg object-cover"
              />
              <div className="min-w-0">
                <p className="font-medium truncate">{activity.nft.name}</p>
                <p className="text-sm text-muted-foreground truncate">
                  {activity.nft.collection.name}
                </p>
              </div>
            </Link>

            {/* Event Type */}
            <div className="hidden sm:block text-sm">
              <span className="capitalize font-medium">{activity.type}</span>
            </div>

            {/* Price */}
            <div className="text-right min-w-[80px]">
              {activity.price && (
                <>
                  <p className="font-semibold">{activity.price}</p>
                  <p className="text-xs text-muted-foreground">NIBI</p>
                </>
              )}
            </div>

            {/* From/To */}
            <div className="hidden md:block text-sm text-muted-foreground min-w-[120px]">
              {activity.from && (
                <Link
                  href={`/profile/${activity.from}`}
                  className="hover:text-foreground"
                >
                  {formatAddress(activity.from)}
                </Link>
              )}
            </div>

            <div className="hidden md:block text-sm text-muted-foreground min-w-[120px]">
              {activity.to && (
                <Link
                  href={`/profile/${activity.to}`}
                  className="hover:text-foreground"
                >
                  {formatAddress(activity.to)}
                </Link>
              )}
            </div>

            {/* Time */}
            <div className="text-sm text-muted-foreground min-w-[70px] text-right">
              {formatTimeAgo(activity.timestamp)}
            </div>

            {/* External Link */}
            <a
              href={`https://explorer.nibiru.fi/tx/${activity.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </a>
          </div>
        ))}
      </div>

      {/* Load More */}
      <div className="mt-8 text-center">
        <Button variant="outline" size="lg">
          Load More Activity
        </Button>
      </div>
    </div>
  )
}
