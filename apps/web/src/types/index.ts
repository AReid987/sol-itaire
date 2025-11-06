// Game Types
export interface Move {
  fromPile: string;
  toPile: string;
  cardIndex: number;
  movedCards: Card[];
  flippedCard?: Card;
}

export interface GameState {
  id?: string;
  player: string;
  cards?: Card[];
  score: number;
  moves: number;
  status?: 'playing' | 'won' | 'lost';
  stakeAmount: number;
  createdAt?: Date;
  updatedAt?: Date;
  piles: Record<string, Pile>;
  isWon: boolean;
  isComplete: boolean;
  startTime: number;
  endTime?: number;
  moveHistory: Move[];
}

export interface Card {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  rank: string;
  value: number;
  faceUp: boolean;
  id: string;
}

export type CardSuit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type CardRank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Pile {
  id: string;
  cards: Card[];
  type: 'tableau' | 'foundation' | 'stock' | 'waste';
}

export interface GameTransaction {
  id?: string;
  gameId: string;
  type: 'stake' | 'win' | 'withdraw' | 'start' | 'move' | 'complete';
  amount?: number;
  tokenMint?: string;
  signature?: string;
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: number;
}

export interface SolitaireError {
  code: ErrorCode;
  message: string;
  details?: any;
  timestamp?: number;
}

export type ErrorCode =
  | 'INSUFFICIENT_BALANCE'
  | 'INSUFFICIENT_FUNDS'
  | 'INVALID_MOVE'
  | 'WALLET_NOT_CONNECTED'
  | 'TRANSACTION_FAILED'
  | 'NETWORK_ERROR'
  | 'INVALID_GAME_STATE'
  | 'UNAUTHORIZED'
  | 'TOKEN_ERROR'
  | 'GAME_NOT_FOUND'
  | 'INVALID_SIGNATURE';

export interface GameMove {
  gameId: string;
  fromPile: string;
  toPile: string;
  cardId: string;
  timestamp: Date;
}

// Token Types
export interface TokenBalance {
  mint: string;
  balance: number;
  decimals: number;
  symbol: string;
  name: string;
}

export interface TransactionStatus {
  signature: string;
  status: 'pending' | 'confirmed' | 'failed';
  error?: string;
}

// User Types
export interface UserProfile {
  publicKey: string;
  username?: string;
  gamesPlayed: number;
  gamesWon: number;
  totalWinnings: number;
  tokenBalances: TokenBalance[];
  createdAt: Date;
}