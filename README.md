# Sol-itaire: Solana-based Solitaire with Crypto Integration

A modern web application that combines the classic Solitaire card game with blockchain technology, built on the Solana network. Players can stake tokens, play games, and earn crypto rewards.

## 🎮 Features

- **Classic Solitaire Gameplay**: Full-featured Klondike Solitaire with drag-and-drop interface
- **Web3 Integration**: Connect your Solana wallet (Phantom, Solflare, etc.)
- **Token Staking**: Stake gaming tokens to play and earn rewards
- **Play-to-Earn**: Win games to earn memecoin rewards
- **Smart Contract Security**: Secure on-chain game logic and reward distribution
- **Real-time Stats**: Track your performance, earnings, and leaderboard position
- **Responsive Design**: Beautiful UI that works on desktop and mobile

## 🏗️ Architecture

### Monorepo Structure

```
sol-itaire/
├── packages/
│   ├── types/          # Shared TypeScript types
│   └── utils/          # Utility functions
├── programs/
│   ├── solitaire/      # Main game logic smart contract
│   ├── gaming-token/   # SPL token for staking
│   └── memecoin/       # Reward memecoin contract
├── apps/
│   └── web/           # Next.js frontend application
└── scripts/           # Deployment and utility scripts
```

### Smart Contracts

1. **Solitaire Game Contract** (`programs/solitaire/`)
   - Game state management
   - Move validation and execution
   - Stake handling and reward distribution
   - Game completion logic

2. **Gaming Token Contract** (`programs/gaming-token/`)
   - SPL token implementation
   - Staking mechanism with APY rewards
   - Token minting and burning

3. **Memecoin Contract** (`programs/memecoin/`)
   - Reward token distribution
   - Airdrop functionality
   - Community and team allocation management

### Frontend Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Web3**: Solana Wallet Adapter
- **State Management**: Zustand
- **Animations**: Framer Motion

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and pnpm
- Solana CLI and Anchor Framework
- Rust toolchain for smart contracts

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/sol-itaire.git
   cd sol-itaire
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Build the project**
   ```bash
   pnpm build
   ```

### Development

1. **Start local Solana validator**
   ```bash
   solana-test-validator
   ```

2. **Deploy smart contracts (local)**
   ```bash
   pnpm build:programs
   pnpm deploy:programs
   ```

3. **Start the frontend**
   ```bash
   pnpm dev:web
   ```

4. **Access the application**
   Open http://localhost:3000 in your browser

## 🎯 Game Mechanics

### Staking System

- Players stake `GAME` tokens to start a game
- Minimum stake: 1 GAME token
- Maximum stake: 10,000 GAME tokens
- Staked tokens are held in escrow during gameplay

### Reward Structure

- **Win**: 2x stake returned + memecoin bonus
- **Complete**: 50% stake returned
- **Abandon**: 90% stake returned (after 24-hour cooldown)
- **Daily Bonuses**: Extra memecoin rewards for consecutive wins

### Smart Contract Integration

- All game moves are validated on-chain
- Stakes and rewards are handled by smart contracts
- Secure and transparent reward distribution
- Anti-cheat mechanisms built into contract logic

## 🔒 Security Features

- **Input Validation**: Comprehensive validation of all user inputs
- **Rate Limiting**: Protection against spam and abuse
- **Error Handling**: Robust error boundaries and recovery
- **Secure Headers**: Content Security Policy and other security headers
- **Smart Contract Audits**: Professional audit of all contracts (planned)

## 🛠️ Development Commands

```bash
# Build all packages
pnpm build

# Run tests
pnpm test

# Lint code
pnpm lint

# Type checking
pnpm type-check

# Clean build artifacts
pnpm clean

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Deploy to mainnet-beta
anchor deploy --provider.cluster mainnet-beta
```

## 📦 Smart Contract Deployment

### Local Development

```bash
# Build programs
anchor build

# Start local validator
solana-test-validator

# Deploy to local
anchor deploy
```

### Devnet Deployment

```bash
# Set devnet configuration
solana config set --url devnet

# Deploy to devnet
anchor deploy --provider.cluster devnet
```

### Mainnet Deployment

```bash
# Set mainnet configuration
solana config set --url mainnet-beta

# Deploy to mainnet (requires careful testing)
anchor deploy --provider.cluster mainnet-beta
```

## 🎨 UI Components

### Game Board

- **Card Components**: Interactive playing cards with animations
- **Pile Components**: Visual representations of tableau, foundation, stock, and waste piles
- **Drag and Drop**: Smooth card movement with visual feedback
- **Game Controls**: New game, undo, hint functionality

### Wallet Integration

- **Multi-Wallet Support**: Phantom, Solflare, Backpack, Coinbase
- **Connection Management**: Automatic reconnection and state persistence
- **Transaction Signing**: Secure transaction handling with user confirmation

### Statistics Dashboard

- **Game History**: Detailed record of all played games
- **Performance Metrics**: Win rate, best times, earnings
- **Leaderboard**: Global ranking system (planned)

## 🔧 Configuration

### Environment Variables

```env
# Solana Configuration
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com

# Program IDs
NEXT_PUBLIC_GAME_PROGRAM_ID=Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS
NEXT_PUBLIC_GAMING_TOKEN_MINT=YOUR_GAMING_TOKEN_MINT
NEXT_PUBLIC_MEMECOIN_MINT=YOUR_MEMECOIN_MINT

# Feature Flags
NEXT_PUBLIC_ENABLE_LEADERBOARD=true
NEXT_PUBLIC_ENABLE_TOURNAMENTS=false
```

## 🧪 Testing

### Smart Contract Tests

```bash
# Run Anchor tests
anchor test

# Run with specific validator
anchor test --skip-local-validator
```

### Frontend Tests

```bash
# Run unit tests
pnpm test

# Run integration tests
pnpm test:e2e

# Run with coverage
pnpm test --coverage
```

## 📈 Monitoring & Analytics

- **Error Tracking**: Integration with error monitoring services
- **Performance Monitoring**: Web3 transaction success rates and latency
- **User Analytics**: Game completion rates and engagement metrics
- **Blockchain Analytics**: On-chain activity monitoring

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript and Rust best practices
- Write comprehensive tests for new features
- Ensure all smart contracts are thoroughly tested
- Update documentation for API changes
- Follow the established code style and patterns

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Comprehensive guides in the `/docs` directory
- **Issues**: Report bugs and request features on GitHub Issues
- **Discord**: Join our community for support and discussion
- **Twitter**: Follow for updates and announcements

## 🗺️ Roadmap

### Phase 1 (Current)
- [x] Basic Solitaire gameplay
- [x] Wallet integration
- [x] Token staking and rewards
- [x] Smart contract deployment

### Phase 2 (Q1 2024)
- [ ] Tournament system
- [ ] Advanced statistics
- [ ] Mobile app
- [ ] NFT card collections

### Phase 3 (Q2 2024)
- [ ] Multiplayer modes
- [ ] Advanced game variants
- [ ] Governance features
- [ ] Cross-chain compatibility

## ⚠️ Disclaimer

This software is provided as-is for educational and entertainment purposes. Cryptocurrency gaming involves financial risk. Please play responsibly and never stake more than you can afford to lose.

The smart contracts have not been audited by a third party. Use at your own risk.

---

Built with ❤️ by the Sol-itaire team on Solana 🚀