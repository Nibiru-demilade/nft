import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create sample collections
  const collections = [
    {
      contractAddress: 'nibi1cosmicapes123',
      name: 'Cosmic Apes',
      symbol: 'CAPES',
      description: 'A collection of 10,000 unique cosmic apes exploring the Nibiru galaxy.',
      image: 'https://picsum.photos/seed/cosmicapes/200',
      banner: 'https://picsum.photos/seed/cosmicapesbanner/1200/400',
      creator: 'nibi1creator123',
      verified: true,
      featured: true,
      floorPrice: BigInt(25500000), // 25.5 NIBI
      totalVolume: BigInt(12345000000), // 12,345 NIBI
      totalSales: 450,
      totalListings: 123,
      itemCount: 10000,
      ownerCount: 5432,
      categories: ['PFPs', 'Art'],
      twitter: 'https://twitter.com/cosmicapes',
      website: 'https://cosmicapes.io',
    },
    {
      contractAddress: 'nibi1nibirupunks456',
      name: 'Nibiru Punks',
      symbol: 'NPUNK',
      description: 'Classic pixel art punks on Nibiru Chain.',
      image: 'https://picsum.photos/seed/nibirupunks/200',
      banner: 'https://picsum.photos/seed/nibirupunksbanner/1200/400',
      creator: 'nibi1creator456',
      verified: true,
      featured: true,
      floorPrice: BigInt(8200000), // 8.2 NIBI
      totalVolume: BigInt(8920000000), // 8,920 NIBI
      totalSales: 320,
      totalListings: 89,
      itemCount: 5000,
      ownerCount: 2341,
      categories: ['PFPs', 'Pixel Art'],
      twitter: 'https://twitter.com/nibirupunks',
    },
    {
      contractAddress: 'nibi1abstractdreams789',
      name: 'Abstract Dreams',
      symbol: 'DREAM',
      description: 'Generative abstract art created by AI.',
      image: 'https://picsum.photos/seed/abstractdreams/200',
      banner: 'https://picsum.photos/seed/abstractdreamsbanner/1200/400',
      creator: 'nibi1creator789',
      verified: false,
      featured: false,
      floorPrice: BigInt(15000000), // 15 NIBI
      totalVolume: BigInt(5670000000), // 5,670 NIBI
      totalSales: 180,
      totalListings: 45,
      itemCount: 3000,
      ownerCount: 1892,
      categories: ['Art', 'Generative'],
    },
  ]

  for (const collection of collections) {
    await prisma.collection.upsert({
      where: { contractAddress: collection.contractAddress },
      update: collection,
      create: collection,
    })
  }

  console.log(`Created ${collections.length} collections`)

  // Create sample NFTs for each collection
  const createdCollections = await prisma.collection.findMany()

  for (const collection of createdCollections) {
    const nftsToCreate = 20 // Create 20 sample NFTs per collection

    for (let i = 1; i <= nftsToCreate; i++) {
      const tokenId = String(i)
      const owner = `nibi1owner${Math.random().toString(36).slice(2, 10)}`
      
      await prisma.nft.upsert({
        where: {
          collectionId_tokenId: {
            collectionId: collection.id,
            tokenId,
          },
        },
        update: {},
        create: {
          collectionId: collection.id,
          tokenId,
          owner,
          creator: collection.creator,
          name: `${collection.name} #${tokenId}`,
          description: `A unique NFT from ${collection.name}`,
          image: `https://picsum.photos/seed/${collection.symbol}${tokenId}/400`,
          traits: [
            { trait_type: 'Background', value: ['Blue', 'Red', 'Green', 'Purple'][i % 4] },
            { trait_type: 'Rarity', value: ['Common', 'Rare', 'Epic', 'Legendary'][i % 4] },
          ] as object,
          viewCount: Math.floor(Math.random() * 1000),
          favoriteCount: Math.floor(Math.random() * 100),
          mintedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        },
      })

      // Create some listings
      if (i % 3 === 0) {
        const nft = await prisma.nft.findUnique({
          where: {
            collectionId_tokenId: {
              collectionId: collection.id,
              tokenId,
            },
          },
        })

        if (nft) {
          await prisma.listing.create({
            data: {
              nftId: nft.id,
              seller: owner,
              listingType: 'FIXED_PRICE',
              price: BigInt(Math.floor(Math.random() * 50000000) + 5000000),
              denom: 'unibi',
              expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              status: 'ACTIVE',
            },
          })
        }
      }
    }
  }

  console.log('Created sample NFTs and listings')

  // Create sample users
  const users = [
    {
      address: 'nibi1creator123',
      username: 'CosmicCreator',
      bio: 'Creating cosmic art on Nibiru',
      verified: true,
    },
    {
      address: 'nibi1creator456',
      username: 'PixelMaster',
      bio: 'Pixel art enthusiast',
      verified: true,
    },
    {
      address: 'nibi1whale789',
      username: 'NibiruWhale',
      bio: 'Collecting the best NFTs',
      verified: false,
    },
  ]

  for (const user of users) {
    await prisma.user.upsert({
      where: { address: user.address },
      update: user,
      create: user,
    })
  }

  console.log(`Created ${users.length} users`)

  // Create sample activities
  const allNfts = await prisma.nft.findMany({ take: 50 })

  for (const nft of allNfts.slice(0, 20)) {
    const activities = [
      {
        nftId: nft.id,
        type: 'MINT' as const,
        toAddress: nft.owner,
        timestamp: nft.mintedAt || new Date(),
      },
      {
        nftId: nft.id,
        type: 'LIST' as const,
        fromAddress: nft.owner,
        price: BigInt(Math.floor(Math.random() * 50000000)),
        denom: 'unibi',
        timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
      },
    ]

    for (const activity of activities) {
      await prisma.activity.create({ data: activity })
    }
  }

  console.log('Created sample activities')

  // Initialize global stats
  await prisma.globalStats.upsert({
    where: { id: 'global' },
    update: {},
    create: {
      id: 'global',
      totalVolume: BigInt(26935000000),
      totalSales: 950,
      totalCollections: 3,
      totalNfts: 60,
      totalUsers: 3,
    },
  })

  console.log('Initialized global stats')
  console.log('Seeding complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
