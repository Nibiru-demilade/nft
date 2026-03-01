'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, Users, Image, Coins } from 'lucide-react'
import { fetchStats, type GlobalStats } from '@/lib/api'

const statConfig = [
  { label: 'Total Volume', key: 'totalVolume' as const, subvalue: 'NIBI', icon: Coins },
  { label: 'NFTs Created', key: 'totalNfts' as const, subvalue: 'Items', icon: Image },
  { label: 'Total Users', key: 'totalUsers' as const, subvalue: 'Wallets', icon: Users },
  { label: 'Total Sales', key: 'totalSales' as const, subvalue: 'Transactions', icon: TrendingUp },
]

function formatStat(value: string | number): string {
  const n = typeof value === 'string' ? parseInt(value, 10) : value
  if (isNaN(n)) return '0'
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return String(n)
}

export function StatsSection() {
  const [stats, setStats] = useState<GlobalStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchStats()
      .then((r) => { setStats(r.stats); setError(null) })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <section>
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold">Marketplace Statistics</h2>
          <p className="text-muted-foreground mt-2">Loading...</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-6 rounded-xl bg-card border border-border animate-pulse h-32" />
          ))}
        </div>
      </section>
    )
  }

  if (error || !stats) {
    return (
      <section>
        <div className="text-center text-muted-foreground">
          <p>{error ?? 'No stats available'}</p>
        </div>
      </section>
    )
  }

  return (
    <section>
      <div className="text-center mb-12">
        <h2 className="text-2xl md:text-3xl font-bold">Marketplace Statistics</h2>
        <p className="text-muted-foreground mt-2">Real-time data from the Nibiru NFT ecosystem</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {statConfig.map(({ label, key, subvalue, icon: Icon }) => (
          <div key={label} className="p-6 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold mt-1">{formatStat(stats[key] ?? 0)}</p>
            <p className="text-xs text-muted-foreground mt-1">{subvalue}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
