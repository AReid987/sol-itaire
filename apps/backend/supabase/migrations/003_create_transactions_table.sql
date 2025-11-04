-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('stake', 'reward', 'deposit', 'withdrawal')),
  amount DECIMAL(15,8) NOT NULL CHECK (amount >= 0),
  token_type TEXT NOT NULL CHECK (token_type IN ('GAME', 'MEMECOIN')),
  transaction_signature TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'failed')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  game_id UUID REFERENCES games(id) ON DELETE SET NULL,
  block_height BIGINT,
  slot BIGINT,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'
);

-- Create indexes
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_wallet_address ON transactions(wallet_address);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_token_type ON transactions(token_type);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
CREATE INDEX idx_transactions_confirmed_at ON transactions(confirmed_at);
CREATE INDEX idx_transactions_transaction_signature ON transactions(transaction_signature);
CREATE INDEX idx_transactions_game_id ON transactions(game_id);
CREATE INDEX idx_transactions_amount ON transactions(amount);
CREATE INDEX idx_transactions_block_height ON transactions(block_height);

-- Row Level Security (RLS)
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for transactions table
CREATE POLICY "Users can view their own transactions" ON transactions
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert their own transactions" ON transactions
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own transactions" ON transactions
    FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Public can view confirmed transactions for stats" ON transactions
    FOR SELECT USING (status = 'confirmed');

-- Comments
COMMENT ON TABLE transactions IS 'Transaction records for stakes, rewards, and transfers';
COMMENT ON COLUMN transactions.user_id IS 'Reference to user who owns the transaction';
COMMENT ON COLUMN transactions.wallet_address IS 'Solana wallet address';
COMMENT ON COLUMN transactions.type IS 'Type of transaction';
COMMENT ON COLUMN transactions.amount IS 'Amount of tokens';
COMMENT ON COLUMN transactions.token_type IS 'Type of token (GAME or MEMECOIN)';
COMMENT ON COLUMN transactions.transaction_signature IS 'Solana transaction signature';
COMMENT ON COLUMN transactions.status IS 'Current status of the transaction';
COMMENT ON COLUMN transactions.game_id IS 'Reference to related game if applicable';
COMMENT ON COLUMN transactions.block_height IS 'Solana block height when confirmed';
COMMENT ON COLUMN transactions.slot IS 'Solana slot when confirmed';
COMMENT ON COLUMN transactions.error_message IS 'Error message if transaction failed';
COMMENT ON COLUMN transactions.metadata IS 'Additional transaction metadata';