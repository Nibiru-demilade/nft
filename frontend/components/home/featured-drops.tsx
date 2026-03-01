'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'
import { fetchTrending } from '@/lib/api'
import { CollectionCard } from '@/components/ui/collection-card'

export function FeaturedDrops() {
  const [collections, setCollections] = useState<Array<{
    contractAddress: string
    name: string
    image?: string
    banner?: string
    floorPrice?: string
    totalVolume?: string
    itemCount?: number
    ownerCount?: number
    verified?: boolean
  }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTrending({ limit: 3 })
      .then((r) => setCollections(r.trending ?? []))
      .catch(() => setCollections([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <section>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Featured Drops</h2>
            <p className="text-muted-foreground mt-1">Loading...</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl bg-card border border-border animate-pulse aspect-[3/4]" />
          ))}
        </div>
      </section>
    )
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold">Featured Drops</h2>
          <p className="text-muted-foreground mt-1">Top collections to explore</p>
        </div>
        <Button variant="ghost" asChild className="hidden sm:flex">
          <Link href="/collections">View All<ArrowRight className="ml-2 h-4 w-4" /></Link>
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {collections.map((c) => (
          <CollectionCard
            key={c.contractAddress}
            address={c.contractAddress}
            name={c.name}
            image={c.image}
            banner={c.banner}
            floorPrice={c.floorPrice}
            totalVolume={c.totalVolume}
            itemCount={c.itemCount}
            ownerCount={c.ownerCount}
            isVerified={c.verified}
          />
        ))}
      </div>
      {collections.length === 0 && (
        <p className="text-muted-foreground text-center py-8">No featured collections yet.</p>
      )}
    </section>
  )
}
