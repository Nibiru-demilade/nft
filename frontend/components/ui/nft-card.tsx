'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Heart } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

interface NFTCardProps {
  id: string
  name: string
  image: string
  collection: string
  collectionAddress: string
  price?: string
  currency?: string
  owner?: string
  likes?: number
}

export function NFTCard({
  id,
  name,
  image,
  collection,
  collectionAddress,
  price,
  currency = 'NIBI',
  owner,
  likes = 0,
}: NFTCardProps) {
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(likes)

  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setLiked(!liked)
    setLikeCount(liked ? likeCount - 1 : likeCount + 1)
  }

  return (
    <Link href={`/nft/${collectionAddress}/${id}`} className="block">
      <div className="nft-card group">
        {/* Image Container */}
        <div className="relative aspect-square overflow-hidden">
          <Image
            src={image || '/placeholder-nft.png'}
            alt={name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-110"
          />
          {/* Like Button */}
          <button
            onClick={handleLike}
            className="absolute top-3 right-3 p-2 rounded-full bg-black/50 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Heart
              className={cn(
                'h-4 w-4 transition-colors',
                liked ? 'fill-red-500 text-red-500' : 'text-white'
              )}
            />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {/* Collection Name */}
          <p className="text-xs text-muted-foreground truncate">{collection}</p>

          {/* NFT Name */}
          <h3 className="font-semibold truncate">{name}</h3>

          {/* Price & Likes */}
          <div className="flex items-center justify-between">
            {price ? (
              <div>
                <p className="text-xs text-muted-foreground">Price</p>
                <p className="font-semibold">
                  {price} {currency}
                </p>
              </div>
            ) : (
              <div>
                <p className="text-xs text-muted-foreground">Not Listed</p>
              </div>
            )}

            <div className="flex items-center space-x-1 text-muted-foreground">
              <Heart className={cn('h-4 w-4', liked && 'fill-red-500 text-red-500')} />
              <span className="text-sm">{likeCount}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
