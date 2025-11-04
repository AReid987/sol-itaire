#!/bin/bash

# Mainnet Token Deployment Script for Sol-itaire
# This script deploys the gaming and memecoin to Solana mainnet

set -e

# Configuration
NETWORK="mainnet-beta"
RPC_URL="https://api.mainnet-beta.solana.com"

# Token configurations
GAMING_TOKEN_NAME="Solitaire Gaming Token"
GAMING_TOKEN_SYMBOL="SOL-IT"
MEMECOIN_NAME="Solitaire Memecoin"
MEMECOIN_SYMBOL="SOL-COIN"

# User's wallet (provided by user)
USER_WALLET="DvMuEKdXMaNfhm157hq36FNLKD1jRe6LrWV183b1Y7L1"

# Token supply (18.44 billion tokens for widespread distribution)
TOKEN_SUPPLY="18440000000000000000"

echo "🚀 Starting Mainnet Token Deployment for Sol-itaire"
echo "Network: $NETWORK"
echo "User Wallet: $USER_WALLET"
echo ""

# Check if Solana CLI is installed
if ! command -v solana &> /dev/null; then
    echo "❌ Solana CLI is not installed. Please install it first."
    exit 1
fi

# Check if wallet is configured
echo "📋 Checking wallet configuration..."
solana config get

# Set network to mainnet
echo "🔧 Setting network to mainnet..."
solana config set --url $RPC_URL

# Check wallet balance
echo "💰 Checking wallet balance..."
BALANCE=$(solana balance --output json | jq -r '.value')
if [ "$BALANCE" -lt 1000000000 ]; then
    echo "❌ Insufficient SOL balance. Please ensure you have at least 1 SOL for deployment."
    exit 1
fi
echo "✅ SOL balance: $(echo "scale=4; $BALANCE / 1000000000" | bc) SOL"

# Deploy Gaming Token
echo ""
echo "🎮 Deploying Gaming Token..."
GAMING_TOKEN_MINT=$(spl-token create-token \
    --name "$GAMING_TOKEN_NAME" \
    --symbol "$GAMING_TOKEN_SYMBOL" \
    --decimals 9 \
    --enable-metadata \
    --output json | jq -r '.address')

echo "✅ Gaming Token deployed: $GAMING_TOKEN_MINT"

# Create Gaming Token Account
echo "🏦 Creating Gaming Token account..."
GAMING_TOKEN_ACCOUNT=$(spl-token create-account $GAMING_TOKEN_MINT --output json | jq -r '.address')
echo "✅ Gaming Token account: $GAMING_TOKEN_ACCOUNT"

# Mint Gaming Tokens
echo "🪙 Minting Gaming Tokens..."
spl-token mint $GAMING_TOKEN_MINT $TOKEN_SUPPLY --output json
echo "✅ Gaming Tokens minted: $(echo "scale=2; $TOKEN_SUPPLY / 1000000000" | bc) tokens"

# Deploy Memecoin
echo ""
echo "🎯 Deploying Memecoin..."
MEMECOIN_MINT=$(spl-token create-token \
    --name "$MEMECOIN_NAME" \
    --symbol "$MEMECOIN_SYMBOL" \
    --decimals 9 \
    --enable-metadata \
    --output json | jq -r '.address')

echo "✅ Memecoin deployed: $MEMECOIN_MINT"

# Create Memecoin Account
echo "🏦 Creating Memecoin account..."
MEMECOIN_ACCOUNT=$(spl-token create-account $MEMECOIN_MINT --output json | jq -r '.address')
echo "✅ Memecoin account: $MEMECOIN_ACCOUNT"

# Mint Memecoins
echo "🪙 Minting Memecoins..."
spl-token mint $MEMECOIN_MINT $TOKEN_SUPPLY --output json
echo "✅ Memecoins minted: $(echo "scale=2; $TOKEN_SUPPLY / 1000000000" | bc) tokens"

# Transfer initial tokens to user wallet
echo ""
echo "🎁 Transferring initial tokens to user wallet..."

# Transfer 1 billion Gaming Tokens to user
INITIAL_SUPPLY="1000000000000000000"
spl-token transfer $GAMING_TOKEN_MINT $INITIAL_SUPPLY $USER_WALLET --output json
echo "✅ Transferred 1 billion Gaming Tokens to $USER_WALLET"

# Transfer 1 billion Memecoins to user
spl-token transfer $MEMECOIN_MINT $INITIAL_SUPPLY $USER_WALLET --output json
echo "✅ Transferred 1 billion Memecoins to $USER_WALLET"

# Create deployment summary
echo ""
echo "📄 DEPLOYMENT SUMMARY"
echo "===================="
echo "Network: $NETWORK"
echo "User Wallet: $USER_WALLET"
echo ""
echo "Gaming Token:"
echo "  Name: $GAMING_TOKEN_NAME"
echo "  Symbol: $GAMING_TOKEN_SYMBOL"
echo "  Mint Address: $GAMING_TOKEN_MINT"
echo "  Initial Supply: 18.44 billion tokens"
echo "  User Allocation: 1 billion tokens"
echo ""
echo "Memecoin:"
echo "  Name: $MEMECOIN_NAME"
echo "  Symbol: $MEMECOIN_SYMBOL"
echo "  Mint Address: $MEMECOIN_MINT"
echo "  Initial Supply: 18.44 billion tokens"
echo "  User Allocation: 1 billion tokens"
echo ""

# Update environment file
echo "📝 Updating environment configuration..."
cat > .env.mainnet << EOF
# Solana Network Configuration (MAINNET)
NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# Token Mint Addresses (deployed on mainnet)
NEXT_PUBLIC_GAMING_TOKEN_MINT=$GAMING_TOKEN_MINT
NEXT_PUBLIC_MEMECOIN_MINT=$MEMECOIN_MINT

# Smart Contract Addresses (mainnet)
NEXT_PUBLIC_GAME_PROGRAM_ID=
NEXT_PUBLIC_TOKEN_PROGRAM_ID=
NEXT_PUBLIC_MEMECOIN_PROGRAM_ID=

# Game Configuration
NEXT_PUBLIC_MIN_STAKE=1
NEXT_PUBLIC_MAX_STAKE=10000
NEXT_PUBLIC_REWARD_MULTIPLIER=2

# Feature Flags
NEXT_PUBLIC_ENABLE_LEADERBOARD=true
NEXT_PUBLIC_ENABLE_TOURNAMENTS=false
NEXT_PUBLIC_ENABLE_NFTS=false

# Analytics (optional)
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=
NEXT_PUBLIC_SENTRY_DSN=

# API Configuration
API_BASE_URL=https://sol-itaire.vercel.app/api
WEBSOCKET_URL=wss://sol-itaire.vercel.app

# Security
JWT_SECRET=your-super-secret-jwt-key-here
CORS_ORIGIN=https://sol-itaire.vercel.app
EOF

echo "✅ Environment configuration updated"

# Instructions for next steps
echo ""
echo "🚀 NEXT STEPS"
echo "=============="
echo "1. Add tokens to Phantom Wallet:"
echo "   - Gaming Token: $GAMING_TOKEN_MINT"
echo "   - Memecoin: $MEMECOIN_MINT"
echo ""
echo "2. Set up DEX liquidity pools on Jupiter/Serum"
echo "3. Configure token purchase mechanism"
echo "4. Deploy smart contracts for game functionality"
echo "5. Update Vercel environment variables"
echo ""
echo "🎉 Mainnet deployment completed successfully!"
echo "🌐 Your app will be available at: https://sol-itaire.vercel.app"