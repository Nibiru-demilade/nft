'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { NFTCard } from '@/components/ui/nft-card'
import { Button } from '@/components/ui/button'
import { formatAddress } from '@/lib/utils'
import { useWalletAddress } from '@/lib/walletAddressContext'
import { getUser, getUserNFTs, getUserActivity, type User, type NFT, type Activity } from '@/lib/api'
import { Copy, Check, Settings, Share2 } from 'lucide-react'

type Tab = 'collected' | 'created' | 'activity'

export default function ProfilePage() {
  const params = useParams()
  const profileAddress = params?.address as string
  const { address: connectedAddress } = useWalletAddress()
  const [user, setUser] = useState<User | null>(null)
  const [nfts, setNfts] = useState<NFT[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('collected')
  const [copied, setCopied] = useState(false)

  const isOwnProfile = connectedAddress === profileAddress

  useEffect(() => {
    if (!profileAddress) return
    setLoading(true)
    getUser(profileAddress)
      .then((r) => setUser(r.user))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false))
  }, [profileAddress])

  useEffect(() => {
    if (!profileAddress) return
    const type = activeTab === 'created' ? 'created' : 'owned'
    getUserNFTs(profileAddress, type)
      .then((r) => setNfts(r.nfts))
      .catch(() => setNfts([]))
  }, [profileAddress, activeTab])

  useEffect(() => {
    if (!profileAddress || activeTab !== 'activity') return
    getUserActivity(profileAddress)
      .then((r) => setActivities(r.activities ?? []))
      .catch(() => setActivities([]))
  }, [profileAddress, activeTab])

  const handleCopy = async () => {
    if (profileAddress) {
      await navigator.clipboard.writeText(profileAddress)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (loading && !user) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="animate-pulse space-y-6">
          <div className="h-48 md:h-64 rounded-xl bg-muted" />
          <div className="h-32 w-32 rounded-2xl bg-muted" />
        </div>
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="container mx-auto px-4 py-12 text-center text-muted-foreground">
        <p>{error ?? 'User not found'}</p>
      </div>
    )
  }

  const stats = user.stats ?? { owned: 0, created: 0, favorites: 0, volumeTraded: '0' }

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'collected', label: 'Collected', count: stats.owned },
    { id: 'created', label: 'Created', count: stats.created },
    { id: 'activity', label: 'Activity' },
  ]

  return (
    <div>
      <div className="relative h-48 md:h-64 lg:h-72">
        <Image
          src={user.banner || '/placeholder-banner.png'}
          alt="Profile banner"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
      </div>

      <div className="container mx-auto px-4">
        <div className="relative -mt-16 md:-mt-20 mb-8">
          <div className="flex flex-col md:flex-row md:items-end gap-6">
            <div className="relative">
              <div className="h-32 w-32 md:h-40 md:w-40 rounded-2xl border-4 border-background overflow-hidden relative">
                <Image
                  src={user.avatar || '/placeholder-nft.png'}
                  alt={user.username ?? formatAddress(user.address)}
                  fill
                  className="object-cover"
                />
              </div>
            </div>
            <div className="flex-1 space-y-2">
              <h1 className="text-2xl md:text-3xl font-bold">{user.username ?? formatAddress(user.address)}</h1>
              <button onClick={handleCopy} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                {formatAddress(user.address)}
                {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
              </button>
              {user.bio && <p className="text-muted-foreground max-w-xl">{user.bio}</p>}
            </div>
            {isOwnProfile && (
              <Button variant="outline" size="icon" asChild>
                <Link href="/profile/settings">
                  <Settings className="h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="p-4 rounded-xl bg-card border border-border">
              <p className="text-2xl font-bold">{stats.owned}</p>
              <p className="text-sm text-muted-foreground">Collected</p>
            </div>
            <div className="p-4 rounded-xl bg-card border border-border">
              <p className="text-2xl font-bold">{stats.created}</p>
              <p className="text-sm text-muted-foreground">Created</p>
            </div>
            <div className="p-4 rounded-xl bg-card border border-border">
              <p className="text-2xl font-bold">{stats.favorites}</p>
              <p className="text-sm text-muted-foreground">Favorites</p>
            </div>
            <div className="p-4 rounded-xl bg-card border border-border">
              <p className="text-2xl font-bold">{stats.volumeTraded}</p>
              <p className="text-sm text-muted-foreground">Volume</p>
            </div>
          </div>
        </div>

        <div className="border-b border-border mb-6">
          <div className="flex gap-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-4 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              >
                {tab.label}
                {tab.count != null && <span className="ml-2 text-muted-foreground">({tab.count})</span>}
              </button>
            ))}
          </div>
        </div>

        {activeTab !== 'activity' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
            {nfts.map((nft) => (
              <NFTCard
                key={nft.id}
                id={nft.tokenId}
                name={nft.name ?? `#${nft.tokenId}`}
                image={nft.image ?? ''}
                collection={nft.collection.name}
                collectionAddress={nft.collection.contractAddress}
                price={nft.listings?.[0]?.price?.toString()}
                currency="NIBI"
                likes={0}
              />
            ))}
          </div>
        )}
        {activeTab !== 'activity' && nfts.length === 0 && (
          <p className="text-muted-foreground text-center py-12">Nothing here yet.</p>
        )}

        {activeTab === 'activity' && (
          <div className="space-y-3">
            {activities.map((a) => (
              <div key={a.id} className="flex items-center justify-between p-4 rounded-xl bg-card border border-border">
                <div>
                  <p className="font-medium">{a.type}</p>
                  <p className="text-sm text-muted-foreground">
                    {a.fromAddress && formatAddress(a.fromAddress)}
                    {a.toAddress && ` → ${formatAddress(a.toAddress)}`}
                  </p>
                </div>
                <div className="text-right">
                  {a.price && <p className="font-medium">{String(a.price)} NIBI</p>}
                  <p className="text-xs text-muted-foreground">{new Date(a.timestamp).toLocaleString()}</p>
                </div>
              </div>
            ))}
            {activities.length === 0 && <p className="text-muted-foreground text-center py-12">No activity yet.</p>}
          </div>
        )}

        <div className="h-16" />
      </div>
    </div>
  )
}
