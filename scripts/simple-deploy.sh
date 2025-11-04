#!/bin/bash

# Simple Token Deployment Script for Sol-itaire
# Uses basic Solana commands to deploy tokens

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== Sol-itaire Simple Token Deployment ===${NC}"

# Configuration
NETWORK="devnet"
GAMING_TOKEN_PROGRAM_ID="DhkqYC1mAnZ41dgPz6NDLovGM6zxE1j7wHLBAizYkNB8"
MEMECOIN_PROGRAM_ID="A1WF2rG5Vs5tG6nhq2ZeDEN9hyESrWV3dtyq1XdBWkqT"

# Token specifications
GAMING_TOKEN_NAME="Solitaire Gaming Token"
GAMING_TOKEN_SYMBOL="SOL-IT"
GAMING_TOKEN_DECIMALS=9

MEMECOIN_NAME="Solitaire Memecoin"
MEMECOIN_SYMBOL="SOL-COIN"
MEMECOIN_DECIMALS=9

echo -e "${YELLOW}Checking prerequisites...${NC}"

# Check network
solana config set --url devnet

# Check balance
echo -e "${YELLOW}Current balance:${NC}"
solana balance

# Get wallet address
WALLET_ADDRESS=$(solana address)
echo -e "${GREEN}Wallet: $WALLET_ADDRESS${NC}"

# Request airdrop if needed
BALANCE=$(solana balance | grep -o '[0-9.]*' | head -1)
if (( $(echo "$BALANCE < 0.5" | bc -l) )); then
    echo -e "${YELLOW}Requesting airdrop...${NC}"
    solana airdrop 1
fi

echo -e "\n${YELLOW}Creating Token Mints...${NC}"

# Create Gaming Token Mint
echo -e "${BLUE}Creating Gaming Token mint...${NC}"
GAMING_TOKEN_MINT=$(solana create-token --program-id $GAMING_TOKEN_PROGRAM_ID --decimals $GAMING_TOKEN_DECIMALS --enable-freeze | grep -o '[A-Za-z0-9]{44}')
echo -e "${GREEN}Gaming Token Mint: $GAMING_TOKEN_MINT${NC}"

# Create Memecoin Mint
echo -e "${BLUE}Creating Memecoin mint...${NC}"
MEMECOIN_MINT=$(solana create-token --program-id $MEMECOIN_PROGRAM_ID --decimals $MEMECOIN_DECIMALS --enable-freeze | grep -o '[A-Za-z0-9]{44}')
echo -e "${GREEN}Memecoin Mint: $MEMECOIN_MINT${NC}"

echo -e "\n${YELLOW}Creating Token Accounts...${NC}"

# Create Gaming Token Account
echo -e "${BLUE}Creating Gaming Token account...${NC}"
GAMING_TOKEN_ACCOUNT=$(solana create-token-account --mint $GAMING_TOKEN_MINT --owner $WALLET_ADDRESS | grep -o '[A-Za-z0-9]{44}')
echo -e "${GREEN}Gaming Token Account: $GAMING_TOKEN_ACCOUNT${NC}"

# Create Memecoin Account
echo -e "${BLUE}Creating Memecoin account...${NC}"
MEMECOIN_ACCOUNT=$(solana create-token-account --mint $MEMECOIN_MINT --owner $WALLET_ADDRESS | grep -o '[A-Za-z0-9]{44}')
echo -e "${GREEN}Memecoin Account: $MEMECOIN_ACCOUNT${NC}"

echo -e "\n${YELLOW}Minting Tokens...${NC}"

# Mint Gaming Tokens (10 billion = 10,000,000,000,000,000,000 with 9 decimals)
GAMING_TOKEN_SUPPLY=10000000000000000000
echo -e "${BLUE}Minting $GAMING_TOKEN_SUPPLY Gaming Tokens...${NC}"
solana mint --mint $GAMING_TOKEN_MINT --mint-authority $WALLET_ADDRESS $GAMING_TOKEN_SUPPLY

# Mint Memecoins (100 billion = 100,000,000,000,000,000,000 with 9 decimals)
MEMECOIN_SUPPLY=100000000000000000000
echo -e "${BLUE}Minting $MEMECOIN_SUPPLY Memecoins...${NC}"
solana mint --mint $MEMECOIN_MINT --mint-authority $WALLET_ADDRESS $MEMECOIN_SUPPLY

echo -e "\n${YELLOW}Verifying Token Supplies...${NC}"

# Check Gaming Token Supply
GAMING_TOKEN_BALANCE=$(solana account $GAMING_TOKEN_ACCOUNT | grep -A 5 'Token amount' | grep -o '[0-9]*')
echo -e "${GREEN}Gaming Token Balance: $GAMING_TOKEN_BALANCE${NC}"

# Check Memecoin Supply
MEMECOIN_BALANCE=$(solana account $MEMECOIN_ACCOUNT | grep -A 5 'Token amount' | grep -o '[0-9]*')
echo -e "${GREEN}Memecoin Balance: $MEMECOIN_BALANCE${NC}"

echo -e "\n${YELLOW}Saving deployment information...${NC}"

# Save deployment info
cat > simple-deployment-info.json << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "network": "$NETWORK",
  "wallet_address": "$WALLET_ADDRESS",
  "gaming_token": {
    "program_id": "$GAMING_TOKEN_PROGRAM_ID",
    "mint": "$GAMING_TOKEN_MINT",
    "account": "$GAMING_TOKEN_ACCOUNT",
    "name": "$GAMING_TOKEN_NAME",
    "symbol": "$GAMING_TOKEN_SYMBOL",
    "decimals": $GAMING_TOKEN_DECIMALS,
    "supply": "$GAMING_TOKEN_SUPPLY"
  },
  "memecoin": {
    "program_id": "$MEMECOIN_PROGRAM_ID",
    "mint": "$MEMECOIN_MINT",
    "account": "$MEMECOIN_ACCOUNT",
    "name": "$MEMECOIN_NAME",
    "symbol": "$MEMECOIN_SYMBOL",
    "decimals": $MEMECOIN_DECIMALS,
    "supply": "$MEMECOIN_SUPPLY"
  }
}
EOF

echo -e "\n${BLUE}=== Deployment Summary ===${NC}"
echo -e "${GREEN}✓ Gaming Token deployed!${NC}"
echo -e "   Mint: $GAMING_TOKEN_MINT"
echo -e "   Account: $GAMING_TOKEN_ACCOUNT"
echo -e "   Program: $GAMING_TOKEN_PROGRAM_ID"

echo -e "${GREEN}✓ Memecoin deployed!${NC}"
echo -e "   Mint: $MEMECOIN_MINT"
echo -e "   Account: $MEMECOIN_ACCOUNT"
echo -e "   Program: $MEMECOIN_PROGRAM_ID"

echo -e "\n${GREEN}✓ Deployment completed successfully!${NC}"
echo -e "${GREEN}✓ Info saved to simple-deployment-info.json${NC}"

echo -e "\n${YELLOW}Next steps:${NC}"
echo -e "1. Test token transfers"
echo -e "2. Set up token metadata (name, symbol, image)"
echo -e "3. Update frontend configuration"
echo -e "4. Create liquidity pools"
echo -e "5. Set up staking functionality"

echo -e "\n${BLUE}Explore on Solscan:${NC}"
echo -e "Gaming Token: https://solscan.io/token/$GAMING_TOKEN_MINT?cluster=devnet"
echo -e "Memecoin: https://solscan.io/token/$MEMECOIN_MINT?cluster=devnet"

echo -e "\n${BLUE}=== Simple Deployment Complete ===${NC}"