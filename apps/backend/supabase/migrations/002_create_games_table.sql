-- Create games table
CREATE TABLE IF NOT EXISTS games (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  stake_amount DECIMAL(10,2) NOT NULL CHECK (stake_amount > 0),
  status TEXT NOT NULL CHECK (status IN ('pending', 'active', 'completed', 'abandoned')) DEFAULT 'pending',
  result TEXT CHECK (result IN ('win', 'lose', 'incomplete')),
  score INTEGER CHECK (score >= 0),
  moves_count INTEGER NOT NULL DEFAULT 0 CHECK (moves_count >= 0),
  time_elapsed INTEGER NOT NULL DEFAULT 0 CHECK (time_elapsed >= 0),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  game_data JSONB DEFAULT '{}',
  transaction_signature TEXT,
  rewards_claimed BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX idx_games_user_id ON games(user_id);
CREATE INDEX idx_games_wallet_address ON games(wallet_address);
CREATE INDEX idx_games_status ON games(status);
CREATE INDEX idx_games_result ON games(result);
CREATE INDEX idx_games_started_at ON games(started_at);
CREATE INDEX idx_games_completed_at ON games(completed_at);
CREATE INDEX idx_games_stake_amount ON games(stake_amount);
CREATE INDEX idx_games_score ON games(score DESC);
CREATE INDEX idx_games_transaction_signature ON games(transaction_signature);

-- Create trigger for games table
CREATE TRIGGER update_games_updated_at
    BEFORE UPDATE ON games
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS)
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

-- Create policies for games table
CREATE POLICY "Users can view their own games" ON games
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert their own games" ON games
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own games" ON games
    FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Public can view completed games for stats" ON games
    FOR SELECT USING (status IN ('completed', 'abandoned'));

-- Comments
COMMENT ON TABLE games IS 'Game records and progress';
COMMENT ON COLUMN games.user_id IS 'Reference to user who owns the game';
COMMENT ON COLUMN games.wallet_address IS 'Solana wallet address of the player';
COMMENT ON COLUMN games.stake_amount IS 'Amount of tokens staked for this game';
COMMENT ON COLUMN games.status IS 'Current status of the game';
COMMENT ON COLUMN games.result IS 'Game result when completed';
COMMENT ON COLUMN games.score IS 'Final score of the game';
COMMENT ON COLUMN games.moves_count IS 'Number of moves made in the game';
COMMENT ON COLUMN games.time_elapsed IS 'Time elapsed in seconds';
COMMENT ON COLUMN games.game_data IS 'Game state including deck, tableau, foundation, etc.';
COMMENT ON COLUMN games.transaction_signature IS 'Solana transaction signature for the stake';
COMMENT ON COLUMN games.rewards_claimed IS 'Whether rewards have been claimed for this game';