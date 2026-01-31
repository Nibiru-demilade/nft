#!/bin/bash

# Nibiru NFT Marketplace - Contract Deployment Script
# Prerequisites: nibid CLI, rust/cargo with wasm32 target

set -e

# Configuration
CHAIN_ID="${CHAIN_ID:-nibiru-testnet-1}"
NODE="${NODE:-https://rpc.testnet.nibiru.fi:443}"
KEYRING="${KEYRING:-test}"
DEPLOYER="${DEPLOYER:-deployer}"
GAS_PRICES="${GAS_PRICES:-0.025unibi}"
GAS_ADJUSTMENT="${GAS_ADJUSTMENT:-1.5}"

echo "=== Nibiru NFT Marketplace Deployment ==="
echo "Chain ID: $CHAIN_ID"
echo "Node: $NODE"
echo "Deployer: $DEPLOYER"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to wait for tx confirmation
wait_for_tx() {
    local tx_hash=$1
    echo "Waiting for tx: $tx_hash"
    sleep 6
    nibid query tx $tx_hash --node $NODE --output json
}

# Build contracts
echo -e "${YELLOW}Building contracts...${NC}"
cd contracts

echo "Building CW721..."
cd cw721-base
cargo build --target wasm32-unknown-unknown --release
cd ..

echo "Building Marketplace..."
cd marketplace
cargo build --target wasm32-unknown-unknown --release
cd ..

echo "Building Collection Factory..."
cd collection-factory
cargo build --target wasm32-unknown-unknown --release
cd ..

cd ..

# Optimize contracts (requires docker)
echo -e "${YELLOW}Optimizing contracts...${NC}"

if command -v docker &> /dev/null; then
    docker run --rm -v "$(pwd)/contracts":/code \
        --mount type=volume,source="$(basename "$(pwd)")_cache",target=/code/target \
        --mount type=volume,source=registry_cache,target=/usr/local/cargo/registry \
        cosmwasm/rust-optimizer:0.15.0
else
    echo -e "${RED}Docker not found. Skipping optimization.${NC}"
    echo "Using unoptimized wasm files..."
    mkdir -p contracts/artifacts
    cp contracts/target/wasm32-unknown-unknown/release/*.wasm contracts/artifacts/
fi

# Store contracts
echo -e "${YELLOW}Storing contracts on chain...${NC}"

# Store CW721
echo "Storing CW721 contract..."
CW721_STORE_TX=$(nibid tx wasm store contracts/artifacts/nibiru_cw721.wasm \
    --from $DEPLOYER \
    --chain-id $CHAIN_ID \
    --node $NODE \
    --gas auto \
    --gas-adjustment $GAS_ADJUSTMENT \
    --gas-prices $GAS_PRICES \
    --keyring-backend $KEYRING \
    --output json \
    -y | jq -r '.txhash')

CW721_RESULT=$(wait_for_tx $CW721_STORE_TX)
CW721_CODE_ID=$(echo $CW721_RESULT | jq -r '.logs[0].events[] | select(.type=="store_code") | .attributes[] | select(.key=="code_id") | .value')
echo -e "${GREEN}CW721 Code ID: $CW721_CODE_ID${NC}"

# Store Marketplace
echo "Storing Marketplace contract..."
MARKETPLACE_STORE_TX=$(nibid tx wasm store contracts/artifacts/nibiru_marketplace.wasm \
    --from $DEPLOYER \
    --chain-id $CHAIN_ID \
    --node $NODE \
    --gas auto \
    --gas-adjustment $GAS_ADJUSTMENT \
    --gas-prices $GAS_PRICES \
    --keyring-backend $KEYRING \
    --output json \
    -y | jq -r '.txhash')

MARKETPLACE_RESULT=$(wait_for_tx $MARKETPLACE_STORE_TX)
MARKETPLACE_CODE_ID=$(echo $MARKETPLACE_RESULT | jq -r '.logs[0].events[] | select(.type=="store_code") | .attributes[] | select(.key=="code_id") | .value')
echo -e "${GREEN}Marketplace Code ID: $MARKETPLACE_CODE_ID${NC}"

# Store Collection Factory
echo "Storing Collection Factory contract..."
FACTORY_STORE_TX=$(nibid tx wasm store contracts/artifacts/nibiru_collection_factory.wasm \
    --from $DEPLOYER \
    --chain-id $CHAIN_ID \
    --node $NODE \
    --gas auto \
    --gas-adjustment $GAS_ADJUSTMENT \
    --gas-prices $GAS_PRICES \
    --keyring-backend $KEYRING \
    --output json \
    -y | jq -r '.txhash')

FACTORY_RESULT=$(wait_for_tx $FACTORY_STORE_TX)
FACTORY_CODE_ID=$(echo $FACTORY_RESULT | jq -r '.logs[0].events[] | select(.type=="store_code") | .attributes[] | select(.key=="code_id") | .value')
echo -e "${GREEN}Collection Factory Code ID: $FACTORY_CODE_ID${NC}"

# Get deployer address
DEPLOYER_ADDR=$(nibid keys show $DEPLOYER -a --keyring-backend $KEYRING)
echo "Deployer address: $DEPLOYER_ADDR"

# Instantiate Marketplace
echo -e "${YELLOW}Instantiating Marketplace...${NC}"
MARKETPLACE_INIT='{
  "platform_fee": "0.025",
  "min_duration": 3600,
  "max_duration": 15552000,
  "accepted_denoms": ["unibi"]
}'

MARKETPLACE_INST_TX=$(nibid tx wasm instantiate $MARKETPLACE_CODE_ID "$MARKETPLACE_INIT" \
    --label "Nibiru NFT Marketplace" \
    --admin $DEPLOYER_ADDR \
    --from $DEPLOYER \
    --chain-id $CHAIN_ID \
    --node $NODE \
    --gas auto \
    --gas-adjustment $GAS_ADJUSTMENT \
    --gas-prices $GAS_PRICES \
    --keyring-backend $KEYRING \
    --output json \
    -y | jq -r '.txhash')

MARKETPLACE_INST_RESULT=$(wait_for_tx $MARKETPLACE_INST_TX)
MARKETPLACE_ADDR=$(echo $MARKETPLACE_INST_RESULT | jq -r '.logs[0].events[] | select(.type=="instantiate") | .attributes[] | select(.key=="_contract_address") | .value')
echo -e "${GREEN}Marketplace Address: $MARKETPLACE_ADDR${NC}"

# Instantiate Collection Factory
echo -e "${YELLOW}Instantiating Collection Factory...${NC}"
FACTORY_INIT="{
  \"cw721_code_id\": $CW721_CODE_ID,
  \"max_royalty_percentage\": \"0.1\"
}"

FACTORY_INST_TX=$(nibid tx wasm instantiate $FACTORY_CODE_ID "$FACTORY_INIT" \
    --label "Nibiru Collection Factory" \
    --admin $DEPLOYER_ADDR \
    --from $DEPLOYER \
    --chain-id $CHAIN_ID \
    --node $NODE \
    --gas auto \
    --gas-adjustment $GAS_ADJUSTMENT \
    --gas-prices $GAS_PRICES \
    --keyring-backend $KEYRING \
    --output json \
    -y | jq -r '.txhash')

FACTORY_INST_RESULT=$(wait_for_tx $FACTORY_INST_TX)
FACTORY_ADDR=$(echo $FACTORY_INST_RESULT | jq -r '.logs[0].events[] | select(.type=="instantiate") | .attributes[] | select(.key=="_contract_address") | .value')
echo -e "${GREEN}Collection Factory Address: $FACTORY_ADDR${NC}"

# Summary
echo ""
echo "=== Deployment Complete ==="
echo -e "${GREEN}CW721 Code ID: $CW721_CODE_ID${NC}"
echo -e "${GREEN}Marketplace Code ID: $MARKETPLACE_CODE_ID${NC}"
echo -e "${GREEN}Factory Code ID: $FACTORY_CODE_ID${NC}"
echo ""
echo -e "${GREEN}Marketplace Address: $MARKETPLACE_ADDR${NC}"
echo -e "${GREEN}Factory Address: $FACTORY_ADDR${NC}"
echo ""

# Save addresses to file
cat > deployed-contracts.json << EOF
{
  "chainId": "$CHAIN_ID",
  "cw721CodeId": $CW721_CODE_ID,
  "marketplaceCodeId": $MARKETPLACE_CODE_ID,
  "factoryCodeId": $FACTORY_CODE_ID,
  "marketplaceAddress": "$MARKETPLACE_ADDR",
  "factoryAddress": "$FACTORY_ADDR",
  "deployedAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF

echo "Addresses saved to deployed-contracts.json"
echo ""
echo "Update your .env files:"
echo "NEXT_PUBLIC_MARKETPLACE_ADDRESS=$MARKETPLACE_ADDR"
echo "NEXT_PUBLIC_FACTORY_ADDRESS=$FACTORY_ADDR"
