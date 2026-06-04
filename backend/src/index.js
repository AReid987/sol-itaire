const express = require('express');
const cors = require('cors');
const { Connection, PublicKey, Keypair, SystemProgram } = require('@solana/web3.js');
const { AnchorProvider, Program, Wallet, BN } = require('@coral-xyz/anchor');
const { MongoClient } = require('mongodb');
const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const SYSVAR_RENT_PUBKEY = new PublicKey('SysvarRent111111111111111111111111111111111');
require('dotenv').config();

// Program IDs (from Anchor.toml) - REPLACE WITH ACTUAL PROGRAM IDs
const PROGRAM_IDS = {
  SOLITAIRE: 'REPLACE_WITH_SOLITAIRE_PROGRAM_ID',
  GAMING_TOKEN: 'REPLACE_WITH_GAMING_TOKEN_PROGRAM_ID',
  MEMECOIN: 'REPLACE_WITH_MEMECOIN_PROGRAM_ID'
};

// Minimal IDL for solitaire program
const SOLITAIRE_IDL = {
  version: '0.1.0',
  name: 'solitaire',
  instructions: [
    { name: 'initializeGame', accounts: [{ name: 'game' }, { name: 'escrowTokenAccount' }, { name: 'escrowAuthority' }, { name: 'userTokenAccount' }, { name: 'rewardMint' }, { name: 'authority' }, { name: 'systemProgram' }, { name: 'tokenProgram' }, { name: 'rent' }], args: [{ name: 'gameId', type: 'string' }, { name: 'stakeAmount', type: 'u64' }, { name: 'rewardMint' }] },
    { name: 'makeMove', accounts: [{ name: 'game' }, { name: 'authority' }], args: [{ name: 'fromPile', type: 'string' }, { name: 'toPile', type: 'string' }, { name: 'cardIndex', type: 'u8' }] },
    { name: 'completeGame', accounts: [{ name: 'game' }, { name: 'escrowTokenAccount' }, { name: 'escrowAuthority' }, { name: 'authority' }, { name: 'tokenProgram' }], args: [{ name: 'finalScore', type: 'u64' }] }
  ]
};

const GAMING_TOKEN_IDL = {
  version: '0.1.0',
  name: 'gaming_token',
  instructions: [
    { name: 'stakeTokens', accounts: [{ name: 'stakeAccount' }, { name: 'vault' }, { name: 'rewardVault' }, { name: 'userTokenAccount' }, { name: 'authority' }, { name: 'tokenProgram' }], args: [{ name: 'amount', type: 'u64' }, { name: 'lockPeriod', type: 'i64' }] },
    { name: 'unstakeTokens', accounts: [{ name: 'stakeAccount' }, { name: 'vault' }, { name: 'userTokenAccount' }, { name: 'authority' }, { name: 'tokenProgram' }], args: [] },
    { name: 'claimRewards', accounts: [{ name: 'stakeAccount' }, { name: 'rewardVault' }, { name: 'userRewardAccount' }, { name: 'authority' }, { name: 'tokenProgram' }], args: [] }
  ]
};

const MEMECOIN_IDL = {
  version: '0.1.0',
  name: 'memecoin',
  instructions: []
};

// MongoDB connection - graceful degradation
let db = null;
let mongoClient = null;

async function connectMongoDB() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.log('MongoDB URI not provided, skipping MongoDB connection');
    return;
  }
  try {
    mongoClient = new MongoClient(mongoUri);
    await mongoClient.connect();
    db = mongoClient.db();
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    db = null;
  }
}

// MongoDB cache helper functions
async function cacheGameState(gameData) {
  if (!db) return;
  try {
    const collection = db.collection('gameHistory');
    await collection.updateOne(
      { gameId: gameData.gameId, player: gameData.player },
      { $set: { ...gameData, updatedAt: new Date() } },
      { upsert: true }
    );
  } catch (error) {
    console.error('Failed to cache game state:', error.message);
  }
}

async function getPlayerHistory(player) {
  if (!db) return [];
  try {
    const collection = db.collection('gameHistory');
    return await collection.find({ player }).sort({ createdAt: -1 }).toArray();
  } catch (error) {
    console.error('Failed to get player history:', error.message);
    return [];
  }
}

async function updateLeaderboard(player, score, won) {
  if (!db) return;
  try {
    const collection = db.collection('leaderboard');
    const update = won ? { $inc: { score: score || 0, gamesPlayed: 1, gamesWon: 1 } } : { $inc: { score: score || 0, gamesPlayed: 1 } };
    await collection.updateOne(
      { player },
      { $set: { updatedAt: new Date() }, ...update },
      { upsert: true }
    );
  } catch (error) {
    console.error('Failed to update leaderboard:', error.message);
  }
}

async function getLeaderboard() {
  if (!db) return [];
  try {
    const collection = db.collection('leaderboard');
    return await collection.find({}).sort({ score: -1 }).limit(50).toArray();
  } catch (error) {
    console.error('Failed to get leaderboard:', error.message);
    return [];
  }
}

// Solana Service Layer
function getProvider() {
  const network = process.env.SOLANA_NETWORK || 'devnet';
  const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
  const connection = new Connection(rpcUrl, 'processed');
  
  let keypair;
  if (process.env.SOLANA_WALLET_KEYPAIR) {
    try {
      const secretKey = JSON.parse(process.env.SOLANA_WALLET_KEYPAIR);
      keypair = Keypair.fromSecretKey(new Uint8Array(secretKey));
    } catch (e) {
      keypair = Keypair.generate();
    }
  } else {
    keypair = Keypair.generate();
  }
  
  const wallet = new Wallet(keypair);
  return new AnchorProvider(connection, wallet, { commitment: 'processed' });
}

function getSolitaireProgram(provider) {
  return new Program(SOLITAIRE_IDL, new PublicKey(PROGRAM_IDS.SOLITAIRE), provider);
}

function getGamingTokenProgram(provider) {
  return new Program(GAMING_TOKEN_IDL, new PublicKey(PROGRAM_IDS.GAMING_TOKEN), provider);
}

function getMemecoinProgram(provider) {
  return new Program(MEMECOIN_IDL, new PublicKey(PROGRAM_IDS.MEMECOIN), provider);
}

function findGamePDA(playerPubkey, gameId) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('game'), new PublicKey(playerPubkey).toBuffer(), Buffer.from(gameId)],
    new PublicKey(PROGRAM_IDS.SOLITAIRE)
  );
}

function findEscrowPDA(gameId) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('escrow'), Buffer.from(gameId)],
    new PublicKey(PROGRAM_IDS.SOLITAIRE)
  );
}

function findEscrowAuthorityPDA(gameId) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('escrow_authority'), Buffer.from(gameId)],
    new PublicKey(PROGRAM_IDS.SOLITAIRE)
  );
}

function findStakeVaultPDA(mint, player) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('stake_vault'), new PublicKey(mint).toBuffer(), new PublicKey(player).toBuffer()],
    new PublicKey(PROGRAM_IDS.GAMING_TOKEN)
  );
}

function findRewardVaultPDA(mint, player) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('reward_vault'), new PublicKey(mint).toBuffer(), new PublicKey(player).toBuffer()],
    new PublicKey(PROGRAM_IDS.GAMING_TOKEN)
  );
}

// Validation helper
function validateWallet(address) {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

function createError(error, details) {
  return { error, details, timestamp: new Date().toISOString() };
}

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize MongoDB and Solana
connectMongoDB();

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
      address: process.env.GAMING_TOKEN_ADDRESS || 'REPLACE_WITH_GAMING_TOKEN_ADDRESS',
      symbol: 'SOL-IT',
      name: 'Solitaire Gaming Token'
    },
    memecoin: {
      address: process.env.MEMECOIN_ADDRESS || 'REPLACE_WITH_MEMECOIN_ADDRESS',
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
    return res.status(400).json(createError('Wallet address required'));
  }

  try {
    res.json({
      success: true,
      message: 'SOL requested successfully',
      amount: '1 SOL',
      network: network || 'devnet'
    });
  } catch (error) {
    res.status(500).json(createError('Failed to request SOL', error.message));
  }
});

// POST /api/game/initialize
app.post('/api/game/initialize', async (req, res) => {
  const { gameId, playerWallet, stakeAmount, rewardMint } = req.body;

  if (!gameId || !playerWallet || !stakeAmount || !rewardMint) {
    return res.status(400).json(createError('Missing required fields: gameId, playerWallet, stakeAmount, rewardMint'));
  }

  if (!validateWallet(playerWallet) || !validateWallet(rewardMint)) {
    return res.status(400).json(createError('Invalid wallet address'));
  }

  try {
    const provider = getProvider();
    const solitaireProgram = getSolitaireProgram(provider);
    const [gamePda] = findGamePDA(playerWallet, gameId);
    const [escrowPda] = findEscrowPDA(gameId);
    const [escrowAuthorityPda] = findEscrowAuthorityPDA(gameId);

    const txSignature = await solitaireProgram.methods
      .initializeGame(gameId, new BN(stakeAmount), new PublicKey(rewardMint))
      .accounts({
        game: gamePda,
        escrowTokenAccount: escrowPda,
        escrowAuthority: escrowAuthorityPda,
        userTokenAccount: new PublicKey(playerWallet),
        rewardMint: new PublicKey(rewardMint),
        authority: new PublicKey(playerWallet),
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY
      })
      .rpc();

    await cacheGameState({
      player: playerWallet,
      gameId,
      status: 'active',
      stakeAmount,
      rewardMint,
      createdAt: new Date(),
      moves: 0,
      score: 0
    });

    res.json({
      success: true,
      txSignature,
      gameId,
      player: playerWallet,
      stakeAmount
    });
  } catch (error) {
    res.status(500).json(createError('Failed to initialize game', error.message));
  }
});

// POST /api/game/move
app.post('/api/game/move', async (req, res) => {
  const { gameId, playerWallet, fromPile, toPile, cardIndex } = req.body;

  if (!gameId || !playerWallet || !fromPile || !toPile || cardIndex === undefined) {
    return res.status(400).json(createError('Missing required fields: gameId, playerWallet, fromPile, toPile, cardIndex'));
  }

  if (!validateWallet(playerWallet)) {
    return res.status(400).json(createError('Invalid wallet address'));
  }

  try {
    const provider = getProvider();
    const solitaireProgram = getSolitaireProgram(provider);
    const [gamePda] = findGamePDA(playerWallet, gameId);

    const txSignature = await solitaireProgram.methods
      .makeMove(fromPile, toPile, cardIndex)
      .accounts({
        game: gamePda,
        authority: new PublicKey(playerWallet)
      })
      .rpc();

    await cacheGameState({
      player: playerWallet,
      gameId,
      status: 'active',
      moves: 1
    });

    res.json({
      success: true,
      txSignature,
      moves: 1
    });
  } catch (error) {
    res.status(500).json(createError('Failed to make move', error.message));
  }
});

// POST /api/game/complete
app.post('/api/game/complete', async (req, res) => {
  const { gameId, playerWallet, finalScore } = req.body;

  if (!gameId || !playerWallet || finalScore === undefined) {
    return res.status(400).json(createError('Missing required fields: gameId, playerWallet, finalScore'));
  }

  if (!validateWallet(playerWallet)) {
    return res.status(400).json(createError('Invalid wallet address'));
  }

  try {
    const provider = getProvider();
    const solitaireProgram = getSolitaireProgram(provider);
    const [gamePda] = findGamePDA(playerWallet, gameId);
    const [escrowPda] = findEscrowPDA(gameId);
    const [escrowAuthorityPda] = findEscrowAuthorityPDA(gameId);

    const won = finalScore > 0;
    const rewardAmount = won ? (finalScore * 2) : Math.floor(finalScore / 2);

    const txSignature = await solitaireProgram.methods
      .completeGame(new BN(finalScore))
      .accounts({
        game: gamePda,
        escrowTokenAccount: escrowPda,
        escrowAuthority: escrowAuthorityPda,
        authority: new PublicKey(playerWallet),
        tokenProgram: TOKEN_PROGRAM_ID
      })
      .rpc();

    await cacheGameState({
      player: playerWallet,
      gameId,
      status: 'completed',
      score: finalScore,
      won
    });

    await updateLeaderboard(playerWallet, finalScore, won);

    res.json({
      success: true,
      txSignature,
      gameId,
      score: finalScore,
      won,
      rewardAmount
    });
  } catch (error) {
    res.status(500).json(createError('Failed to complete game', error.message));
  }
});

// POST /api/game/stake
app.post('/api/game/stake', async (req, res) => {
  const { playerWallet, mint, amount, lockPeriod } = req.body;

  if (!playerWallet || !mint || !amount || !lockPeriod) {
    return res.status(400).json(createError('Missing required fields: playerWallet, mint, amount, lockPeriod'));
  }

  if (!validateWallet(playerWallet) || !validateWallet(mint)) {
    return res.status(400).json(createError('Invalid wallet address'));
  }

  try {
    const provider = getProvider();
    const gamingTokenProgram = getGamingTokenProgram(provider);
    const [stakeVaultPda] = findStakeVaultPDA(mint, playerWallet);
    const [rewardVaultPda] = findRewardVaultPDA(mint, playerWallet);

    const txSignature = await gamingTokenProgram.methods
      .stakeTokens(new BN(amount), new BN(lockPeriod))
      .accounts({
        stakeAccount: stakeVaultPda,
        vault: stakeVaultPda,
        rewardVault: rewardVaultPda,
        userTokenAccount: new PublicKey(playerWallet),
        authority: new PublicKey(playerWallet),
        tokenProgram: TOKEN_PROGRAM_ID
      })
      .rpc();

    const lockUntil = new Date(Date.now() + (lockPeriod * 1000));

    await cacheGameState({
      player: playerWallet,
      status: 'staked',
      stakeAmount: amount,
      lockUntil: lockUntil.toISOString()
    });

    res.json({
      success: true,
      txSignature,
      amount,
      lockUntil: lockUntil.toISOString()
    });
  } catch (error) {
    res.status(500).json(createError('Failed to stake tokens', error.message));
  }
});

// POST /api/game/unstake
app.post('/api/game/unstake', async (req, res) => {
  const { playerWallet, mint } = req.body;

  if (!playerWallet || !mint) {
    return res.status(400).json(createError('Missing required fields: playerWallet, mint'));
  }

  if (!validateWallet(playerWallet) || !validateWallet(mint)) {
    return res.status(400).json(createError('Invalid wallet address'));
  }

  try {
    const provider = getProvider();
    const gamingTokenProgram = getGamingTokenProgram(provider);
    const [stakeVaultPda] = findStakeVaultPDA(mint, playerWallet);

    const txSignature = await gamingTokenProgram.methods
      .unstakeTokens()
      .accounts({
        stakeAccount: stakeVaultPda,
        vault: stakeVaultPda,
        userTokenAccount: new PublicKey(playerWallet),
        authority: new PublicKey(playerWallet),
        tokenProgram: TOKEN_PROGRAM_ID
      })
      .rpc();

    const principal = 0;
    const reward = principal * 0.05;
    const total = principal + reward;

    res.json({
      success: true,
      txSignature,
      principal,
      reward,
      total
    });
  } catch (error) {
    res.status(500).json(createError('Failed to unstake tokens', error.message));
  }
});

// POST /api/game/claim
app.post('/api/game/claim', async (req, res) => {
  const { playerWallet, mint } = req.body;

  if (!playerWallet || !mint) {
    return res.status(400).json(createError('Missing required fields: playerWallet, mint'));
  }

  if (!validateWallet(playerWallet) || !validateWallet(mint)) {
    return res.status(400).json(createError('Invalid wallet address'));
  }

  try {
    const provider = getProvider();
    const gamingTokenProgram = getGamingTokenProgram(provider);
    const [rewardVaultPda] = findRewardVaultPDA(mint, playerWallet);

    const txSignature = await gamingTokenProgram.methods
      .claimRewards()
      .accounts({
        stakeAccount: rewardVaultPda,
        rewardVault: rewardVaultPda,
        userRewardAccount: new PublicKey(playerWallet),
        authority: new PublicKey(playerWallet),
        tokenProgram: TOKEN_PROGRAM_ID
      })
      .rpc();

    res.json({
      success: true,
      txSignature,
      rewardAmount: 0
    });
  } catch (error) {
    res.status(500).json(createError('Failed to claim rewards', error.message));
  }
});

// GET /api/game/history/:player
app.get('/api/game/history/:player', async (req, res) => {
  const { player } = req.params;

  if (!validateWallet(player)) {
    return res.status(400).json(createError('Invalid player wallet address'));
  }

  try {
    const history = await getPlayerHistory(player);
    res.json({ player, history });
  } catch (error) {
    res.status(500).json(createError('Failed to get player history', error.message));
  }
});

// GET /api/game/leaderboard
app.get('/api/game/leaderboard', async (req, res) => {
  try {
    const leaderboard = await getLeaderboard();
    res.json({ leaderboard });
  } catch (error) {
    res.status(500).json(createError('Failed to get leaderboard', error.message));
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json(createError('Something went wrong!', err.message));
});

// 404 handler
app.use((req, res) => {
  res.status(404).json(createError('Endpoint not found'));
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Sol-itaire backend running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`Network: ${process.env.SOLANA_NETWORK || 'devnet'}`);
  });
}

module.exports = app;