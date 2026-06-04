const express = require('express');
const cors = require('cors');
const { Connection, PublicKey, Keypair, SystemProgram } = require('@solana/web3.js');
const { AnchorProvider, Program, Wallet, BN } = require('@coral-xyz/anchor');
const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const SYSVAR_RENT_PUBKEY = new PublicKey('SysvarRent111111111111111111111111111111111');
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// ===================================================================
// Program IDs (from Anchor.toml)
// ===================================================================
const PROGRAM_IDS = {
  solitaire: process.env.SOLITAIRE_PROGRAM_ID || 'Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS',
  gamingToken: process.env.GAMING_TOKEN_PROGRAM_ID || 'DhkqYC1mAnZ41dgPz6NDLovGM6zxE1j7wHLBAizYkNB8', // gitguardian-ignore: line
  memecoin: process.env.MEMECOIN_PROGRAM_ID || 'A1WF2rG5Vs5tG6nhq2ZeDEN9hyESrWV3dtyq1XdBWkqT'
};

// ===================================================================
// Inline Minimal IDLs
// ===================================================================
const SOLITAIRE_IDL = {
  version: '0.1.0',
  name: 'solitaire',
  instructions: [
    {
      name: 'initializeGame',
      accounts: [
        { name: 'game', isMut: true, isSigner: true },
        { name: 'escrowTokenAccount', isMut: true, isSigner: false },
        { name: 'escrowAuthority', isMut: false, isSigner: false },
        { name: 'userTokenAccount', isMut: true, isSigner: false },
        { name: 'rewardMint', isMut: false, isSigner: false },
        { name: 'authority', isMut: true, isSigner: true },
        { name: 'systemProgram', isMut: false, isSigner: false },
        { name: 'tokenProgram', isMut: false, isSigner: false },
        { name: 'rent', isMut: false, isSigner: false }
      ],
      args: [
        { name: 'gameId', type: 'string' },
        { name: 'stakeAmount', type: 'u64' },
        { name: 'rewardMint', type: 'publicKey' }
      ]
    },
    {
      name: 'makeMove',
      accounts: [
        { name: 'game', isMut: true, isSigner: false },
        { name: 'authority', isMut: true, isSigner: true }
      ],
      args: [
        { name: 'fromPile', type: 'u8' },
        { name: 'toPile', type: 'u8' },
        { name: 'cardIndex', type: 'u8' }
      ]
    },
    {
      name: 'completeGame',
      accounts: [
        { name: 'game', isMut: true, isSigner: false },
        { name: 'escrowTokenAccount', isMut: true, isSigner: false },
        { name: 'escrowAuthority', isMut: false, isSigner: false },
        { name: 'authority', isMut: true, isSigner: false },
        { name: 'userTokenAccount', isMut: true, isSigner: false },
        { name: 'systemProgram', isMut: false, isSigner: false },
        { name: 'tokenProgram', isMut: false, isSigner: false }
      ],
      args: [
        { name: 'finalScore', type: 'u64' }
      ]
    }
  ],
  accounts: [
    {
      name: 'game',
      type: {
        kind: 'struct',
        fields: [
          { name: 'player', type: 'publicKey' },
          { name: 'gameId', type: 'string' },
          { name: 'stakeAmount', type: 'u64' },
          { name: 'score', type: 'u64' },
          { name: 'status', type: 'u8' },
          { name: 'moves', type: 'u32' },
          { name: 'bump', type: 'u8' }
        ]
      }
    }
  ]
};

const GAMING_TOKEN_IDL = {
  version: '0.1.0',
  name: 'gaming_token',
  instructions: [
    {
      name: 'stakeTokens',
      accounts: [
        { name: 'stakeAccount', isMut: true, isSigner: true },
        { name: 'userTokenAccount', isMut: true, isSigner: false },
        { name: 'stakeVault', isMut: true, isSigner: false },
        { name: 'rewardVault', isMut: true, isSigner: false },
        { name: 'authority', isMut: true, isSigner: true },
        { name: 'tokenProgram', isMut: false, isSigner: false },
        { name: 'systemProgram', isMut: false, isSigner: false },
        { name: 'rent', isMut: false, isSigner: false }
      ],
      args: [
        { name: 'amount', type: 'u64' },
        { name: 'lockPeriod', type: 'i64' }
      ]
    },
    {
      name: 'unstakeTokens',
      accounts: [
        { name: 'stakeAccount', isMut: true, isSigner: false },
        { name: 'stakeVault', isMut: true, isSigner: false },
        { name: 'userTokenAccount', isMut: true, isSigner: false },
        { name: 'authority', isMut: true, isSigner: true },
        { name: 'tokenProgram', isMut: false, isSigner: false }
      ],
      args: []
    },
    {
      name: 'claimRewards',
      accounts: [
        { name: 'stakeAccount', isMut: true, isSigner: false },
        { name: 'rewardVault', isMut: true, isSigner: false },
        { name: 'userTokenAccount', isMut: true, isSigner: false },
        { name: 'authority', isMut: true, isSigner: true },
        { name: 'tokenProgram', isMut: false, isSigner: false }
      ],
      args: []
    }
  ],
  accounts: [
    {
      name: 'stakeAccount',
      type: {
        kind: 'struct',
        fields: [
          { name: 'owner', type: 'publicKey' },
          { name: 'mint', type: 'publicKey' },
          { name: 'amount', type: 'u64' },
          { name: 'lockUntil', type: 'i64' },
          { name: 'pendingRewards', type: 'u64' },
          { name: 'bump', type: 'u8' }
        ]
      }
    }
  ]
};

const MEMECOIN_IDL = {
  version: '0.1.0',
  name: 'memecoin',
  instructions: [],
  accounts: []
};

// ===================================================================
// Load IDL helpers
// ===================================================================
function loadIdlFallback(idlPath, fallback) {
  try {
    if (fs.existsSync(idlPath)) {
      const raw = fs.readFileSync(idlPath, 'utf8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn(`Failed to load IDL from ${idlPath}, using fallback:`, e.message);
  }
  return fallback;
}

// ===================================================================
// Solana Service Layer
// ===================================================================
let provider = null;
let solitaireProgram = null;
let gamingTokenProgram = null;
let memecoinProgram = null;

function getProvider() {
  if (provider) return provider;

  const network = process.env.SOLANA_NETWORK || 'devnet';
  const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
  const connection = new Connection(rpcUrl, 'processed');

  let keypair;
  const keypairEnv = process.env.SOLANA_WALLET_KEYPAIR;
  if (keypairEnv) {
    try {
      const secretKey = JSON.parse(keypairEnv);
      keypair = Keypair.fromSecretKey(new Uint8Array(secretKey));
    } catch (e) {
      const decoded = Buffer.from(keypairEnv, 'base64');
      keypair = Keypair.fromSecretKey(new Uint8Array(decoded));
    }
  } else {
    keypair = Keypair.generate();
  }

  const wallet = new Wallet(keypair);
  provider = new AnchorProvider(connection, wallet, { commitment: 'processed' });
  return provider;
}

function initPrograms() {
  if (solitaireProgram && gamingTokenProgram && memecoinProgram) return;

  const provider = getProvider();

  const solitaireIdl = loadIdlFallback(
    path.join(__dirname, '../../programs/solitaire/target/idl/solitaire.json'),
    SOLITAIRE_IDL
  );
  solitaireProgram = new Program(solitaireIdl, new PublicKey(PROGRAM_IDS.solitaire), provider);

  const gamingTokenIdl = loadIdlFallback(
    path.join(__dirname, '../../programs/gaming-token/target/idl/gaming_token.json'),
    GAMING_TOKEN_IDL
  );
  gamingTokenProgram = new Program(gamingTokenIdl, new PublicKey(PROGRAM_IDS.gamingToken), provider);

  const memecoinIdl = loadIdlFallback(
    path.join(__dirname, '../../programs/memecoin/target/idl/memecoin.json'),
    MEMECOIN_IDL
  );
  memecoinProgram = new Program(memecoinIdl, new PublicKey(PROGRAM_IDS.memecoin), provider);
}

function getSolitaireProgram() {
  initPrograms();
  return solitaireProgram;
}

function getGamingTokenProgram() {
  initPrograms();
  return gamingTokenProgram;
}

function getMemecoinProgram() {
  initPrograms();
  return memecoinProgram;
}

function findGamePDA(playerPubkey, gameId) {
  const programId = new PublicKey(PROGRAM_IDS.solitaire);
  const seeds = [
    Buffer.from('game'),
    playerPubkey.toBuffer(),
    Buffer.from(gameId)
  ];
  return PublicKey.findProgramAddressSync(seeds, programId);
}

function findEscrowPDA(gameId) {
  const programId = new PublicKey(PROGRAM_IDS.solitaire);
  const seeds = [Buffer.from('escrow'), Buffer.from(gameId)];
  return PublicKey.findProgramAddressSync(seeds, programId);
}

function findEscrowAuthorityPDA(gameId) {
  const programId = new PublicKey(PROGRAM_IDS.solitaire);
  const seeds = [Buffer.from('escrow_authority'), Buffer.from(gameId)];
  return PublicKey.findProgramAddressSync(seeds, programId);
}

function findStakeVaultPDA(mint) {
  const programId = new PublicKey(PROGRAM_IDS.gamingToken);
  const seeds = [Buffer.from('stake_vault'), new PublicKey(mint).toBuffer()];
  return PublicKey.findProgramAddressSync(seeds, programId);
}

function findRewardVaultPDA(mint) {
  const programId = new PublicKey(PROGRAM_IDS.gamingToken);
  const seeds = [Buffer.from('reward_vault'), new PublicKey(mint).toBuffer()];
  return PublicKey.findProgramAddressSync(seeds, programId);
}

function findStakeAccountPDA(playerWallet, mint) {
  const programId = new PublicKey(PROGRAM_IDS.gamingToken);
  const seeds = [
    Buffer.from('stake_account'),
    new PublicKey(playerWallet).toBuffer(),
    new PublicKey(mint).toBuffer()
  ];
  return PublicKey.findProgramAddressSync(seeds, programId);
}

// ===================================================================
// MongoDB Cache Layer
// ===================================================================
let mongoDb = null;
let mongoClient = null;

async function connectMongoDB() {
  if (mongoDb) return mongoDb;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.log('MONGODB_URI not provided, running without MongoDB cache');
    return null;
  }

  try {
    mongoClient = new MongoClient(uri);
    await mongoClient.connect();
    const db = mongoClient.db('solitaire');

    await db.collection('gameHistory').createIndex({ player: 1, createdAt: -1 });
    await db.collection('leaderboard').createIndex({ score: -1 });

    mongoDb = db;
    console.log('Connected to MongoDB');
    return mongoDb;
  } catch (error) {
    console.warn('MongoDB connection failed, running without cache:', error.message);
    if (mongoClient) {
      await mongoClient.close();
      mongoClient = null;
    }
    return null;
  }
}

async function cacheGameState(gameData) {
  const db = await connectMongoDB();
  if (!db) return;

  const record = {
    ...gameData,
    updatedAt: new Date()
  };
  await db.collection('gameHistory').updateOne(
    { gameId: gameData.gameId, player: gameData.player },
    { $set: record, $setOnInsert: { createdAt: new Date() } },
    { upsert: true }
  );
}

async function getPlayerHistory(player) {
  const db = await connectMongoDB();
  if (!db) return [];

  const history = await db.collection('gameHistory')
    .find({ player })
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray();

  return history.map(h => ({
    gameId: h.gameId,
    status: h.status,
    score: h.score,
    moves: h.moves,
    won: h.won,
    createdAt: h.createdAt,
    updatedAt: h.updatedAt
  }));
}

async function updateLeaderboard(player, score, won) {
  const db = await connectMongoDB();
  if (!db) return;

  await db.collection('leaderboard').updateOne(
    { player },
    {
      $inc: {
        gamesPlayed: 1,
        gamesWon: won ? 1 : 0,
        totalRewards: won ? score : 0,
        score: score
      },
      $set: {
        player,
        updatedAt: new Date()
      },
      $setOnInsert: {
        gamesPlayed: 0,
        gamesWon: 0,
        totalRewards: 0,
        score: 0
      }
    },
    { upsert: true }
  );
}

async function getLeaderboard() {
  const db = await connectMongoDB();
  if (!db) return [];

  const leaderboard = await db.collection('leaderboard')
    .find({})
    .sort({ score: -1 })
    .limit(50)
    .toArray();

  return leaderboard.map(l => ({
    player: l.player,
    score: l.score,
    gamesPlayed: l.gamesPlayed,
    gamesWon: l.gamesWon,
    totalRewards: l.totalRewards,
    updatedAt: l.updatedAt
  }));
}

// ===================================================================
// Validation helpers
// ===================================================================
function validateWalletAddress(address) {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

function validateRequiredFields(req, fields) {
  const missing = [];
  for (const field of fields) {
    if (!req.body[field]) {
      missing.push(field);
    }
  }
  return missing;
}

function structuredError(error, details) {
  return {
    error: error.message || 'Unknown error',
    details: details || (error.code && error.code.toString()),
    timestamp: new Date().toISOString()
  };
}

// ===================================================================
// Existing Endpoints
// ===================================================================

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

// ===================================================================
// New Solana Game Endpoints
// ===================================================================

// POST /api/game/initialize
app.post('/api/game/initialize', async (req, res) => {
  const missing = validateRequiredFields(req, ['gameId', 'playerWallet', 'stakeAmount', 'rewardMint']);
  if (missing.length > 0) {
    return res.status(400).json({
      error: `Missing required fields: ${missing.join(', ')}`,
      timestamp: new Date().toISOString()
    });
  }

  const { gameId, playerWallet, stakeAmount, rewardMint } = req.body;

  if (!validateWalletAddress(playerWallet)) {
    return res.status(400).json({
      error: 'Invalid playerWallet address',
      timestamp: new Date().toISOString()
    });
  }

  if (!validateWalletAddress(rewardMint)) {
    return res.status(400).json({
      error: 'Invalid rewardMint address',
      timestamp: new Date().toISOString()
    });
  }

  try {
    const program = getSolitaireProgram();
    const playerPubkey = new PublicKey(playerWallet);

    const [gamePDA] = findGamePDA(playerPubkey, gameId);
    const [escrowPDA] = findEscrowPDA(gameId);
    const [escrowAuthority] = findEscrowAuthorityPDA(gameId);

    const tx = await program.methods
      .initializeGame(gameId, new BN(stakeAmount), new PublicKey(rewardMint))
      .accounts({
        game: gamePDA,
        escrowTokenAccount: escrowPDA,
        escrowAuthority,
        userTokenAccount: playerPubkey,
        rewardMint: new PublicKey(rewardMint),
        authority: playerPubkey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY
      })
      .rpc();

    await cacheGameState({
      player: playerWallet,
      gameId,
      status: 'active',
      score: 0,
      moves: 0,
      won: false
    });

    res.json({
      success: true,
      txSignature: tx,
      gameId,
      player: playerWallet,
      stakeAmount
    });
  } catch (error) {
    console.error('Initialize game error:', error);
    res.status(500).json(structuredError(error, 'Failed to initialize game'));
  }
});

// POST /api/game/move
app.post('/api/game/move', async (req, res) => {
  const missing = validateRequiredFields(req, ['gameId', 'playerWallet', 'fromPile', 'toPile', 'cardIndex']);
  if (missing.length > 0) {
    return res.status(400).json({
      error: `Missing required fields: ${missing.join(', ')}`,
      timestamp: new Date().toISOString()
    });
  }

  const { gameId, playerWallet, fromPile, toPile, cardIndex } = req.body;

  if (!validateWalletAddress(playerWallet)) {
    return res.status(400).json({
      error: 'Invalid playerWallet address',
      timestamp: new Date().toISOString()
    });
  }

  try {
    const program = getSolitaireProgram();
    const playerPubkey = new PublicKey(playerWallet);
    const [gamePDA] = findGamePDA(playerPubkey, gameId);

    const tx = await program.methods
      .makeMove(new BN(fromPile), new BN(toPile), new BN(cardIndex))
      .accounts({
        game: gamePDA,
        authority: playerPubkey
      })
      .rpc();

    await cacheGameState({
      player: playerWallet,
      gameId,
      status: 'active',
      moves: (req.body.moves || 0) + 1
    });

    res.json({
      success: true,
      txSignature: tx,
      moves: (req.body.moves || 0) + 1
    });
  } catch (error) {
    console.error('Make move error:', error);
    res.status(500).json(structuredError(error, 'Failed to make move'));
  }
});

// POST /api/game/complete
app.post('/api/game/complete', async (req, res) => {
  const missing = validateRequiredFields(req, ['gameId', 'playerWallet', 'finalScore']);
  if (missing.length > 0) {
    return res.status(400).json({
      error: `Missing required fields: ${missing.join(', ')}`,
      timestamp: new Date().toISOString()
    });
  }

  const { gameId, playerWallet, finalScore } = req.body;

  if (!validateWalletAddress(playerWallet)) {
    return res.status(400).json({
      error: 'Invalid playerWallet address',
      timestamp: new Date().toISOString()
    });
  }

  try {
    const program = getSolitaireProgram();
    const playerPubkey = new PublicKey(playerWallet);
    const [gamePDA] = findGamePDA(playerPubkey, gameId);
    const [escrowPDA] = findEscrowPDA(gameId);
    const [escrowAuthority] = findEscrowAuthorityPDA(gameId);

    const tx = await program.methods
      .completeGame(new BN(finalScore))
      .accounts({
        game: gamePDA,
        escrowTokenAccount: escrowPDA,
        escrowAuthority,
        authority: playerPubkey,
        userTokenAccount: playerPubkey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID
      })
      .rpc();

    const won = finalScore > 0;
    const stakeAmount = req.body.stakeAmount || 0;
    const rewardAmount = won ? stakeAmount * 2 : Math.floor(stakeAmount / 2);

    await cacheGameState({
      player: playerWallet,
      gameId,
      status: 'completed',
      score: finalScore,
      won,
      moves: req.body.moves || 0
    });

    await updateLeaderboard(playerWallet, finalScore, won);

    res.json({
      success: true,
      txSignature: tx,
      gameId,
      score: finalScore,
      won,
      rewardAmount
    });
  } catch (error) {
    console.error('Complete game error:', error);
    res.status(500).json(structuredError(error, 'Failed to complete game'));
  }
});

// POST /api/game/stake
app.post('/api/game/stake', async (req, res) => {
  const missing = validateRequiredFields(req, ['playerWallet', 'mint', 'amount', 'lockPeriod']);
  if (missing.length > 0) {
    return res.status(400).json({
      error: `Missing required fields: ${missing.join(', ')}`,
      timestamp: new Date().toISOString()
    });
  }

  const { playerWallet, mint, amount, lockPeriod } = req.body;

  if (!validateWalletAddress(playerWallet) || !validateWalletAddress(mint)) {
    return res.status(400).json({
      error: 'Invalid wallet or mint address',
      timestamp: new Date().toISOString()
    });
  }

  try {
    const program = getGamingTokenProgram();
    const playerPubkey = new PublicKey(playerWallet);
    const mintPubkey = new PublicKey(mint);

    const [stakePDA] = findStakeAccountPDA(playerWallet, mint);
    const [stakeVault] = findStakeVaultPDA(mint);
    const [rewardVault] = findRewardVaultPDA(mint);

    const lockUntil = Math.floor(Date.now() / 1000) + parseInt(lockPeriod);

    const tx = await program.methods
      .stakeTokens(new BN(amount), new BN(lockPeriod))
      .accounts({
        stakeAccount: stakePDA,
        userTokenAccount: playerPubkey,
        stakeVault,
        rewardVault,
        authority: playerPubkey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY
      })
      .rpc();

    res.json({
      success: true,
      txSignature: tx,
      amount,
      lockUntil
    });
  } catch (error) {
    console.error('Stake error:', error);
    res.status(500).json(structuredError(error, 'Failed to stake tokens'));
  }
});

// POST /api/game/unstake
app.post('/api/game/unstake', async (req, res) => {
  const missing = validateRequiredFields(req, ['playerWallet', 'mint']);
  if (missing.length > 0) {
    return res.status(400).json({
      error: `Missing required fields: ${missing.join(', ')}`,
      timestamp: new Date().toISOString()
    });
  }

  const { playerWallet, mint } = req.body;

  if (!validateWalletAddress(playerWallet) || !validateWalletAddress(mint)) {
    return res.status(400).json({
      error: 'Invalid wallet or mint address',
      timestamp: new Date().toISOString()
    });
  }

  try {
    const program = getGamingTokenProgram();
    const playerPubkey = new PublicKey(playerWallet);
    const mintPubkey = new PublicKey(mint);

    const [stakePDA] = findStakeAccountPDA(playerWallet, mint);
    const [stakeVault] = findStakeVaultPDA(mint);

    const stakeAccount = await program.account.stakeAccount.fetch(stakePDA);
    const principal = stakeAccount.amount.toNumber();
    const reward = Math.floor(principal * 0.05);
    const total = principal + reward;

    const tx = await program.methods
      .unstakeTokens()
      .accounts({
        stakeAccount: stakePDA,
        stakeVault,
        userTokenAccount: playerPubkey,
        authority: playerPubkey,
        tokenProgram: TOKEN_PROGRAM_ID
      })
      .rpc();

    res.json({
      success: true,
      txSignature: tx,
      principal,
      reward,
      total
    });
  } catch (error) {
    console.error('Unstake error:', error);
    res.status(500).json(structuredError(error, 'Failed to unstake tokens'));
  }
});

// POST /api/game/claim
app.post('/api/game/claim', async (req, res) => {
  const missing = validateRequiredFields(req, ['playerWallet', 'mint']);
  if (missing.length > 0) {
    return res.status(400).json({
      error: `Missing required fields: ${missing.join(', ')}`,
      timestamp: new Date().toISOString()
    });
  }

  const { playerWallet, mint } = req.body;

  if (!validateWalletAddress(playerWallet) || !validateWalletAddress(mint)) {
    return res.status(400).json({
      error: 'Invalid wallet or mint address',
      timestamp: new Date().toISOString()
    });
  }

  try {
    const program = getGamingTokenProgram();
    const playerPubkey = new PublicKey(playerWallet);
    const mintPubkey = new PublicKey(mint);

    const [stakePDA] = findStakeAccountPDA(playerWallet, mint);
    const [rewardVault] = findRewardVaultPDA(mint);

    const stakeAccount = await program.account.stakeAccount.fetch(stakePDA);
    const rewardAmount = stakeAccount.pendingRewards.toNumber();

    const tx = await program.methods
      .claimRewards()
      .accounts({
        stakeAccount: stakePDA,
        rewardVault,
        userTokenAccount: playerPubkey,
        authority: playerPubkey,
        tokenProgram: TOKEN_PROGRAM_ID
      })
      .rpc();

    res.json({
      success: true,
      txSignature: tx,
      rewardAmount
    });
  } catch (error) {
    console.error('Claim rewards error:', error);
    res.status(500).json(structuredError(error, 'Failed to claim rewards'));
  }
});

// GET /api/game/history/:player
app.get('/api/game/history/:player', async (req, res) => {
  const { player } = req.params;

  if (!validateWalletAddress(player)) {
    return res.status(400).json({
      error: 'Invalid player address',
      timestamp: new Date().toISOString()
    });
  }

  try {
    const history = await getPlayerHistory(player);
    res.json({
      player,
      history
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json(structuredError(error, 'Failed to fetch player history'));
  }
});

// GET /api/game/leaderboard
app.get('/api/game/leaderboard', async (req, res) => {
  try {
    const leaderboard = await getLeaderboard();
    res.json({
      leaderboard
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json(structuredError(error, 'Failed to fetch leaderboard'));
  }
});

// ===================================================================
// Error handling middleware
// ===================================================================
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// ===================================================================
// Startup
// ===================================================================
async function start() {
  try {
    await connectMongoDB();
    initPrograms();

    app.listen(PORT, () => {
      console.log(`Sol-itaire backend running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log(`Network: ${process.env.SOLANA_NETWORK || 'devnet'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

module.exports = app;
