'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { formatAddress } from '@/lib/utils'
import { useWalletAddress } from '@/lib/walletAddressContext'
import { getNFT, getNFTActivity, apiBuy, apiList, apiCancelListing, type NFT, type Activity } from '@/lib/api'
import { Heart, Share2, Tag, Eye, Verified, Copy, Check, RefreshCw, ArrowUpRight } from 'lucide-react'

export default function NFTDetailPage() {
  const params = useParams()
  const contract = params?.contract as string
  const tokenId = params?.tokenId as string
  const { address, isConnected, openView } = useWalletAddress()
  const [nft, setNft] = useState<NFT | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'properties' | 'activity' | 'offers'>('properties')
  const [liked, setLiked] = useState(false)
  const [copied, setCopied] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [listPrice, setListPrice] = useState('')

  useEffect(() => {
    if (!contract || !tokenId) return
    setLoading(true)
    getNFT(contract, tokenId)
      .then((r) => setNft(r.nft))
      .catch((e) => setError(e instanceof Error ? e.message : 'Not found'))
      .finally(() => setLoading(false))
  }, [contract, tokenId])

  useEffect(() => {
    if (!contract || !tokenId) return
    getNFTActivity(contract, tokenId)
      .then((r) => setActivities(r.activities ?? []))
      .catch(() => setActivities([]))
  }, [contract, tokenId])

  const activeListing = nft?.listings?.[0]
  const price = activeListing?.price != null ? String(activeListing.price) : undefined
  const listingId = activeListing?.id
  const isOwner = address && nft && nft.owner === address

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleBuy = async () => {
    if (!isConnected) { openView(); return }
    if (!listingId || !address) return
    setActionLoading(true)
    try {
      await apiBuy({ listingId, buyer: address })
      if (nft) setNft({ ...nft, listings: [], owner: address })
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Buy failed')
    } finally {
      setActionLoading(false)
    }
  }

  const handleList = async () => {
    if (!isConnected) { openView(); return }
    if (!address || !nft || !listPrice.trim()) return
    setActionLoading(true)
    try {
      await apiList({
        collectionAddress: nft.collection.contractAddress,
        tokenId: nft.tokenId,
        price: listPrice,
        seller: address,
      })
      window.location.reload()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'List failed')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancelListing = async () => {
    if (!listingId || !address) return
    setActionLoading(true)
    try {
      await apiCancelListing({ listingId, seller: address })
      window.location.reload()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Cancel failed')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading && !nft) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="animate-pulse grid lg:grid-cols-2 gap-8">
          <div className="aspect-square rounded-2xl bg-muted" />
          <div className="h-64 bg-muted rounded-2xl" />
        </div>
      </div>
    )
  }

  if (error || !nft) {
    return (
      <div className="container mx-auto px-4 py-12 text-center text-muted-foreground">
        <p>{error ?? 'NFT not found'}</p>
      </div>
    )
  }

  const parsedTraits = typeof nft.traits === 'string' ? (() => { try { return JSON.parse(nft.traits) } catch { return [] } })() : nft.traits
  const traits = Array.isArray(parsedTraits) ? parsedTraits : (parsedTraits && typeof parsedTraits === 'object' && 'attributes' in parsedTraits) ? (parsedTraits as { attributes?: Array<{ trait_type: string; value: string }> }).attributes ?? [] : []

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-muted">
            <Image
              src={nft.image || '/placeholder-nft.png'}
              alt={nft.name ?? tokenId}
              fill
              className="object-cover"
              priority
            />
            <div className="absolute top-4 right-4 flex gap-2">
              <button onClick={() => setLiked(!liked)} className="p-2 rounded-lg bg-black/50 backdrop-blur-sm hover:bg-black/70 transition-colors">
                <Heart className={`h-5 w-5 ${liked ? 'fill-red-500 text-red-500' : 'text-white'}`} />
              </button>
              <button className="p-2 rounded-lg bg-black/50 backdrop-blur-sm hover:bg-black/70 transition-colors">
                <Share2 className="h-5 w-5 text-white" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              <span>{(nft as any).viewCount ?? 0} views</span>
            </div>
            <div className="flex items-center gap-1">
              <Heart className="h-4 w-4" />
              <span>{(nft as any).favoriteCount ?? 0} favorites</span>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <Link href={`/collection/${nft.collection.contractAddress}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            {nft.collection.name}
            {nft.collection.verified && <Verified className="h-4 w-4 text-primary fill-primary" />}
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold">{nft.name ?? `#${tokenId}`}</h1>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-muted-foreground">Owned by </span>
            <Link href={`/profile/${nft.owner}`} className="text-primary hover:underline">
              {formatAddress(nft.owner)}
            </Link>
          </div>

          <div className="p-6 rounded-2xl bg-card border border-border space-y-4">
            {price ? (
              <>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Tag className="h-4 w-4" />
                  <span>Current price</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold">{price}</span>
                  <span className="text-xl text-muted-foreground">NIBI</span>
                </div>
                {isOwner ? (
                  <div className="flex gap-3">
                    <Button className="flex-1" variant="outline" disabled>
                      Edit Listing
                    </Button>
                    <Button className="flex-1" variant="destructive" onClick={handleCancelListing} disabled={actionLoading}>
                      {actionLoading ? 'Cancelling...' : 'Cancel Listing'}
                    </Button>
                  </div>
                ) : (
                  <Button className="w-full" variant="gradient" onClick={handleBuy} disabled={actionLoading || !isConnected}>
                    {!isConnected ? 'Connect to Buy' : actionLoading ? 'Processing...' : 'Buy Now'}
                  </Button>
                )}
              </>
            ) : (
              <>
                <div className="text-muted-foreground">Not listed for sale</div>
                {isOwner ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Price (e.g. 10)"
                      value={listPrice}
                      onChange={(e) => setListPrice(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    />
                    <Button className="w-full" variant="gradient" onClick={handleList} disabled={actionLoading || !listPrice.trim() || !isConnected}>
                      {actionLoading ? 'Listing...' : 'List for Sale'}
                    </Button>
                  </div>
                ) : (
                  <Button className="w-full" variant="outline" onClick={openView}>
                    Make Offer
                  </Button>
                )}
              </>
            )}
          </div>

          {nft.description && (
            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-muted-foreground">{nft.description}</p>
            </div>
          )}

          <div className="border-b border-border">
            <div className="flex gap-6">
              {(['properties', 'activity', 'offers'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-3 text-sm font-medium capitalize border-b-2 transition-colors ${activeTab === tab ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {activeTab === 'properties' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {traits.map((attr: { trait_type?: string; value?: string }, i: number) => (
                <div key={i} className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-center">
                  <p className="text-xs text-primary font-medium uppercase">{attr.trait_type ?? 'Trait'}</p>
                  <p className="font-semibold mt-1">{String(attr.value ?? '')}</p>
                </div>
              ))}
              {traits.length === 0 && <p className="text-muted-foreground col-span-full">No properties</p>}
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="space-y-3">
              {activities.map((a) => (
                <div key={a.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-background">
                      {a.type === 'SALE' && <Tag className="h-4 w-4 text-green-500" />}
                      {a.type === 'LIST' && <Tag className="h-4 w-4 text-primary" />}
                      {(a.type === 'TRANSFER' || a.type === 'MINT') && <ArrowUpRight className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="font-medium">{a.type}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.fromAddress && formatAddress(a.fromAddress)}
                        {a.toAddress && ` → ${formatAddress(a.toAddress)}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {a.price && <p className="font-medium">{String(a.price)} NIBI</p>}
                    <p className="text-xs text-muted-foreground">{new Date(a.timestamp).toLocaleString()}</p>
                  </div>
                </div>
              ))}
              {activities.length === 0 && <p className="text-muted-foreground text-center py-6">No activity yet</p>}
            </div>
          )}

          {activeTab === 'offers' && (
            <div className="text-center py-8 text-muted-foreground">
              No offers yet
            </div>
          )}

          <div className="p-4 rounded-xl bg-card border border-border space-y-3">
            <h3 className="font-semibold">Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Contract</span>
                <button onClick={() => handleCopy(contract)} className="flex items-center gap-1 hover:text-primary transition-colors">
                  {formatAddress(contract)}
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Token ID</span>
                <span>{tokenId}</span>
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
