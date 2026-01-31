'use client'

import { useChain } from '@cosmos-kit/react'
import { SigningCosmWasmClient, CosmWasmClient } from '@cosmjs/cosmwasm-stargate'
import { useState, useEffect, useCallback } from 'react'
import { CHAIN_CONFIG, CONTRACTS } from '@/lib/contracts'

export function useCosmWasmClient() {
  const [client, setClient] = useState<CosmWasmClient | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function connect() {
      try {
        const cosmWasmClient = await CosmWasmClient.connect(CHAIN_CONFIG.rpcEndpoint)
        setClient(cosmWasmClient)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to connect'))
      } finally {
        setLoading(false)
      }
    }
    connect()
  }, [])

  return { client, loading, error }
}

export function useSigningClient() {
  const { getSigningCosmWasmClient, address, isWalletConnected } = useChain('nibirutestnet')
  const [client, setClient] = useState<SigningCosmWasmClient | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const connect = useCallback(async () => {
    if (!isWalletConnected) return null

    setLoading(true)
    try {
      const signingClient = await getSigningCosmWasmClient()
      setClient(signingClient)
      setError(null)
      return signingClient
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to get signing client'))
      return null
    } finally {
      setLoading(false)
    }
  }, [getSigningCosmWasmClient, isWalletConnected])

  useEffect(() => {
    if (isWalletConnected) {
      connect()
    } else {
      setClient(null)
    }
  }, [isWalletConnected, connect])

  return { client, address, loading, error, connect }
}

export function useNFTContract(contractAddress?: string) {
  const { client } = useCosmWasmClient()
  const { client: signingClient, address } = useSigningClient()

  const queryNFT = useCallback(
    async (tokenId: string) => {
      if (!client || !contractAddress) return null
      return client.queryContractSmart(contractAddress, {
        nft_info: { token_id: tokenId },
      })
    },
    [client, contractAddress]
  )

  const queryOwner = useCallback(
    async (tokenId: string) => {
      if (!client || !contractAddress) return null
      return client.queryContractSmart(contractAddress, {
        owner_of: { token_id: tokenId },
      })
    },
    [client, contractAddress]
  )

  const queryTokens = useCallback(
    async (owner: string, startAfter?: string, limit?: number) => {
      if (!client || !contractAddress) return null
      return client.queryContractSmart(contractAddress, {
        tokens: { owner, start_after: startAfter, limit },
      })
    },
    [client, contractAddress]
  )

  const mint = useCallback(
    async (tokenId: string, owner: string, tokenUri?: string, extension?: any) => {
      if (!signingClient || !address || !contractAddress) {
        throw new Error('Not connected')
      }
      return signingClient.execute(
        address,
        contractAddress,
        {
          mint: { token_id: tokenId, owner, token_uri: tokenUri, extension },
        },
        'auto'
      )
    },
    [signingClient, address, contractAddress]
  )

  const transfer = useCallback(
    async (recipient: string, tokenId: string) => {
      if (!signingClient || !address || !contractAddress) {
        throw new Error('Not connected')
      }
      return signingClient.execute(
        address,
        contractAddress,
        {
          transfer_nft: { recipient, token_id: tokenId },
        },
        'auto'
      )
    },
    [signingClient, address, contractAddress]
  )

  return {
    queryNFT,
    queryOwner,
    queryTokens,
    mint,
    transfer,
  }
}

export function useMarketplace() {
  const { client } = useCosmWasmClient()
  const { client: signingClient, address } = useSigningClient()
  const marketplaceAddress = CONTRACTS.MARKETPLACE

  const queryListing = useCallback(
    async (nftContract: string, tokenId: string) => {
      if (!client || !marketplaceAddress) return null
      return client.queryContractSmart(marketplaceAddress, {
        listing: { nft_contract: nftContract, token_id: tokenId },
      })
    },
    [client, marketplaceAddress]
  )

  const queryListings = useCallback(
    async (options?: { collection?: string; seller?: string; limit?: number }) => {
      if (!client || !marketplaceAddress) return null
      return client.queryContractSmart(marketplaceAddress, {
        listings: options,
      })
    },
    [client, marketplaceAddress]
  )

  const listNFT = useCallback(
    async (
      nftContract: string,
      tokenId: string,
      price: { amount: string; denom: string },
      duration: number
    ) => {
      if (!signingClient || !address || !marketplaceAddress) {
        throw new Error('Not connected')
      }

      // First approve marketplace to transfer NFT
      await signingClient.execute(
        address,
        nftContract,
        {
          approve: {
            spender: marketplaceAddress,
            token_id: tokenId,
          },
        },
        'auto'
      )

      // Then create listing
      return signingClient.execute(
        address,
        marketplaceAddress,
        {
          list_fixed_price: {
            nft_contract: nftContract,
            token_id: tokenId,
            price,
            duration,
          },
        },
        'auto'
      )
    },
    [signingClient, address, marketplaceAddress]
  )

  const buyNFT = useCallback(
    async (nftContract: string, tokenId: string, price: { amount: string; denom: string }) => {
      if (!signingClient || !address || !marketplaceAddress) {
        throw new Error('Not connected')
      }
      return signingClient.execute(
        address,
        marketplaceAddress,
        {
          buy: {
            nft_contract: nftContract,
            token_id: tokenId,
          },
        },
        'auto',
        undefined,
        [price]
      )
    },
    [signingClient, address, marketplaceAddress]
  )

  const makeOffer = useCallback(
    async (
      nftContract: string,
      tokenId: string,
      amount: { amount: string; denom: string },
      duration: number
    ) => {
      if (!signingClient || !address || !marketplaceAddress) {
        throw new Error('Not connected')
      }
      return signingClient.execute(
        address,
        marketplaceAddress,
        {
          make_offer: {
            nft_contract: nftContract,
            token_id: tokenId,
            duration,
          },
        },
        'auto',
        undefined,
        [amount]
      )
    },
    [signingClient, address, marketplaceAddress]
  )

  const cancelListing = useCallback(
    async (nftContract: string, tokenId: string) => {
      if (!signingClient || !address || !marketplaceAddress) {
        throw new Error('Not connected')
      }
      return signingClient.execute(
        address,
        marketplaceAddress,
        {
          cancel_listing: {
            nft_contract: nftContract,
            token_id: tokenId,
          },
        },
        'auto'
      )
    },
    [signingClient, address, marketplaceAddress]
  )

  return {
    queryListing,
    queryListings,
    listNFT,
    buyNFT,
    makeOffer,
    cancelListing,
  }
}

export function useCollectionFactory() {
  const { client } = useCosmWasmClient()
  const { client: signingClient, address } = useSigningClient()
  const factoryAddress = CONTRACTS.FACTORY

  const queryCollections = useCallback(
    async (options?: { creator?: string; verifiedOnly?: boolean; limit?: number }) => {
      if (!client || !factoryAddress) return null
      return client.queryContractSmart(factoryAddress, {
        collections: options,
      })
    },
    [client, factoryAddress]
  )

  const queryCollection = useCallback(
    async (collectionAddress: string) => {
      if (!client || !factoryAddress) return null
      return client.queryContractSmart(factoryAddress, {
        collection: { address: collectionAddress },
      })
    },
    [client, factoryAddress]
  )

  const createCollection = useCallback(
    async (params: {
      name: string
      symbol: string
      description?: string
      image?: string
      royaltyPercentage: string
      maxSupply?: number
    }) => {
      if (!signingClient || !address || !factoryAddress) {
        throw new Error('Not connected')
      }
      return signingClient.execute(
        address,
        factoryAddress,
        {
          create_collection: {
            name: params.name,
            symbol: params.symbol,
            description: params.description,
            image: params.image,
            royalty_percentage: params.royaltyPercentage,
            max_supply: params.maxSupply,
          },
        },
        'auto'
      )
    },
    [signingClient, address, factoryAddress]
  )

  return {
    queryCollections,
    queryCollection,
    createCollection,
  }
}
