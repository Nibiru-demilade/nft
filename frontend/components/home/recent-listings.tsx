'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { NFTCard } from '@/components/ui/nft-card'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'
import { fetchRecent } from '@/lib/api'

export function RecentListings() {
  const [recent, setRecent] = useState<Array<{
    id: string
    nft: { tokenId: string; name?: string; image?: string; collection: { name: string; contractAddress: string }; favoriteCount?: number }
    price: string
    denom: string
  }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchRecent({ limit: 8 })
      .then((r) => {
        setRecent(r.recent ?? [])
        setError(null)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <section>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Recently Listed</h2>
            <p className="text-muted-foreground mt-1">Loading...</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="rounded-2xl bg-card border border-border animate-pulse aspect-square" />
          ))}
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section>
        <p className="text-muted-foreground">{error}</p>
      </section>
    )
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold">Recently Listed</h2>
          <p className="text-muted-foreground mt-1">Fresh NFTs hitting the market</p>
        </div>
        <Button variant="ghost" asChild className="hidden sm:flex">
          <Link href="/explore">
            View All
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {recent.map((item) => (
          <NFTCard
            key={item.id}
            id={item.nft.tokenId}
            name={item.nft.name ?? `#${item.nft.tokenId}`}
            image={item.nft.image ?? ''}
            collection={item.nft.collection.name}
            collectionAddress={item.nft.collection.contractAddress}
            price={item.price}
            currency={item.denom === 'unibi' ? 'NIBI' : item.denom}
            likes={item.nft.favoriteCount ?? 0}
          />
        ))}
      </div>
      {recent.length === 0 && (
        <p className="text-muted-foreground text-center py-8">No recent listings. Be the first to list an NFT.</p>
      )}
      <div className="mt-6 text-center sm:hidden">
        <Button variant="outline" asChild>
          <Link href="/explore">View All NFTs</Link>
        </Button>
      </div>
    </section>
  )
}
