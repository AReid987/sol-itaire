// Game State Types
export type CardSuit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type CardRank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
  suit: CardSuit;
  rank: CardRank;
  id: string;
  faceUp: boolean;
}

export interface Pile {
  cards: Card[];
  type: 'tableau' | 'foundation' | 'stock' | 'waste';
  id: string;
}

export interface GameState {
  piles: Record<string, Pile>;
  moves: number;
  score: number;
  isWon: boolean;
  isComplete: boolean;
  startTime: number;
  endTime?: number;
  player: string;
}

// Blockchain Types
export interface GameAccount {
  authority: string;
  gameData: GameState;
  stakeAmount: number;
  rewardMint: string;
  status: 'active' | 'completed' | 'abandoned';
  createdAt: number;
  updatedAt: number;
}

export interface TokenAccount {
  mint: string;
  owner: string;
  amount: number;
  delegate?: string;
  delegatedAmount?: number;
  isFrozen: boolean;
  isInitialized: boolean;
}

// Transaction Types
export interface GameTransaction {
  type: 'start' | 'move' | 'complete' | 'withdraw';
  gameId: string;
  player: string;
  amount?: number;
  timestamp: number;
  signature?: string;
  status: 'pending' | 'confirmed' | 'failed';
}

export interface StakeTransaction {
  player: string;
  amount: number;
  tokenMint: string;
  gameId: string;
  timestamp: number;
  signature?: string;
}

export interface RewardTransaction {
  player: string;
  amount: number;
  tokenMint: string;
  gameId: string;
  isWin: boolean;
  timestamp: number;
  signature?: string;
}

// Token Types
export interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  supply: number;
  logoURI?: string;
}

export interface GamingTokenConfig {
  mint: string;
  decimals: number;
  initialSupply: number;
  mintAuthority: string;
  freezeAuthority?: string;
}

export interface MemecoinConfig {
  mint: string;
  decimals: number;
  initialSupply: number;
  distribution: {
    gameRewards: number;
    liquidityPool: number;
    team: number;
    community: number;
  };
}

// Wallet Types
export interface WalletConnection {
  publicKey: string;
  connected: boolean;
  connecting: boolean;
  disconnecting: boolean;
  wallet?: {
    name: string;
    icon: string;
    url: string;
  };
}

// UI Types
export interface GameStats {
  gamesPlayed: number;
  gamesWon: number;
  winRate: number;
  totalEarnings: number;
  bestTime: number;
  currentStreak: number;
}

export interface LeaderboardEntry {
  player: string;
  score: number;
  time: number;
  timestamp: number;
  rank: number;
}

// Error Types
export interface SolitaireError {
  code: string;
  message: string;
  details?: any;
  timestamp: number;
}

export type ErrorCode =
  | 'INSUFFICIENT_FUNDS'
  | 'INVALID_GAME_STATE'
  | 'UNAUTHORIZED'
  | 'TRANSACTION_FAILED'
  | 'WALLET_NOT_CONNECTED'
  | 'NETWORK_ERROR'
  | 'INVALID_MOVE'
  | 'GAME_NOT_FOUND'
  | 'TOKEN_ERROR';