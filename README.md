# Nibiru NFT Marketplace

A production-ready NFT marketplace built on Nibiru Chain, featuring full CosmWasm smart contracts, a modern Next.js frontend, and a Node.js backend with real-time blockchain indexing.

## Features

- **Smart Contracts (CosmWasm/Rust)**
  - CW721 NFT contract with royalty support
  - Marketplace contract (fixed price, auctions, Dutch auctions)
  - Collection Factory for deploying new collections

- **Frontend (Next.js 14)**
  - Modern, responsive UI with Tailwind CSS
  - Keplr/Leap wallet integration via Cosmos Kit
  - NFT browsing, minting, buying, and selling
  - Collection and user profiles
  - Real-time activity feed

- **Backend (Node.js)**
  - PostgreSQL database with Prisma ORM
  - REST API for all marketplace data
  - Blockchain indexer for real-time updates
  - IPFS integration for metadata storage

## Project Structure

```
nft/
├── contracts/                 # CosmWasm smart contracts
│   ├── cw721-base/           # NFT standard implementation
│   ├── marketplace/          # Trading contract
│   └── collection-factory/   # Collection deployment
├── frontend/                  # Next.js application
│   ├── app/                  # App router pages
│   ├── components/           # React components
│   └── lib/                  # Utilities and hooks
├── backend/                   # Node.js API + Indexer
│   ├── src/
│   │   ├── api/             # REST endpoints
│   │   └── indexer/         # Blockchain indexer
│   └── prisma/              # Database schema
└── scripts/                  # Deployment scripts
```

## Prerequisites

- **Rust** (for smart contracts): `rustup target add wasm32-unknown-unknown`
- **Node.js** 18+ (for frontend and backend)
- **Docker** (for PostgreSQL and Redis)
- **Nibiru CLI** (`nibid`) for contract deployment

## Mock Mode (No Contract Deployment)

You can run the full app **without deploying any smart contracts** using the mock contract layer:

1. **Backend:** Set in `backend/.env`:
   - `USE_MOCK_CONTRACTS=true`
   - `DATABASE_URL` (PostgreSQL)
   - Run `npx prisma migrate deploy` and `npx prisma db seed`

2. **Frontend:** Set in `frontend/.env.local`:
   - `NEXT_PUBLIC_USE_MOCK_CONTRACTS=true`
   - `NEXT_PUBLIC_API_URL=http://localhost:3001/api`

3. Start backend (`npm run dev` in `backend/`) and frontend (`npm run dev` in `frontend/`). Connect wallet will prompt for an address/username (no Keplr). Mint, list, and buy write to the database via `backend/src/services/contractMock.ts`. To switch to real contracts later, set `USE_MOCK_CONTRACTS=false` and deploy contracts.

## Quick Start

### 1. Clone and Install

```bash
cd nibiru/nft

# Install frontend dependencies
cd frontend && npm install && cd ..

# Install backend dependencies
cd backend && npm install && cd ..
```

### 2. Start Database

```bash
cd backend
docker-compose up -d
npm run db:push
cd ..
```

### 3. Configure Environment

```bash
# Frontend
cp frontend/.env.example frontend/.env.local
# Edit with your contract addresses after deployment

# Backend
cp backend/.env.example backend/.env
# Edit with your database and RPC settings
```

### 4. Build Contracts

```bash
cd contracts
cargo build --target wasm32-unknown-unknown --release
```

### 5. Deploy Contracts (Testnet)

```bash
# Set up your deployer key
nibid keys add deployer --keyring-backend test

# Get testnet tokens from faucet
# https://faucet.nibiru.fi

# Deploy
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

### 6. Start Development Servers

```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
cd frontend && npm run dev
```

Visit http://localhost:3000 to see the marketplace.

## Smart Contracts

### CW721 NFT Contract

Standard CW721 implementation with extensions:
- Royalty support (EIP-2981 style)
- Batch minting
- On-chain metadata
- Configurable max supply

### Marketplace Contract

Full-featured trading contract:
- Fixed price listings
- English auctions with reserve prices
- Dutch auctions (declining price)
- Collection-wide offers
- Platform fees and royalty distribution

### Collection Factory

Deploy and manage NFT collections:
- Standardized collection deployment
- Verification system
- Collection metadata management

## API Endpoints

### Collections
- `GET /api/collections` - List collections
- `GET /api/collections/:address` - Get collection details
- `GET /api/collections/:address/nfts` - Get collection NFTs

### NFTs
- `GET /api/nfts` - List NFTs with filters
- `GET /api/nfts/:contract/:tokenId` - Get NFT details
- `GET /api/nfts/:contract/:tokenId/activity` - Get NFT history

### Users
- `GET /api/users/:address` - Get user profile
- `GET /api/users/:address/nfts` - Get user's NFTs
- `PUT /api/users/:address` - Update profile

### Activity
- `GET /api/activity` - Global activity feed
- `GET /api/activity/sales` - Recent sales
- `GET /api/stats` - Marketplace statistics

## Deployment

### Testnet

1. Build and optimize contracts:
```bash
cd contracts
docker run --rm -v "$(pwd)":/code \
  cosmwasm/rust-optimizer:0.15.0
```

2. Deploy using the script:
```bash
CHAIN_ID=nibiru-testnet-1 ./scripts/deploy.sh
```

3. Update `.env` files with deployed addresses

### Mainnet

1. Ensure contracts are audited
2. Set mainnet configuration:
```bash
CHAIN_ID=cataclysm-1 \
NODE=https://rpc.nibiru.fi:443 \
./scripts/deploy.sh
```

## Tech Stack

| Component | Technology |
|-----------|------------|
| Smart Contracts | Rust, CosmWasm, CW721 |
| Frontend | Next.js 14, React, Tailwind CSS |
| State Management | Zustand |
| Web3 | CosmJS, Cosmos Kit |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL, Prisma |
| Caching | Redis |
| Blockchain | Nibiru Chain |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## Security

- Smart contracts should be audited before mainnet deployment
- Never commit private keys or secrets
- Use environment variables for sensitive data
- Enable rate limiting in production

## License

MIT License - see LICENSE file for details

## Resources

- [Nibiru Documentation](https://docs.nibiru.fi/)
- [CosmWasm Documentation](https://docs.cosmwasm.com/)
- [CW721 Standard](https://github.com/CosmWasm/cw-nfts)
- [Cosmos Kit](https://cosmoskit.com/)
