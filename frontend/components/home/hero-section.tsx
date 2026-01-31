'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, Sparkles } from 'lucide-react'

export function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-background to-pink-900/20" />
      
      {/* Animated blobs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/30 rounded-full filter blur-3xl animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-pink-500/30 rounded-full filter blur-3xl animate-pulse delay-1000" />

      <div className="container mx-auto px-4 py-24 relative z-10">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">The NFT Marketplace on Nibiru Chain</span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-bold leading-tight">
            Discover, Collect & Sell{' '}
            <span className="gradient-text">Extraordinary</span> NFTs
          </h1>

          {/* Subheadline */}
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            The premier NFT marketplace on Nibiru Chain. Create, buy, and sell unique digital assets with low fees and fast transactions.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="xl" variant="gradient" asChild>
              <Link href="/explore">
                Explore NFTs
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="xl" variant="outline" asChild>
              <Link href="/create">Create NFT</Link>
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 pt-12 border-t border-border mt-12">
            <div>
              <p className="text-3xl md:text-4xl font-bold gradient-text">10K+</p>
              <p className="text-sm text-muted-foreground mt-1">Collections</p>
            </div>
            <div>
              <p className="text-3xl md:text-4xl font-bold gradient-text">500K+</p>
              <p className="text-sm text-muted-foreground mt-1">NFTs</p>
            </div>
            <div>
              <p className="text-3xl md:text-4xl font-bold gradient-text">50K+</p>
              <p className="text-sm text-muted-foreground mt-1">Users</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
