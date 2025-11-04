const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'sol-itaire-backend'
  });
});

// Game data endpoints
app.get('/api/games/stats', (req, res) => {
  res.json({
    totalGames: 0,
    activePlayers: 0,
    totalRewards: 0,
    network: process.env.SOLANA_NETWORK || 'devnet'
  });
});

// Token information
app.get('/api/tokens', (req, res) => {
  res.json({
    gamingToken: {
      address: process.env.GAMING_TOKEN_ADDRESS || '2M4qUmbTiSRtRmfRcnZFWQyNXqkeQ4c9TzCdC7d6svPD',
      symbol: 'SOL-IT',
      name: 'Solitaire Gaming Token'
    },
    memecoin: {
      address: process.env.MEMECOIN_ADDRESS || '6ygxtUVufLvihkSm4xv3Ny42ocRmwbMHaJ23kiovFKiH',
      symbol: 'SOL-COIN',
      name: 'Solitaire Memecoin'
    }
  });
});

// Solana network info
app.get('/api/network', (req, res) => {
  res.json({
    network: process.env.SOLANA_NETWORK || 'devnet',
    rpc: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
    commitment: 'processed'
  });
});

// Faucet integration
app.post('/api/faucet/request', async (req, res) => {
  const { address, network } = req.body;

  if (!address) {
    return res.status(400).json({ error: 'Wallet address required' });
  }

  try {
    // For now, just return success - actual faucet integration would go here
    res.json({
      success: true,
      message: 'SOL requested successfully',
      amount: '1 SOL',
      network: network || 'devnet'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to request SOL' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 Sol-itaire backend running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🌐 Network: ${process.env.SOLANA_NETWORK || 'devnet'}`);
});

module.exports = app;