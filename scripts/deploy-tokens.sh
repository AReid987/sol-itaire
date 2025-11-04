#!/bin/bash

# Sol-itaire Token Deployment Script
# Deploys gaming token and memecoin to Solana devnet

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NETWORK="devnet"
GAMING_TOKEN_KEYPAIR="gaming-token-keypair.json"
MEMECOIN_KEYPAIR="memecoin-keypair.json"

# Token specifications
GAMING_TOKEN_SUPPLY="10000000000000000000"  # 10 billion tokens with 9 decimals
GAMING_TOKEN_NAME="Solitaire Gaming Token"
GAMING_TOKEN_SYMBOL="SOL-IT"

MEMECOIN_SUPPLY="100000000000000000000"  # 100 billion tokens with 9 decimals
MEMECOIN_NAME="Solitaire Memecoin"
MEMECOIN_SYMBOL="SOL-COIN"

echo -e "${BLUE}=== Sol-itaire Token Deployment Script ===${NC}"
echo -e "${BLUE}Deploying to Solana ${NETWORK}${NC}\n"

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

# Check if Solana CLI is installed
if ! command -v solana &> /dev/null; then
    echo -e "${RED}Error: Solana CLI not found. Please install it first.${NC}"
    exit 1
fi

# Check if Anchor CLI is installed
if ! command -v anchor &> /dev/null; then
    echo -e "${RED}Error: Anchor CLI not found. Please install it first.${NC}"
    exit 1
fi

# Check if keypair files exist
if [ ! -f "$GAMING_TOKEN_KEYPAIR" ]; then
    echo -e "${RED}Error: Gaming token keypair not found: $GAMING_TOKEN_KEYPAIR${NC}"
    exit 1
fi

if [ ! -f "$MEMECOIN_KEYPAIR" ]; then
    echo -e "${RED}Error: Memecoin keypair not found: $MEMECOIN_KEYPAIR${NC}"
    exit 1
fi

# Check current network
CURRENT_NETWORK=$(solana config get | grep "RPC URL" | awk '{print $3}')
if [[ "$CURRENT_NETWORK" != *"devnet"* ]]; then
    echo -e "${YELLOW}Warning: Not currently set to devnet. Switching to devnet...${NC}"
    solana config set --url devnet
fi

# Check wallet balance
echo -e "${YELLOW}Checking wallet balance...${NC}"
BALANCE=$(solana balance)
echo -e "${GREEN}Current balance: $BALANCE${NC}"

# Request airdrop if balance is less than 1 SOL
if [[ "$BALANCE" == *"0 SOL"* ]] || [[ "$BALANCE" == *"0.0"* ]]; then
    echo -e "${YELLOW}Requesting airdrop...${NC}"
    solana airdrop 1
fi

# Get wallet address
WALLET_ADDRESS=$(solana address)
echo -e "${GREEN}Using wallet: $WALLET_ADDRESS${NC}\n"

# Build programs
echo -e "${YELLOW}Building Anchor programs...${NC}"
anchor build

if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Failed to build programs${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Programs built successfully${NC}\n"

# Deploy gaming token program
echo -e "${YELLOW}Deploying Gaming Token program...${NC}"
GAMING_TOKEN_PROGRAM_ID=$(solana-keygen pubkey $GAMING_TOKEN_KEYPAIR)
echo -e "${BLUE}Gaming Token Program ID: $GAMING_TOKEN_PROGRAM_ID${NC}"

# Deploy memecoin program
echo -e "${YELLOW}Deploying Memecoin program...${NC}"
MEMECOIN_PROGRAM_ID=$(solana-keygen pubkey $MEMECOIN_KEYPAIR)
echo -e "${BLUE}Memecoin Program ID: $MEMECOIN_PROGRAM_ID${NC}"

# Deploy programs using Anchor
anchor deploy --provider.cluster $NETWORK

if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Failed to deploy programs${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Programs deployed successfully${NC}\n"

# Create deployment summary
echo -e "${BLUE}=== Deployment Summary ===${NC}"
echo -e "${GREEN}Network: $NETWORK${NC}"
echo -e "${GREEN}Gaming Token Program ID: $GAMING_TOKEN_PROGRAM_ID${NC}"
echo -e "${GREEN}Memecoin Program ID: $MEMECOIN_PROGRAM_ID${NC}"
echo -e "${GREEN}Wallet Address: $WALLET_ADDRESS${NC}"
echo -e "${GREEN}Gaming Token Supply: $GAMING_TOKEN_SUPPLY ($(($GAMING_TOKEN_SUPPLY / 1000000000))) tokens${NC}"
echo -e "${GREEN}Memecoin Supply: $MEMECOIN_SUPPLY ($(($MEMECOIN_SUPPLY / 1000000000))) tokens${NC}"

# Save deployment info to file
cat > deployment_info.json << EOF
{
  "network": "$NETWORK",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "gaming_token": {
    "program_id": "$GAMING_TOKEN_PROGRAM_ID",
    "name": "$GAMING_TOKEN_NAME",
    "symbol": "$GAMING_TOKEN_SYMBOL",
    "total_supply": "$GAMING_TOKEN_SUPPLY",
    "decimals": 9
  },
  "memecoin": {
    "program_id": "$MEMECOIN_PROGRAM_ID",
    "name": "$MEMECOIN_NAME",
    "symbol": "$MEMECOIN_SYMBOL",
    "total_supply": "$MEMECOIN_SUPPLY",
    "decimals": 9
  },
  "wallet_address": "$WALLET_ADDRESS"
}
EOF

echo -e "\n${GREEN}✓ Deployment completed successfully!${NC}"
echo -e "${GREEN}✓ Deployment info saved to deployment_info.json${NC}"

echo -e "\n${YELLOW}Next steps:${NC}"
echo -e "1. Initialize the token mints using the test scripts"
echo -e "2. Set up initial token distributions"
echo -e "3. Update frontend configuration with new program IDs"
echo -e "4. Test token functionality"

echo -e "\n${BLUE}=== Deployment Complete ===${NC}"