# Sol-itaire Token Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the Sol-itaire gaming token and memecoin on Solana devnet. The deployment includes two token contracts with specific functionality for the game ecosystem.

## Token Specifications

### Gaming Token (SOL-IT)
- **Purpose**: For staking and game participation
- **Total Supply**: 10 billion tokens
- **Decimals**: 9
- **Symbol**: SOL-IT
- **Name**: Solitaire Gaming Token
- **Features**: Staking, rewards, game participation

### Memecoin (SOL-COIN)
- **Purpose**: For rewards and community engagement
- **Total Supply**: 100 billion tokens
- **Decimals**: 9
- **Symbol**: SOL-COIN
- **Name**: Solitaire Memecoin
- **Features**: Game rewards, airdrops, community incentives

## Prerequisites

1. **Solana CLI**: Version 1.16.0 or later
2. **Anchor CLI**: Version 0.29.0 or later
3. **Node.js**: Version 16 or later
4. **Rust**: Latest stable version
5. **SOL Balance**: At least 1 SOL for deployment fees

## Environment Setup

### 1. Install Solana CLI
```bash
sh -c "$(curl -sSfL https://release.solana.com/v1.16.0/install)"
```

### 2. Install Anchor CLI
```bash
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest
```

### 3. Configure Solana for Devnet
```bash
solana config set --url devnet
solana config get
```

### 4. Create or Import Wallet
```bash
# Create new wallet
solana-keygen new --no-bip39-passphrase

# Or import existing wallet
# Place your keypair at ~/.config/solana/id.json
```

### 5. Get SOL for Deployment
```bash
solana airdrop 1
solana balance
```

## Project Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd sol-itaire
```

### 2. Install Dependencies
```bash
npm install
# or
pnpm install
```

### 3. Generate Program Keypairs
```bash
solana-keygen new --no-bip39-passphrase --silent --outfile gaming-token-keypair.json
solana-keygen new --no-bip39-passphrase --silent --outfile memecoin-keypair.json
```

### 4. Update Configuration
Update `Anchor.toml` with the new program IDs:
```toml
[programs.devnet]
gaming_token = "GAMING_TOKEN_PROGRAM_ID"
memecoin = "MEMECOIN_PROGRAM_ID"
```

Update the `declare_id!` macros in the programs:
- `programs/gaming-token/src/lib.rs`
- `programs/memecoin/src/lib.rs`

## Deployment Steps

### 1. Build Programs
```bash
anchor build
```

### 2. Deploy Programs
```bash
# Using the deployment script
./scripts/deploy-tokens.sh

# Or manually
anchor deploy --provider.cluster devnet
```

### 3. Initialize Tokens
```bash
# Install test dependencies
npm install --save-dev @coral-xyz/anchor @solana/web3.js @solana/spl-token typescript ts-node

# Run token initialization
npx ts-node tests/token-initialization.ts
```

## Post-Deployment Configuration

### 1. Token Metadata
Set up token metadata for both tokens using Solana's token metadata program.

### 2. Initial Distribution
The memecoin contract automatically distributes tokens to:
- Game Rewards Pool (40%)
- Liquidity Pool (30%)
- Team Allocation (20%)
- Community/Airdrop (10%)

### 3. Frontend Integration
Update the frontend configuration with the new program IDs and mint addresses.

## Testing

### 1. Token Minting
Test the ability to mint new tokens using the gaming token contract.

### 2. Token Staking
Test the staking functionality of the gaming token.

### 3. Token Transfers
Test basic token transfers between accounts.

### 4. Reward Distribution
Test the memecoin reward distribution system.

## Monitoring and Maintenance

### 1. Program Monitoring
Monitor the deployed programs for any issues or unusual activity.

### 2. Token Supply Tracking
Keep track of token supply and distribution.

### 3. Upgrade Path
Plan for future upgrades and improvements to the token contracts.

## Security Considerations

1. **Private Key Security**: Ensure all private keys are stored securely.
2. **Program Security**: Regular security audits of the smart contracts.
3. **Access Control**: Implement proper access controls for minting and admin functions.
4. **Upgrade Authority**: Securely manage the upgrade authority for programs.

## Troubleshooting

### Common Issues

1. **Insufficient SOL**: Request more airdrop if balance is too low.
2. **Build Failures**: Check Rust and Node.js versions are compatible.
3. **Deployment Failures**: Verify program IDs match between configuration and code.
4. **Transaction Failures**: Check account balances and transaction fees.

### Error Messages

- **Account Not Found**: Ensure all required accounts are created before transactions.
- **Invalid Program ID**: Verify program IDs are correctly set in configuration.
- **Insufficient Funds**: Check wallet balance and transaction fees.

## Integration Guide

### Frontend Integration
1. Add program IDs to frontend configuration
2. Update token addresses in the UI
3. Implement token display and transaction handling
4. Add staking and reward interfaces

### Backend Integration
1. Update API endpoints with new token addresses
2. Implement transaction monitoring
3. Add token balance tracking
4. Set up reward distribution logic

## Contact and Support

For support and questions:
- Check the project documentation
- Review the test files for implementation examples
- Monitor the deployed programs on Solana Explorer

## Next Steps

After successful deployment:
1. Test all token functionalities thoroughly
2. Set up monitoring and alerting
3. Prepare for mainnet deployment
4. Document any custom configurations
5. Plan for community engagement and token distribution

---

**Note**: This deployment is for devnet testing. For mainnet deployment, additional security measures and thorough testing are required.