# Sol-itaire Site Map Diagram

> Visual representation of the Sol-itaire platform architecture and navigation structure.

## System Architecture Overview

```mermaid
graph TB
    subgraph "Frontend Layer"
        A[Next.js 15 App] --> B[React 18 Components]
        B --> C[Tailwind CSS]
        B --> D[Framer Motion]
        B --> E[Solana Wallet Adapter]
    end

    subgraph "Backend Layer"
        F[Express.js API] --> G[Authentication]
        F --> H[Game Logic]
        F --> I[Leaderboards]
        F --> J[Transactions]
        F --> K[Statistics]
    end

    subgraph "Blockchain Layer"
        L[Solana Network] --> M[Solitaire Program]
        L --> N[Gaming Token Program]
        L --> O[Memecoin Program]
    end

    A -->|REST API| F
    F -->|RPC Calls| L
    E -->|Wallet Connection| L

    style A fill:#3b82f6,color:#fff
    style F fill:#8b5cf6,color:#fff
    style L fill:#059669,color:#fff
```

## Frontend Route Structure

```mermaid
graph LR
    subgraph "Current Routes"
        ROOT["/ Landing Page"]
        API["/api Documentation"]
    end

    subgraph "Planned Routes"
        PROFILE["/profile"]
        LEADERBOARD["/leaderboard"]
        HISTORY["/history"]
        WALLET["/wallet"]
        REWARDS["/rewards"]
        TOURNAMENT["/tournament"]
        SETTINGS["/settings"]
    end

    ROOT --> PROFILE
    ROOT --> LEADERBOARD
    ROOT --> HISTORY
    ROOT --> WALLET
    ROOT --> REWARDS
    ROOT --> TOURNAMENT
    ROOT --> SETTINGS

    style ROOT fill:#3b82f6,color:#fff
    style API fill:#6b7280,color:#fff
```

## Landing Page States

```mermaid
stateDiagram-v2
    [*] --> Unauthenticated
    
    state Unauthenticated {
        [*] --> HeroSection
        HeroSection --> WalletCTA
        WalletCTA --> GettingStarted
        GettingStarted --> WalletBadges
        WalletBadges --> FeatureCards
    }

    Unauthenticated --> Authenticating : Connect Wallet
    Authenticating --> Authenticated : Success

    state Authenticated {
        [*] --> Header
        Header --> GameStats
        GameStats --> StartGame
        StartGame --> GameBoard
        GameBoard --> GameControls
    }

    Authenticated --> [*]
```

## Backend API Structure

```mermaid
graph TB
    subgraph "API Endpoints /api/v1"
        subgraph "Authentication"
            AUTH1[POST /auth/wallet]
            AUTH2[POST /auth/username]
            AUTH3[POST /auth/refresh]
            AUTH4[POST /auth/logout]
        end

        subgraph "Users"
            USER1[GET /users/me]
            USER2[PUT /users/me]
            USER3[GET /users/:id]
            USER4[GET /users/:id/stats]
            USER5[GET /users]
        end

        subgraph "Games"
            GAME1[POST /games]
            GAME2[GET /games/:id]
            GAME3[PUT /games/:id]
            GAME4[POST /games/:id/complete]
            GAME5[GET /games]
        end

        subgraph "Leaderboard"
            LEAD1[GET /leaderboard]
            LEAD2[GET /leaderboard/user/:id]
        end

        subgraph "Transactions"
            TX1[GET /transactions]
            TX2[GET /transactions/:id]
            TX3[GET /transactions/public/:wallet]
            TX4[GET /transactions/stats]
            TX5[POST /transactions/verify]
        end

        subgraph "Statistics"
            STAT1[GET /stats/overview]
            STAT2[GET /stats/games]
            STAT3[GET /stats/transactions]
        end
    end

    subgraph "Health"
        HEALTH1[GET /health]
        HEALTH2[GET /api]
    end

    style AUTH1 fill:#ef4444,color:#fff
    style AUTH2 fill:#ef4444,color:#fff
    style AUTH3 fill:#ef4444,color:#fff
    style AUTH4 fill:#ef4444,color:#fff
    style GAME1 fill:#3b82f6,color:#fff
    style GAME2 fill:#3b82f6,color:#fff
    style GAME3 fill:#3b82f6,color:#fff
    style GAME4 fill:#3b82f6,color:#fff
    style GAME5 fill:#3b82f6,color:#fff
```

## Smart Contract Architecture

```mermaid
graph TB
    subgraph "Solana Programs"
        subgraph "Solitaire Game Program"
            SG1[initialize_game]
            SG2[make_move]
            SG3[complete_game]
            SG4[withdraw_stake]
            
            SG1 --> SG2
            SG2 --> SG3
            SG3 --> SG4
        end

        subgraph "Gaming Token Program"
            GT1[initialize_mint]
            GT2[mint_tokens]
            GT3[stake_tokens]
            GT4[unstake_tokens]
            GT5[claim_rewards]
            
            GT1 --> GT2
            GT2 --> GT3
            GT3 --> GT4
            GT4 --> GT5
        end

        subgraph "Memecoin Reward Program"
            MC1[initialize_memecoin]
            MC2[distribute_initial_supply]
            MC3[distribute_game_rewards]
            MC4[claim_airdrop]
            MC5[setup_airdrop_account]
            
            MC1 --> MC2
            MC2 --> MC3
            MC3 --> MC4
            MC1 --> MC5
        end
    end

    subgraph "Token Types"
        GAME[GAME Token<br/>SPL Token for Staking]
        MEME[MEME Token<br/>Reward Memecoin]
    end

    GT3 --> GAME
    GT5 --> GAME
    MC3 --> MEME
    MC4 --> MEME

    style SG1 fill:#059669,color:#fff
    style SG2 fill:#059669,color:#fff
    style SG3 fill:#059669,color:#fff
    style SG4 fill:#059669,color:#fff
    style GT1 fill:#8b5cf6,color:#fff
    style GT2 fill:#8b5cf6,color:#fff
    style GT3 fill:#8b5cf6,color:#fff
    style GT4 fill:#8b5cf6,color:#fff
    style GT5 fill:#8b5cf6,color:#fff
    style MC1 fill:#f59e0b,color:#fff
    style MC2 fill:#f59e0b,color:#fff
    style MC3 fill:#f59e0b,color:#fff
    style MC4 fill:#f59e0b,color:#fff
    style MC5 fill:#f59e0b,color:#fff
```

## User Flow: Onboarding

```mermaid
flowchart TD
    A[Landing Page] --> B{Wallet Connected?}
    B -->|No| C[Connect Wallet]
    B -->|Yes| D{Username Set?}
    
    C --> E[Select Wallet<br/>Phantom/Solflare/Backpack/Coinbase]
    E --> F[Sign Message]
    F --> D
    
    D -->|No| G[Set Username<br/>3-20 characters]
    D -->|Yes| H{Has GAME Tokens?}
    
    G --> H
    
    H -->|No| I[Get GAME Tokens<br/>Purchase or Airdrop]
    H -->|Yes| J[Start Game]
    
    I --> J
    
    J --> K[Select Stake Amount<br/>50/100/250/500/1000 GAME]
    K --> L[Sign Stake Transaction]
    L --> M[Game Board Appears]
    M --> N[Play Solitaire]

    style A fill:#3b82f6,color:#fff
    style C fill:#8b5cf6,color:#fff
    style G fill:#8b5cf6,color:#fff
    style I fill:#f59e0b,color:#fff
    style J fill:#059669,color:#fff
    style N fill:#059669,color:#fff
```

## User Flow: Gameplay

```mermaid
flowchart TD
    A[Start Game] --> B[Stake Tokens]
    B --> C[Game Board]
    
    C --> D{Player Action}
    D -->|Move Card| E{Valid Move?}
    D -->|Draw from Stock| F[Add to Waste]
    D -->|Click Waste| G[Select Card]
    
    E -->|Yes| H[Execute Move]
    E -->|No| I[Show Error]
    
    H --> J{Game State}
    J -->|Win| K[Win Modal]
    J -->|Lose| L[Game Over]
    J -->|Continue| D
    
    F --> D
    G --> D
    I --> D
    
    K --> M[Claim Rewards]
    M --> N[Sign Transaction]
    N --> O[Receive GAME + MEME]
    
    L --> P[New Game]
    O --> P
    P --> A

    style A fill:#3b82f6,color:#fff
    style C fill:#8b5cf6,color:#fff
    style K fill:#059669,color:#fff
    style O fill:#f59e0b,color:#fff
```

## User Flow: Staking & Rewards

```mermaid
flowchart LR
    subgraph "Staking Flow"
        S1[Click Stake] --> S2[Select Amount]
        S2 --> S3[Confirm in Wallet]
        S3 --> S4[Sign Transaction]
        S4 --> S5[Stake Escrowed]
        S5 --> S6[Game Starts]
    end

    subgraph "Reward Flow"
        R1[Game Complete] --> R2{Outcome}
        R2 -->|Win| R3[2x Stake + MEME]
        R2 -->|Complete| R4[50% Stake]
        R2 -->|Abandon| R5[90% Stake<br/>24h Cooldown]
        
        R3 --> R6[Claim Rewards]
        R4 --> R6
        R5 --> R7[Wait 24h]
        R7 --> R6
        
        R6 --> R8[Sign Transaction]
        R8 --> R9[Tokens Received]
    end

    S6 --> R1

    style S1 fill:#3b82f6,color:#fff
    style S5 fill:#8b5cf6,color:#fff
    style R3 fill:#059669,color:#fff
    style R4 fill:#f59e0b,color:#fff
    style R5 fill:#ef4444,color:#fff
    style R9 fill:#059669,color:#fff
```

## Game Board Layout

```mermaid
graph TB
    subgraph "Game Board"
        subgraph "Top Row"
            STOCK[Stock Pile<br/>Draw Cards]
            WASTE[Waste Pile<br/>Discard]
            F1[Foundation 1<br/>♠ Spades]
            F2[Foundation 2<br/>♥ Hearts]
            F3[Foundation 3<br/>♦ Diamonds]
            F4[Foundation 4<br/>♣ Clubs]
        end

        subgraph "Tableau"
            T1[Tableau 1]
            T2[Tableau 2]
            T3[Tableau 3]
            T4[Tableau 4]
            T5[Tableau 5]
            T6[Tableau 6]
            T7[Tableau 7]
        end
    end

    STOCK -->|Draw| WASTE
    WASTE -->|Move| T1
    WASTE -->|Move| T2
    WASTE -->|Move| T3
    WASTE -->|Move| T4
    WASTE -->|Move| T5
    WASTE -->|Move| T6
    WASTE -->|Move| T7
    
    T1 -->|Complete Suit| F1
    T2 -->|Complete Suit| F2
    T3 -->|Complete Suit| F3
    T4 -->|Complete Suit| F4

    style STOCK fill:#6b7280,color:#fff
    style WASTE fill:#6b7280,color:#fff
    style F1 fill:#3b82f6,color:#fff
    style F2 fill:#ef4444,color:#fff
    style F3 fill:#ef4444,color:#fff
    style F4 fill:#059669,color:#fff
    style T1 fill:#f59e0b,color:#fff
    style T2 fill:#f59e0b,color:#fff
    style T3 fill:#f59e0b,color:#fff
    style T4 fill:#f59e0b,color:#fff
    style T5 fill:#f59e0b,color:#fff
    style T6 fill:#f59e0b,color:#fff
    style T7 fill:#f59e0b,color:#fff
```

## Data Flow Architecture

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant BE as Backend
    participant SC as Smart Contract
    participant SOL as Solana Network

    U->>FE: Connect Wallet
    FE->>SOL: Request Connection
    SOL-->>FE: Wallet Connected

    U->>FE: Start Game
    FE->>BE: POST /games (stake amount)
    BE->>SC: initialize_game
    SC->>SOL: Create Game Account
    SOL-->>SC: Transaction Confirmed
    SC-->>BE: Game Created
    BE-->>FE: Game Data
    FE-->>U: Show Game Board

    loop Gameplay
        U->>FE: Move Card
        FE->>FE: Validate Move (client)
        FE->>BE: PUT /games/:id (move)
        BE->>SC: make_move
        SC->>SOL: Update Game State
        SOL-->>SC: Confirmed
        SC-->>BE: Move Valid
        BE-->>FE: Updated State
        FE-->>U: Animate Card
    end

    U->>FE: Complete Game
    FE->>BE: POST /games/:id/complete
    BE->>SC: complete_game
    SC->>SOL: Distribute Rewards
    SOL-->>SC: Confirmed
    SC-->>BE: Game Complete
    BE-->>FE: Results + Rewards
    FE-->>U: Show Win Modal
```

## Feature Status Overview

```mermaid
pie title Feature Completion Status
    "Complete" : 45
    "In Progress" : 15
    "Planned" : 40
```

## Component Hierarchy

```mermaid
graph TB
    subgraph "App Layout"
        ROOT[Root Layout]
        ROOT --> QUERY[QueryClientProvider]
        QUERY --> WALLET[WalletAdapterProvider]
        WALLET --> PAGE[Main Page]
    end

    subgraph "Page Components"
        PAGE --> HEADER[Header]
        PAGE --> CONTENT[Content Area]
        PAGE --> FOOTER[Footer]
        
        HEADER --> LOGO[Logo]
        HEADER --> BALANCE[TokenBalances]
        HEADER --> WALLET_BTN[WalletMultiButton]
    end

    subgraph "Game Components"
        CONTENT --> STATS[GameStats]
        CONTENT --> BOARD[GameBoard]
        CONTENT --> START[Start Game CTA]
        
        BOARD --> PILES[CardPile x12]
        BOARD --> CONTROLS[GameControls]
        BOARD --> STAKE[StakeModal]
        BOARD --> DEVNET[DevnetHelper]
        
        PILES --> CARDS[PlayingCard]
    end

    subgraph "Modals"
        STAKE --> STAKE_FORM[Stake Form]
        STAKE --> REWARDS_INFO[Rewards Info]
        
        DEVNET --> SETUP_GUIDE[Setup Guide]
        DEVNET --> FAUCET[Faucet Links]
    end

    style ROOT fill:#3b82f6,color:#fff
    style PAGE fill:#8b5cf6,color:#fff
    style BOARD fill:#059669,color:#fff
    style STAKE fill:#f59e0b,color:#fff
```

## Token Distribution

```mermaid
pie title MEME Token Distribution
    "Game Rewards (40%)" : 40
    "Community Airdrop (25%)" : 25
    "Liquidity Pool (20%)" : 20
    "Team (10%)" : 10
    "Marketing (5%)" : 5
```

## Leaderboard Structure

```mermaid
graph LR
    subgraph "Leaderboard Filters"
        PERIOD[Period<br/>Daily/Weekly/Monthly/All Time]
        SORT[Sort By<br/>Wins/Win Rate/Earnings/Games]
        LIMIT[Limit<br/>1-100 players]
    end

    subgraph "Leaderboard Data"
        RANK[Rank]
        PLAYER[Player]
        WINS[Wins]
        WINRATE[Win Rate]
        EARNINGS[Earnings]
        GAMES[Games Played]
    end

    PERIOD --> RANK
    SORT --> RANK
    LIMIT --> RANK
    
    RANK --> PLAYER
    PLAYER --> WINS
    PLAYER --> WINRATE
    PLAYER --> EARNINGS
    PLAYER --> GAMES

    style PERIOD fill:#3b82f6,color:#fff
    style SORT fill:#8b5cf6,color:#fff
    style RANK fill:#059669,color:#fff
```

## Security Layers

```mermaid
graph TB
    subgraph "Frontend Security"
        FS1[Input Validation]
        FS2[Wallet Signature]
        FS3[Error Boundaries]
        FS4[Rate Limiting UI]
    end

    subgraph "Backend Security"
        BS1[JWT Authentication]
        BS2[Request Validation]
        BS3[Rate Limiting]
        BS4[CORS Policy]
        BS5[Helmet Headers]
        BS6[Input Sanitization]
    end

    subgraph "Blockchain Security"
        BC1[On-chain Validation]
        BC2[Signature Verification]
        BC3[Program Authority]
        BC4[Account Ownership]
        BC5[Cooldown Periods]
    end

    FS1 --> BS2
    FS2 --> BC2
    BS1 --> BC4
    BS6 --> BC1

    style FS1 fill:#3b82f6,color:#fff
    style BS1 fill:#8b5cf6,color:#fff
    style BC1 fill:#059669,color:#fff
```

## Deployment Architecture

```mermaid
graph TB
    subgraph "Development"
        DEV_FE[Next.js Dev Server<br/>localhost:3000]
        DEV_BE[Express Dev Server<br/>localhost:3001]
        DEV_SOL[Local Validator<br/>localhost:8899]
    end

    subgraph "Staging"
        STAGE_FE[Vercel Preview]
        STAGE_BE[Render Staging]
        STAGE_SOL[Solana Devnet]
    end

    subgraph "Production"
        PROD_FE[Vercel Production]
        PROD_BE[Render Production]
        PROD_SOL[Solana Mainnet]
    end

    DEV_FE --> STAGE_FE
    DEV_BE --> STAGE_BE
    DEV_SOL --> STAGE_SOL

    STAGE_FE --> PROD_FE
    STAGE_BE --> PROD_BE
    STAGE_SOL --> PROD_SOL

    style DEV_FE fill:#3b82f6,color:#fff
    style STAGE_FE fill:#8b5cf6,color:#fff
    style PROD_FE fill:#059669,color:#fff
```

---

*Generated from SITE_MAP.md - 2026-06-23*
