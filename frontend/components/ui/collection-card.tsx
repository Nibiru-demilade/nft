'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Verified } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CollectionCardProps {
  address: string
  name: string
  image?: string
  banner?: string
  floorPrice?: string
  totalVolume?: string
  itemCount?: number
  ownerCount?: number
  isVerified?: boolean
  change24h?: number
}

export function CollectionCard({
  address,
  name,
  image,
  banner,
  floorPrice,
  totalVolume,
  itemCount,
  ownerCount,
  isVerified,
  change24h,
}: CollectionCardProps) {
  return (
    <Link href={`/collection/${address}`} className="block">
      <div className="nft-card group">
        {/* Banner */}
        <div className="relative h-24 overflow-hidden">
          <Image
            src={banner || '/placeholder-banner.png'}
            alt={`${name} banner`}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-110"
          />
        </div>

        {/* Avatar */}
        <div className="relative -mt-8 ml-4">
          <div className="h-16 w-16 rounded-xl border-4 border-card overflow-hidden">
            <Image
              src={image || '/placeholder-collection.png'}
              alt={name}
              width={64}
              height={64}
              className="object-cover"
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-4 pt-2 space-y-3">
          {/* Name & Verified */}
          <div className="flex items-center space-x-1">
            <h3 className="font-semibold truncate">{name}</h3>
            {isVerified && (
              <Verified className="h-4 w-4 text-primary fill-primary" />
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Floor</p>
              <p className="font-semibold">{floorPrice || '--'} NIBI</p>
            </div>
            <div>
              <p className="text-muted-foreground">24h</p>
              <p
                className={cn(
                  'font-semibold',
                  change24h && change24h > 0
                    ? 'text-green-500'
                    : change24h && change24h < 0
                    ? 'text-red-500'
                    : ''
                )}
              >
                {change24h ? `${change24h > 0 ? '+' : ''}${change24h.toFixed(1)}%` : '--'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Volume</p>
              <p className="font-semibold">{totalVolume || '--'} NIBI</p>
            </div>
            <div>
              <p className="text-muted-foreground">Items</p>
              <p className="font-semibold">{itemCount?.toLocaleString() || '--'}</p>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
