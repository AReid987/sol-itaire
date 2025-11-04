export interface User {
  id: string;
  wallet_address: string;
  username: string;
  email?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  last_login?: string;
  is_active: boolean;
  preferences: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  notifications: boolean;
  sound_effects: boolean;
  auto_stake: boolean;
  default_stake_amount: number;
}

export interface Game {
  id: string;
  user_id: string;
  wallet_address: string;
  stake_amount: number;
  status: 'pending' | 'active' | 'completed' | 'abandoned';
  result?: 'win' | 'lose' | 'incomplete';
  score?: number;
  moves_count: number;
  time_elapsed: number;
  started_at: string;
  completed_at?: string;
  game_data: GameData;
  transaction_signature?: string;
  rewards_claimed: boolean;
}

export interface GameData {
  deck: Card[];
  tableau: Pile[];
  foundation: Pile[];
  stock: Pile;
  waste: Pile;
  moves: Move[];
  current_time: number;
}

export interface Card {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  rank: string;
  value: number;
  face_up: boolean;
  id: string;
}

export interface Pile {
  cards: Card[];
  type: 'tableau' | 'foundation' | 'stock' | 'waste';
  id?: string;
}

export interface Move {
  from: { pile: string; index: number };
  to: { pile: string; index: number };
  card: Card;
  timestamp: string;
  move_number: number;
}

export interface Transaction {
  id: string;
  user_id: string;
  wallet_address: string;
  type: 'stake' | 'reward' | 'deposit' | 'withdrawal';
  amount: number;
  token_type: 'GAME' | 'MEMECOIN';
  transaction_signature: string;
  status: 'pending' | 'confirmed' | 'failed';
  created_at: string;
  confirmed_at?: string;
  game_id?: string;
  block_height?: number;
  slot?: number;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  username: string;
  wallet_address: string;
  total_wins: number;
  total_games: number;
  win_rate: number;
  total_earned: number;
  avatar_url?: string;
  last_active: string;
}

export interface GameStats {
  total_games: number;
  total_wins: number;
  total_losses: number;
  win_rate: number;
  average_score: number;
  best_score: number;
  average_time: number;
  best_time: number;
  total_staked: number;
  total_earned: number;
  net_profit: number;
  current_streak: number;
  best_streak: number;
  last_played: string;
}

export interface LeaderboardStats {
  total_players: number;
  active_players_today: number;
  total_games_today: number;
  total_volume_today: number;
  top_earners: LeaderboardEntry[];
  most_wins: LeaderboardEntry[];
  highest_win_rate: LeaderboardEntry[];
}

export interface AuthUser {
  id: string;
  wallet_address: string;
  username: string;
  email?: string;
  avatar_url?: string;
  created_at: string;
  last_login?: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

export interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  services: {
    database: 'healthy' | 'unhealthy';
    solana: 'healthy' | 'unhealthy';
    supabase: 'healthy' | 'unhealthy';
  };
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  version: string;
  environment: string;
}

export interface GameCreateRequest {
  stake_amount: number;
  wallet_address: string;
  signature: string;
}

export interface GameUpdateRequest {
  game_data: Partial<GameData>;
  moves_count?: number;
  time_elapsed?: number;
  status?: Game['status'];
  result?: Game['result'];
  score?: number;
}

export interface UserUpdateRequest {
  username?: string;
  email?: string;
  avatar_url?: string;
  preferences?: Partial<UserPreferences>;
}

export interface LeaderboardQuery {
  period?: 'daily' | 'weekly' | 'monthly' | 'all_time';
  limit?: number;
  offset?: number;
  sort_by?: 'wins' | 'win_rate' | 'earnings' | 'games';
}