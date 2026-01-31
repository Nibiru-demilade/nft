import { HeroSection } from '@/components/home/hero-section'
import { TrendingCollections } from '@/components/home/trending-collections'
import { RecentListings } from '@/components/home/recent-listings'
import { FeaturedDrops } from '@/components/home/featured-drops'
import { StatsSection } from '@/components/home/stats-section'

export default function HomePage() {
  return (
    <div className="flex flex-col">
      <HeroSection />
      <div className="container mx-auto px-4 py-12 space-y-16">
        <TrendingCollections />
        <RecentListings />
        <FeaturedDrops />
        <StatsSection />
      </div>
    </div>
  )
}
