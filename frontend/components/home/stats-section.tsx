'use client'

import { TrendingUp, Users, Image, Coins } from 'lucide-react'

const stats = [
  {
    label: 'Total Volume',
    value: '2.5M',
    subvalue: 'NIBI',
    icon: Coins,
    change: '+15.2%',
    positive: true,
  },
  {
    label: 'NFTs Created',
    value: '524K',
    subvalue: 'Items',
    icon: Image,
    change: '+8.7%',
    positive: true,
  },
  {
    label: 'Total Users',
    value: '52.4K',
    subvalue: 'Wallets',
    icon: Users,
    change: '+12.3%',
    positive: true,
  },
  {
    label: 'Total Sales',
    value: '156K',
    subvalue: 'Transactions',
    icon: TrendingUp,
    change: '+5.1%',
    positive: true,
  },
]

export function StatsSection() {
  return (
    <section>
      <div className="text-center mb-12">
        <h2 className="text-2xl md:text-3xl font-bold">Marketplace Statistics</h2>
        <p className="text-muted-foreground mt-2">Real-time data from the Nibiru NFT ecosystem</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="p-6 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <stat.icon className="h-5 w-5 text-primary" />
              </div>
              <span
                className={`text-sm font-medium ${
                  stat.positive ? 'text-green-500' : 'text-red-500'
                }`}
              >
                {stat.change}
              </span>
            </div>
            <div>
              <p className="text-3xl font-bold">{stat.value}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {stat.subvalue} • {stat.label}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
