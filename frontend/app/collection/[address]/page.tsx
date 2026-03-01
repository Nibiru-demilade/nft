'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { NFTCard } from '@/components/ui/nft-card'
import { Button } from '@/components/ui/button'
import { formatAddress } from '@/lib/utils'
import { Verified, Twitter, Globe, Share2, Copy, Check } from 'lucide-react'
import { getCollection, getCollectionNFTs, getActivity, type Collection, type NFT, type Activity } from '@/lib/api'

function formatBigInt(v: string | number | bigint | null | undefined): string {
  if (v == null) return '0'
  const s = String(v)
  const n = parseInt(s, 10)
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(2) + 'K'
  return s
}

export default function CollectionPage() {
  const params = useParams()
  const address = params?.address as string
  const [collection, setCollection] = useState<Collection | null>(null)
  const [nfts, setNfts] = useState<NFT[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'items' | 'activity'>('items')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!address) return
    setLoading(true)
    getCollection(address)
      .then((r) => setCollection(r.collection))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false))
  }, [address])

  useEffect(() => {
    if (!address) return
    getCollectionNFTs(address, { limit: 50 })
      .then((r) => setNfts(r.nfts))
      .catch(() => setNfts([]))
  }, [address])

  useEffect(() => {
    if (!address || activeTab !== 'activity') return
    getActivity({ collection: address, limit: 30 })
      .then((r) => setActivities(r.activities ?? []))
      .catch(() => setActivities([]))
  }, [address, activeTab])

  const handleCopy = async () => {
    if (collection?.contractAddress) {
      await navigator.clipboard.writeText(collection.contractAddress)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (loading && !collection) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="animate-pulse space-y-6">
          <div className="h-48 md:h-64 rounded-xl bg-muted" />
          <div className="h-32 w-32 rounded-2xl bg-muted" />
          <div className="h-8 w-64 bg-muted rounded" />
        </div>
      </div>
    )
  }

  if (error || !collection) {
    return (
      <div className="container mx-auto px-4 py-12 text-center text-muted-foreground">
        <p>{error ?? 'Collection not found'}</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/collections">Back to Collections</Link>
        </Button>
      </div>
    )
  }

  const floorPrice = typeof collection.floorPrice === 'string' ? collection.floorPrice : formatBigInt(collection.floorPrice)
  const totalVolume = typeof collection.totalVolume === 'string' ? collection.totalVolume : formatBigInt(collection.totalVolume)

  return (
    <div>
      <div className="relative h-48 md:h-64 lg:h-80">
        <Image
          src={collection.banner || '/placeholder-banner.png'}
          alt={`${collection.name} banner`}
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
      </div>

      <div className="container mx-auto px-4">
        <div className="relative -mt-16 md:-mt-20 mb-8">
          <div className="flex flex-col md:flex-row md:items-end gap-6">
            <div className="h-32 w-32 md:h-40 md:w-40 rounded-2xl border-4 border-background overflow-hidden relative">
              <Image
                src={collection.image || '/placeholder-nft.png'}
                alt={collection.name}
                fill
                className="object-cover"
              />
            </div>
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-2">
                <h1 className="text-3xl md:text-4xl font-bold">{collection.name}</h1>
                {collection.verified && <Verified className="h-6 w-6 text-primary fill-primary" />}
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <button onClick={handleCopy} className="flex items-center gap-1 hover:text-foreground transition-colors">
                  {formatAddress(collection.contractAddress)}
                  {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {collection.website && (
                <Button variant="outline" size="icon" asChild>
                  <a href={collection.website} target="_blank" rel="noopener noreferrer">
                    <Globe className="h-4 w-4" />
                  </a>
                </Button>
              )}
              <Button variant="outline" size="icon">
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {collection.description && (
            <p className="mt-4 text-muted-foreground max-w-3xl">{collection.description}</p>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="p-4 rounded-xl bg-card border border-border">
            <p className="text-sm text-muted-foreground">Floor Price</p>
            <p className="text-2xl font-bold">{floorPrice} NIBI</p>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border">
            <p className="text-sm text-muted-foreground">Total Volume</p>
            <p className="text-2xl font-bold">{totalVolume} NIBI</p>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border">
            <p className="text-sm text-muted-foreground">Items</p>
            <p className="text-2xl font-bold">{(collection.itemCount ?? 0).toLocaleString()}</p>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border">
            <p className="text-sm text-muted-foreground">Owners</p>
            <p className="text-2xl font-bold">{(collection.ownerCount ?? 0).toLocaleString()}</p>
          </div>
        </div>

        <div className="border-b border-border mb-6">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab('items')}
              className={`pb-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'items' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              Items
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`pb-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'activity' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              Activity
            </button>
          </div>
        </div>

        {activeTab === 'items' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
            {nfts.map((nft) => (
              <NFTCard
                key={nft.id}
                id={nft.tokenId}
                name={nft.name ?? `#${nft.tokenId}`}
                image={nft.image ?? ''}
                collection={collection.name}
                collectionAddress={collection.contractAddress}
                price={nft.listings?.[0]?.price?.toString()}
                currency="NIBI"
                likes={0}
              />
            ))}
          </div>
        )}
        {activeTab === 'items' && nfts.length === 0 && (
          <p className="text-muted-foreground text-center py-12">No items in this collection yet.</p>
        )}

        {activeTab === 'activity' && (
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium">Event</th>
                  <th className="text-left px-4 py-3 text-sm font-medium">Price</th>
                  <th className="text-left px-4 py-3 text-sm font-medium">From</th>
                  <th className="text-left px-4 py-3 text-sm font-medium">To</th>
                  <th className="text-left px-4 py-3 text-sm font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {activities.map((a) => (
                  <tr key={a.id} className="border-t border-border hover:bg-muted/50">
                    <td className="px-4 py-3 text-sm">{a.type}</td>
                    <td className="px-4 py-3 text-sm font-medium">{a.price ? `${a.price} ${a.denom ?? 'NIBI'}` : '-'}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{a.fromAddress ? formatAddress(a.fromAddress) : '-'}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{a.toAddress ? formatAddress(a.toAddress) : '-'}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{new Date(a.timestamp).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {activities.length === 0 && (
              <p className="p-8 text-center text-muted-foreground">No activity yet.</p>
            )}
          </div>
        )}

        <div className="h-16" />
      </div>
    </div>
  )
}
