'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { formatAddress } from '@/lib/utils'
import { getActivity, type Activity } from '@/lib/api'
import {
  Tag, ArrowUpRight, RefreshCw, Gavel, Heart,
  ExternalLink
} from 'lucide-react'

const activityTypes = [
  { id: 'all', label: 'All', filter: undefined },
  { id: 'SALE', label: 'Sales', filter: 'SALE' },
  { id: 'LIST', label: 'Listings', filter: 'LIST' },
  { id: 'OFFER', label: 'Offers', filter: 'OFFER' },
  { id: 'TRANSFER', label: 'Transfers', filter: 'TRANSFER' },
  { id: 'MINT', label: 'Mints', filter: 'MINT' },
]

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'SALE':
      return <Tag className="h-4 w-4 text-green-500" />
    case 'LIST':
    case 'UNLIST':
      return <Tag className="h-4 w-4 text-primary" />
    case 'TRANSFER':
      return <ArrowUpRight className="h-4 w-4 text-blue-500" />
    case 'MINT':
      return <RefreshCw className="h-4 w-4 text-purple-500" />
    case 'OFFER':
    case 'OFFER_ACCEPTED':
      return <Heart className="h-4 w-4 text-pink-500" />
    case 'AUCTION_BID':
    case 'AUCTION_SETTLED':
      return <Gavel className="h-4 w-4 text-orange-500" />
    default:
      return <Tag className="h-4 w-4" />
  }
}

const formatTimeAgo = (dateStr: string) => {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
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
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  const fetchActivities = useCallback((cursor?: string) => {
    const isLoadMore = !!cursor
    if (isLoadMore) setLoadingMore(true)
    else setLoading(true)

    const typeFilter = activityTypes.find((t) => t.id === selectedType)?.filter

    getActivity({
      type: typeFilter,
      limit: 30,
      cursor,
    })
      .then((r) => {
        if (isLoadMore) {
          setActivities((prev) => [...prev, ...(r.activities ?? [])])
        } else {
          setActivities(r.activities ?? [])
        }
        setNextCursor(r.nextCursor ?? undefined)
        setHasMore(r.hasMore ?? false)
        setError(null)
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Failed to load')
        if (!isLoadMore) setActivities([])
      })
      .finally(() => {
        if (isLoadMore) setLoadingMore(false)
        else setLoading(false)
      })
  }, [selectedType])

  useEffect(() => {
    fetchActivities()
  }, [fetchActivities])

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

      {/* Loading */}
      {loading && (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-card border border-border animate-pulse" />
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && error && <p className="text-muted-foreground py-8">{error}</p>}

      {/* Activity Feed */}
      {!loading && !error && (
        <div className="space-y-2">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors"
            >
              {/* Icon */}
              <div className="p-2 rounded-lg bg-muted">
                {getActivityIcon(activity.type)}
              </div>

              {/* NFT Info */}
              {activity.nft ? (
                <Link
                  href={`/nft/${activity.nft.collection.contractAddress}/${activity.nft.tokenId}`}
                  className="flex items-center gap-3 flex-1 min-w-0"
                >
                  {activity.nft.image && (
                    <img
                      src={activity.nft.image}
                      alt={activity.nft.name ?? activity.nft.tokenId}
                      width={48}
                      height={48}
                      className="h-12 w-12 rounded-lg object-cover"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="font-medium truncate">{activity.nft.name ?? `#${activity.nft.tokenId}`}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {activity.nft.collection.name}
                    </p>
                  </div>
                </Link>
              ) : (
                <div className="flex-1" />
              )}

              {/* Event Type */}
              <div className="hidden sm:block text-sm">
                <span className="capitalize font-medium">{activity.type}</span>
              </div>

              {/* Price */}
              <div className="text-right min-w-[80px]">
                {activity.price && (
                  <>
                    <p className="font-semibold">{activity.price}</p>
                    <p className="text-xs text-muted-foreground">{activity.denom === 'unibi' ? 'NIBI' : activity.denom ?? 'NIBI'}</p>
                  </>
                )}
              </div>

              {/* From/To */}
              <div className="hidden md:block text-sm text-muted-foreground min-w-[120px]">
                {activity.fromAddress && (
                  <Link
                    href={`/profile/${activity.fromAddress}`}
                    className="hover:text-foreground"
                  >
                    {formatAddress(activity.fromAddress)}
                  </Link>
                )}
              </div>

              <div className="hidden md:block text-sm text-muted-foreground min-w-[120px]">
                {activity.toAddress && (
                  <Link
                    href={`/profile/${activity.toAddress}`}
                    className="hover:text-foreground"
                  >
                    {formatAddress(activity.toAddress)}
                  </Link>
                )}
              </div>

              {/* Time */}
              <div className="text-sm text-muted-foreground min-w-[70px] text-right">
                {formatTimeAgo(activity.timestamp)}
              </div>
            </div>
          ))}

          {activities.length === 0 && (
            <p className="text-muted-foreground text-center py-12">No activity found.</p>
          )}
        </div>
      )}

      {/* Load More */}
      {hasMore && !loading && (
        <div className="mt-8 text-center">
          <Button
            variant="outline"
            size="lg"
            onClick={() => fetchActivities(nextCursor)}
            disabled={loadingMore}
          >
            {loadingMore ? 'Loading...' : 'Load More Activity'}
          </Button>
        </div>
      )}
    </div>
  )
}
