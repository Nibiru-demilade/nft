/**
 * Real contract service: wraps CosmWasm SigningCosmWasmClient calls.
 * Skeleton for when USE_MOCK_CONTRACTS=false. Implement with actual chain client.
 */

import type { ContractService } from './contractMock'

export const contractReal: ContractService = {
  async mintNFT() {
    throw new Error('Real contract not implemented: set USE_MOCK_CONTRACTS=true or implement contractReal with SigningCosmWasmClient')
  },
  async listNFT() {
    throw new Error('Real contract not implemented')
  },
  async buyNFT() {
    throw new Error('Real contract not implemented')
  },
  async cancelListing() {
    throw new Error('Real contract not implemented')
  },
  async createCollection() {
    throw new Error('Real contract not implemented')
  },
}
