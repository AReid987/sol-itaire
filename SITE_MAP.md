# Sol-itaire Site Map

> Complete navigation structure and feature map for the Sol-itaire platform — a Solana-based Solitaire game with crypto integration.

## Table of Contents

- [Overview](#overview)
- [Frontend Routes](#frontend-routes)
- [Backend API](#backend-api)
- [Smart Contracts](#smart-contracts)
- [Feature Matrix](#feature-matrix)
- [User Flows](#user-flows)
- [Navigation Structure](#navigation-structure)

---

## Overview

Sol-itaire is a full-stack Web3 gaming platform with three main layers:

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | Next.js 15, React 18, Tailwind CSS | User interface and game rendering |
| **Backend** | Express.js, Node.js | API, auth, game state, leaderboards |
| **Blockchain** | Solana, Anchor, Rust | Smart contracts, tokens, on-chain logic |

---

## Frontend Routes

### Page Structure

```
/                           # Landing page (unauthenticated) / Game dashboard (authenticated)
├── /api                    # API documentation endpoint
└── [Future Routes]
    ├── /profile            # User profile page
    ├── /leaderboard        # Global leaderboard
    ├── /history            # Game history
    ├── /wallet             # Wallet management
    ├── /rewards            # Rewards center
    ├── /tournament         # Tournament mode
    └── /settings           # User settings
```

### Current Implementation

#### `/` — Main Page

**Unauthenticated State:**
- Hero section with rotating gradient logo
- "Welcome to Sol-itaire" title with gradient text
- Wallet connection CTA
- Getting started steps (Connect Wallet → Get Tokens → Play & Earn)
- Supported wallet badges (Phantom, Solflare, Backpack, Coinbase)
- Feature cards (Classic Solitaire, Play-to-Earn, Compete & Win)

**Authenticated State:**
- Header with logo, token balances, wallet button
- Game statistics dashboard
- Game board (when game started)
- Start game CTA (when no active game)
- Footer with copyright and disclaimer

---

## Backend API

### Base URL

```
/api/v1
```

### Authentication

```
POST   /api/v1/auth/wallet          # Authenticate with Solana wallet signature
POST   /api/v1/auth/username        # Set username for authenticated user
POST   /api/v1/auth/refresh         # Refresh access token
POST   /api/v1/auth/logout          # Logout (invalidate token)
```

### Users

```
GET    /api/v1/users/me              # Get current user profile
PUT    /api/v1/users/me              # Update current user profile
GET    /api/v1/users/:id             # Get user profile by ID (public)
GET    /api/v1/users/:id/stats       # Get user game statistics
GET    /api/v1/users                 # Search users (paginated)
```

### Games

```
POST   /api/v1/games                 # Create a new game (with stake)
GET    /api/v1/games/:id             # Get game by ID
PUT    /api/v1/games/:id             # Update game state (moves)
POST   /api/v1/games/:id/complete    # Complete a game (win/lose/abandon)
GET    /api/v1/games                 # Get user's games (paginated, filtered)
```

### Leaderboard

```
GET    /api/v1/leaderboard           # Get global leaderboard
GET    /api/v1/leaderboard/user/:id  # Get user's rank and position
```

**Query Parameters:**
- `period`: `daily` | `weekly` | `monthly` | `all_time`
- `limit`: 1-100 (default: 50)
- `offset`: 0+ (default: 0)
- `sort_by`: `wins` | `win_rate` | `earnings` | `games`

### Transactions

```
GET    /api/v1/transactions          # Get user's transactions
GET    /api/v1/transactions/:id      # Get transaction by ID
GET    /api/v1/transactions/public/:walletAddress  # Public wallet transactions
GET    /api/v1/transactions/stats    # Get transaction statistics
POST   /api/v1/transactions/verify   # Verify transaction on-chain
```

### Statistics

```
GET    /api/v1/stats/overview        # Global statistics overview
GET    /api/v1/stats/games           # Detailed game statistics
GET    /api/v1/stats/transactions    # Transaction statistics
```

**Query Parameters:**
- `period`: `hour` | `day` | `week` | `month` | `all_time`
- `limit`: 1-1000 (default: 100)

### Health

```
GET    /health                       # Server health check
GET    /api                          # API documentation
```

---

## Smart Contracts

### 1. Solitaire Game Program

**Program ID:** `Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS`

#### Instructions

| Instruction | Description | Accounts |
|-------------|-------------|----------|
| `initialize_game` | Create new game with stake | Player, Game Account, Token Accounts |
| `make_move` | Execute a card move | Player, Game Account |
| `complete_game` | Finalize game (win/lose) | Player, Game Account, Token Accounts |
| `withdraw_stake` | Withdraw stake after cooldown | Player, Game Account, Token Accounts |

#### Account Structures

```rust
GameAccount {
    player: Pubkey,           // Player's wallet
    game_id: String,          // Unique game identifier
    stake_amount: u64,        // Staked GAME tokens
    status: GameStatus,       // Active, Won, Lost, Abandoned
    game_state: GameState,    // Full game state (piles, cards)
    created_at: i64,          // Unix timestamp
    completed_at: Option<i64>, // Unix timestamp
}

GameStatus {
    Active,
    Won,
    Lost,
    Abandoned,
}

GameState {
    tableau: Vec<PileData>,   // 7 tableau piles
    foundation: Vec<PileData>, // 4 foundation piles
    stock: PileData,          // Stock pile
    waste: PileData,          // Waste pile
    moves: u32,               // Move counter
    score: u32,               // Current score
}
```

#### Events

| Event | Emitted When |
|-------|--------------|
| `GameStarted` | New game initialized |
| `MoveMade` | Valid move executed |
| `GameCompleted` | Game finished (win/lose) |
| `StakeWithdrawn` | Stake withdrawn by player |

#### Error Codes

| Code | Description |
|------|-------------|
| `GameNotActive` | Game is not in active state |
| `InvalidMove` | Move violates game rules |
| `InsufficientStake` | Not enough tokens staked |
| `GameAlreadyCompleted` | Game already finished |
| `CooldownNotElapsed` | 24-hour cooldown not met |
| `UnauthorizedPlayer` | Not the game's player |

---

### 2. Gaming Token Program

**Program ID:** `DhkqYC1mAnZ41dgPz6NDLovGM6zxE1j7wHLBAizYkNB8`

#### Instructions

| Instruction | Description | Accounts |
|-------------|-------------|----------|
| `initialize_mint` | Create GAME token mint | Authority, Mint |
| `mint_tokens` | Mint new GAME tokens | Authority, Mint, Recipient |
| `stake_tokens` | Stake GAME tokens | Player, Stake Account, Token Accounts |
| `unstake_tokens` | Unstake GAME tokens | Player, Stake Account, Token Accounts |
| `claim_rewards` | Claim staking rewards | Player, Stake Account, Token Accounts |

#### Account Structures

```rust
MintConfig {
    authority: Pubkey,        // Mint authority
    mint: Pubkey,             // Token mint address
    total_supply: u64,        // Total minted supply
    decimals: u8,             // Token decimals
}

StakeAccount {
    owner: Pubkey,            // Staker's wallet
    amount: u64,              // Staked amount
    stake_timestamp: i64,     // When staked
    last_claim: i64,          // Last reward claim
    apy_basis_points: u16,    // APY in basis points (e.g., 500 = 5%)
}
```

#### Events

| Event | Emitted When |
|-------|--------------|
| `MintInitialized` | Token mint created |
| `TokensMinted` | New tokens minted |
| `TokensStaked` | Tokens staked |
| `TokensUnstaked` | Tokens unstaked |
| `RewardsClaimed` | Staking rewards claimed |

#### Error Codes

| Code | Description |
|------|-------------|
| `InsufficientBalance` | Not enough tokens |
| `InsufficientStake` | Stake amount too low |
| `StakeNotFound` | No stake account exists |
| `RewardsNotAvailable` | No rewards to claim |
| `Unauthorized` | Not the account owner |

---

### 3. Memecoin Reward Program

**Program ID:** `A1WF2rG5Vs5tG6nhq2ZeDEN9hyESrWV3dtyq1XdBWkqT`

#### Instructions

| Instruction | Description | Accounts |
|-------------|-------------|----------|
| `initialize_memecoin` | Create memecoin token | Authority, Mint |
| `distribute_initial_supply` | Distribute initial allocation | Authority, Token Accounts |
| `distribute_game_rewards` | Send rewards for game win | Game Account, Player, Token Accounts |
| `claim_airdrop` | Claim available airdrop | Player, Airdrop Account, Token Accounts |
| `setup_airdrop_account` | Create airdrop allocation | Authority, Airdrop Account |

#### Account Structures

```rust
MemecoinConfig {
    authority: Pubkey,        // Admin authority
    mint: Pubkey,             // Memecoin mint
    total_distributed: u64,   // Total distributed
    reward_per_game: u64,     // Base reward per win
    bonus_multiplier: u16,    // Bonus for streaks
}

RewardAccount {
    player: Pubkey,           // Player's wallet
    total_earned: u64,        // Total rewards earned
    games_won: u32,           // Games won count
    current_streak: u32,      // Current win streak
    last_reward: i64,         // Last reward timestamp
}

AirdropAccount {
    recipient: Pubkey,        // Airdrop recipient
    amount: u64,              // Airdrop amount
    claimed: bool,            // Whether claimed
    expiry: i64,              // Expiry timestamp
}
```

#### Token Distribution

| Allocation | Percentage | Purpose |
|------------|------------|---------|
| Game Rewards | 40% | Win rewards, daily bonuses |
| Community Airdrop | 25% | Early adopters, community |
| Liquidity Pool | 20% | DEX liquidity |
| Team | 10% | Team allocation (vested) |
| Marketing | 5% | Partnerships, promotions |

#### Events

| Event | Emitted When |
|-------|--------------|
| `MemecoinInitialized` | Memecoin created |
| `InitialSupplyDistributed` | Initial allocation sent |
| `GameRewardDistributed` | Game win reward sent |
| `AirdropAccountSetup` | Airdrop allocation created |
| `AirdropClaimed` | Airdrop claimed by user |

---

## Feature Matrix

### Core Features

| Feature | Frontend | Backend | Smart Contract | Status |
|---------|----------|---------|----------------|--------|
| **Wallet Connection** | ✅ | ✅ | ✅ | Complete |
| **Wallet Authentication** | ✅ | ✅ | ✅ | Complete |
| **Username Setting** | ✅ | ✅ | — | Complete |
| **Solitaire Gameplay** | ✅ | ✅ | ✅ | Complete |
| **Card Drag & Drop** | ✅ | — | — | Complete |
| **Game State Management** | ✅ | ✅ | ✅ | Complete |
| **Move Validation** | ✅ | ✅ | ✅ | Complete |
| **Token Staking** | ✅ | ✅ | ✅ | Complete |
| **Game Completion** | ✅ | ✅ | ✅ | Complete |
| **Reward Distribution** | ✅ | ✅ | ✅ | Complete |
| **Token Balance Display** | ✅ | ✅ | ✅ | Complete |
| **Game Statistics** | ✅ | ✅ | — | Complete |
| **Leaderboard** | — | ✅ | — | Complete |
| **Transaction History** | — | ✅ | — | Complete |

### Game Features

| Feature | Description | Status |
|---------|-------------|--------|
| **Klondike Solitaire** | Classic 7-pile solitaire | ✅ Complete |
| **Stock Pile** | Draw cards from stock | ✅ Complete |
| **Waste Pile** | Discard pile | ✅ Complete |
| **Foundation Piles** | 4 suit foundation piles | ✅ Complete |
| **Tableau Piles** | 7 cascading piles | ✅ Complete |
| **Card Movement** | Drag and drop cards | ✅ Complete |
| **Auto-Complete** | Auto-move to foundation | 🔄 Planned |
| **Undo Moves** | Reverse last move | 🔄 Planned |
| **Hint System** | Suggest valid moves | 🔄 Planned |
| **Game Timer** | Track play time | ✅ Complete |
| **Score System** | Calculate score | ✅ Complete |
| **Win Detection** | Check win condition | ✅ Complete |

### Token Features

| Feature | Description | Status |
|---------|-------------|--------|
| **GAME Token** | SPL token for staking | ✅ Complete |
| **MEME Token** | Reward memecoin | ✅ Complete |
| **Token Staking** | Stake GAME to play | ✅ Complete |
| **Stake Escrow** | Hold stake during game | ✅ Complete |
| **Win Rewards** | 2x stake + memecoin | ✅ Complete |
| **Partial Rewards** | 50% stake on completion | ✅ Complete |
| **Abandon Penalty** | 90% stake after cooldown | ✅ Complete |
| **Daily Bonuses** | Consecutive win bonuses | 🔄 Planned |
| **Staking APY** | Earn yield on staked tokens | ✅ Complete |
| **Airdrop Claims** | Claim community airdrops | ✅ Complete |

### Social Features

| Feature | Description | Status |
|---------|-------------|--------|
| **Global Leaderboard** | Rank by wins/earnings | ✅ Complete |
| **User Profiles** | Public player profiles | ✅ Complete |
| **Game History** | Past game records | ✅ Complete |
| **User Search** | Find players | ✅ Complete |
| **Tournament Mode** | Competitive events | 🔄 Planned |
| **Friends System** | Add friends | 🔄 Planned |
| **Chat** | In-game chat | 🔄 Planned |
| **Achievements** | Unlock badges | 🔄 Planned |

### Wallet Features

| Feature | Description | Status |
|---------|-------------|--------|
| **Phantom** | Wallet adapter | ✅ Complete |
| **Solflare** | Wallet adapter | ✅ Complete |
| **Backpack** | Wallet adapter | ✅ Complete |
| **Coinbase** | Wallet adapter | ✅ Complete |
| **Auto-Reconnect** | Remember wallet | ✅ Complete |
| **Multi-Wallet** | Switch wallets | ✅ Complete |
| **Transaction Signing** | Sign transactions | ✅ Complete |

---

## User Flows

### 1. New User Onboarding

```
┌─────────────────┐
│   Landing Page   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Connect Wallet   │ (Phantom/Solflare/Backpack/Coinbase)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Set Username     │ (Optional, 3-20 chars)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Get GAME Tokens  │ (Purchase or airdrop)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Start Game     │ (Stake tokens)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Play Game      │
└─────────────────┘
```

### 2. Game Play Flow

```
┌─────────────────┐
│   Start Game     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Stake Tokens    │ (Select amount: 50/100/250/500/1000 GAME)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Game Board      │ (Klondike Solitaire)
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐ ┌───────┐
│  Win  │ │  Lose │
└───┬───┘ └───┬───┘
    │         │
    ▼         ▼
┌───────┐ ┌───────┐
│2x +   │ │  0%   │
│MEME   │ │       │
└───────┘ └───────┘
```

### 3. Staking Flow

```
┌─────────────────┐
│  Click "Stake"   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Select Amount   │ (50/100/250/500/1000 GAME)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Confirm Stake   │ (Wallet popup)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Sign Transaction│ (On-chain)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Game Starts     │
└─────────────────┘
```

### 4. Reward Claiming Flow

```
┌─────────────────┐
│  Game Complete   │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐ ┌───────┐
│  Win  │ │  Lose │
└───┬───┘ └───┬───┘
    │         │
    ▼         ▼
┌───────┐ ┌───────┐
│ Claim │ │ No    │
│Reward │ │Reward │
└───┬───┘ └───────┘
    │
    ▼
┌─────────────────┐
│ Sign Transaction │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Tokens Received  │ (GAME + MEME)
└─────────────────┘
```

### 5. Leaderboard Flow

```
┌─────────────────┐
│ View Leaderboard │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Select Period    │ (Daily/Weekly/Monthly/All Time)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Select Sort      │ (Wins/Win Rate/Earnings/Games)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ View Rankings    │ (Top 50 players)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Click Player     │ (View profile)
└─────────────────┘
```

---

## Navigation Structure

### Header Navigation

```
┌─────────────────────────────────────────────────────────────────┐
│  [Logo]  Sol-itaire                    [GAME Balance] [Wallet]  │
└─────────────────────────────────────────────────────────────────┘
```

### Main Content Areas

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                    Game Statistics                       │  │
│  │  [Games Played] [Win Rate] [Earnings] [Best Time] [Streak] │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                      Game Board                          │  │
│  │  ┌─────┐ ┌─────┐                    ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ │
│  │  │Stock│ │Waste│                    │ F1  │ │ F2  │ │ F3  │ │ F4  │ │
│  │  └─────┘ └─────┘                    └─────┘ └─────┘ └─────┘ └─────┘ │
│  │                                                                 │  │
│  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ │  │
│  │  │ T1  │ │ T2  │ │ T3  │ │ T4  │ │ T5  │ │ T6  │ │ T7  │ │  │
│  │  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                    Game Controls                         │  │
│  │           [New Game] [Undo] [Hint] [Devnet Setup]        │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Footer

```
┌─────────────────────────────────────────────────────────────────┐
│  © 2024 Sol-itaire. Built on Solana.                           │
│  Play responsibly. Crypto gaming involves financial risk.       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Modal Dialogs

### Stake Modal

```
┌─────────────────────────────────────┐
│         Stake Tokens to Play         │
├─────────────────────────────────────┤
│                                      │
│  Stake Amount (GAME tokens)          │
│  ┌─────────────────────────────┐    │
│  │  100                    GAME │    │
│  └─────────────────────────────┘    │
│                                      │
│  Quick amounts:                      │
│  [50] [100] [250] [500] [1000]      │
│                                      │
│  ┌─────────────────────────────┐    │
│  │  🏆 Win: Get 2x your stake  │    │
│  │  🎯 Complete: Get 50% back  │    │
│  │  💎 Bonus: Earn memecoins   │    │
│  └─────────────────────────────┘    │
│                                      │
│  [Cancel]              [Stake & Play] │
└─────────────────────────────────────┘
```

### Win Modal

```
┌─────────────────────────────────────┐
│         🎉 Congratulations!          │
├─────────────────────────────────────┤
│                                      │
│      You won the game!               │
│                                      │
│  Score: 1250  |  Moves: 42           │
│                                      │
│          [Claim Rewards]             │
│                                      │
└─────────────────────────────────────┘
```

### Devnet Helper Modal

```
┌─────────────────────────────────────┐
│          Devnet Setup Guide          │
├─────────────────────────────────────┤
│                                      │
│  1. Get SOL from faucet              │
│  2. Get GAME tokens                  │
│  3. Get MEME tokens                  │
│  4. Start playing!                   │
│                                      │
│  [Close]                             │
└─────────────────────────────────────┘
```

---

## API Response Formats

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { ... }
  }
}
```

### Paginated Response

```json
{
  "success": true,
  "data": {
    "items": [ ... ],
    "total": 100,
    "limit": 20,
    "offset": 0
  }
}
```

---

## Error Codes Reference

### Frontend Errors

| Code | Description | User Action |
|------|-------------|-------------|
| `WALLET_NOT_CONNECTED` | No wallet connected | Connect wallet |
| `INSUFFICIENT_BALANCE` | Not enough GAME tokens | Get tokens |
| `INSUFFICIENT_FUNDS` | Not enough SOL for fees | Get SOL |
| `INVALID_MOVE` | Invalid card move | Try different move |
| `TRANSACTION_FAILED` | On-chain tx failed | Retry |
| `NETWORK_ERROR` | RPC connection issue | Check connection |
| `INVALID_GAME_STATE` | Game state corrupted | Start new game |

### Backend Errors

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `UNAUTHORIZED` | Invalid/missing auth | 401 |
| `FORBIDDEN` | Insufficient permissions | 403 |
| `NOT_FOUND` | Resource not found | 404 |
| `VALIDATION_ERROR` | Invalid input | 400 |
| `RATE_LIMITED` | Too many requests | 429 |
| `INTERNAL_ERROR` | Server error | 500 |

### Smart Contract Errors

| Program | Error | Description |
|---------|-------|-------------|
| Solitaire | `GameNotActive` | Game not in progress |
| Solitaire | `InvalidMove` | Move violates rules |
| Solitaire | `InsufficientStake` | Stake too low |
| Solitaire | `CooldownNotElapsed` | 24h cooldown active |
| Gaming Token | `InsufficientBalance` | Not enough tokens |
| Gaming Token | `StakeNotFound` | No stake account |
| Memecoin | `AirdropExpired` | Airdrop no longer valid |
| Memecoin | `AlreadyClaimed` | Airdrop already claimed |

---

## Future Features (Planned)

### Phase 2

- [ ] Auto-complete when all cards face-up
- [ ] Undo last move
- [ ] Hint system (highlight valid moves)
- [ ] Daily login bonuses
- [ ] Achievement system

### Phase 3

- [ ] Tournament mode (timed competitions)
- [ ] Friends system
- [ ] Direct challenges
- [ ] Spectator mode
- [ ] Replay system

### Phase 4

- [ ] Mobile app (React Native)
- [ ] Push notifications
- [ ] In-game chat
- [ ] Custom card backs
- [ ] Seasonal events

### Phase 5

- [ ] Multiplayer modes
- [ ] NFT card collections
- [ ] Cross-chain integration
- [ ] DAO governance
- [ ] Esports tournaments

---

*Last updated: 2026-06-23*
*Version: 1.0.0*
