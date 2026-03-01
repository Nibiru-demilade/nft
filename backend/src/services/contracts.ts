/**
 * Contract service factory: mock vs real based on USE_MOCK_CONTRACTS.
 * One-line env change to switch between mock and real chain.
 */

import type { ContractService } from './contractMock'
import { contractMock } from './contractMock'
import { contractReal } from './contractReal'

const useMock = process.env.USE_MOCK_CONTRACTS === 'true'

export const contractService: ContractService = useMock ? contractMock : contractReal
export type { ContractService }
