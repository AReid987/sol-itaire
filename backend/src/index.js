const express = require('express');
const cors = require('cors');
const { Connection, PublicKey, Keypair, LAMPORTS_PER_SOL, SystemProgram, SYSVAR_RENT_PUBKEY } = require('@solana/web3.js');
const { AnchorProvider, Program, Wallet, BN } = require('@coral-xyz/anchor');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const PROGRAM_IDS = {
  solitaire: 'Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS',
  gaming_token: 'DhkqYC1mAnZ41dgPz6NDLovGM6zxE1j7wHLBAizYkNB8',
  memecoin: 'A1WF2rG5Vs5tG6nhq2ZeDEN9hyESrWV3dtyq1XdBWkqT'
};

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
        { name: 'userTokenAccount', isMut: false, isSigner: false },
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
        { name: 'fromPile', type: 'string' },
        { name: 'toPile', type: 'string' },
        { name: 'cardIndex', type: 'u8' }
      ]
    },
    {
      name: 'completeGame',
      accounts: [
        { name: 'game', isMut: false, isSigner: false },
        { name: 'escrowTokenAccount', isMut: true, isSigner: false },
        { name: 'escrowAuthority', isMut: false, isSigner: false },
        { name: 'userTokenAccount', isMut: true, isSigner: false },
        { name: 'authority', isMut: true, isSigner: true },
        { name: 'tokenProgram', isMut: false, isSigner: false }
      ],
      args: [
        { name: 'finalScore', type: 'u64' }
      ]
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
        { name: 'mint', isMut: false, isSigner: false },
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
        { name: 'userTokenAccount', isMut: true, isSigner: false },
        { name: 'stakeVault', isMut: true, isSigner: false },
        { name: 'mint', isMut: false, isSigner: false },
        { name: 'authority', isMut: true, isSigner: true },
        { name: 'tokenProgram', isMut: false, isSigner: false }
      ],
      args: []
    },
    {
      name: 'claimRewards',
      accounts: [
        { name: 'stakeAccount', isMut: true, isSigner: false },
        { name: 'userTokenAccount', isMut: true, isSigner: false },
        { name: 'rewardVault', isMut: true, isSigner: false },
        { name: 'mint', isMut: false, isSigner: false },
        { name: 'authority', isMut: true, isSigner: true },
        { name: 'tokenProgram', isMut: false, isSigner: false }
      ],
      args: []
    }
  ]
};

const MEMECOIN_IDL = {
  version: '0.1.0',
  name: 'memecoin',
  instructions: [
    {
      name: 'transfer',
      accounts: [
        { name: 'from', isMut: true, isSigner: true },
        { name: 'to', isMut: true, isSigner: false },
        { name: 'mint', isMut: false, isSigner: false },
        { name: 'authority', isMut: false, isSigner: true },
        { name: 'tokenProgram', isMut: false, isSigner: false }
      ],
      args: [
        { name: 'amount', type: 'u64' }
      ]
    }
  ]
};

let solanaProvider = null;
let solitaireProgram = null;
let gamingTokenProgram = null;
let memecoinProgram = null;
let mongoDb = null;

function getProvider() {
  if (solanaProvider) return solanaProvider;
  const network = process.env.SOLANA_NETWORK || 'devnet';
  const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
  const connection = new Connection(rpcUrl, 'confirmed');
  const keypairPath = process.env.SOLANA_WALLET_KEYPAIR;
  let keypair;
  if (keypairPath) {
    try {
      const keypairData = require(keypairPath);
      keypair = Keypair.fromSecretKey(Uint8Array.from(keypairData));
    } catch (err) {
      keypair = Keypair.generate();
    }
  } else {
    keypair = Keypair.generate();
  }
  const wallet = new Wallet(keypair);
  solanaProvider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
  return solanaProvider;
}

function getSolitaireProgram() {
  if (solitaireProgram) return solitaireProgram;
  const programId = new PublicKey(PROGRAM_IDS.solitaire);
  solitaireProgram = new Program(SOLITAIRE_IDL, programId, getProvider());
  return solitaireProgram;
}

function getGamingTokenProgram() {
  if (gamingTokenProgram) return gamingTokenProgram;
  const programId = new PublicKey(PROGRAM_IDS.gaming_token);
  gamingTokenProgram = new Program(GAMING_TOKEN_IDL, programId, getProvider());
  return gamingTokenProgram;
}

function getMemecoinProgram() {
  if (memecoinProgram) return memecoinProgram;
  const programId = new PublicKey(PROGRAM_IDS.memecoin);
  memecoinProgram = new Program(MEMECOIN_IDL, programId, getProvider());
  return memecoinProgram;
}

function findGamePDA(playerPubkey, gameId) {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('game'), playerPubkey.toBuffer(), Buffer.from(gameId)],
    new PublicKey(PROGRAM_IDS.solitaire)
  );
  return pda;
}

function findEscrowPDA(gameId) {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('escrow'), Buffer.from(gameId)],
    new PublicKey(PROGRAM_IDS.solitaire)
  );
  return pda;
}

function findEscrowAuthorityPDA(gameId) {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('escrow_authority'), Buffer.from(gameId)],
    new PublicKey(PROGRAM_IDS.solitaire)
  );
  return pda;
}

async function connectMongoDB() {
  if (mongoDb) return mongoDb;
  const uri = process.env.MONGODB_URI;
  if (!uri) return null;
  try {
    const client = new MongoClient(uri);
    await client.connect();
    mongoDb = client.db('solitaire');
    await mongoDb.collection('gameHistory').createIndex({ player: 1, createdAt: -1 });
    await mongoDb.collection('leaderboard').createIndex({ score: -1 });
    await mongoDb.collection('stakeRecords').createIndex({ player: 1, mint: 1 });
    return mongoDb;
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    return null;
  }
}

async function cacheGameState(gameData) {
  const db = await connectMongoDB();
  if (!db) return;
  const collection = db.collection('gameHistory');
  await collection.updateOne(
    { gameId: gameData.gameId },
    {
      $set: {
        player: gameData.player,
        gameId: gameData.gameId,
        status: gameData.status,
        score: gameData.score || 0,
        moves: gameData.moves || 0,
        won: gameData.won || false,
        updatedAt: new Date()
      },
      $setOnInsert: { createdAt: new Date() }
    },
    { upsert: true }
  );
}

async function getPlayerHistory(player) {
  const db = await connectMongoDB();
  if (!db) return [];
  const collection = db.collection('gameHistory');
  return await collection.find({ player }).sort({ createdAt: -1 }).limit(100).toArray();
}

async function updateLeaderboard(player, score, won) {
  const db = await connectMongoDB();
  if (!db) return;
  const collection = db.collection('leaderboard');
  const increment = won ? { $inc: { score, gamesPlayed: 1, gamesWon: 1, totalRewards: score }, $set: { player, updatedAt: new Date() } } : { $inc: { gamesPlayed: 1 }, $set: { player, updatedAt: new Date() } };
  await collection.updateOne({ player }, increment, { upsert: true });
}

async function getLeaderboard() {
  const db = await connectMongoDB();
  if (!db) return [];
  const collection = db.collection('leaderboard');
  return await collection.find({}).sort({ score: -1 }).limit(50).toArray();
}

function validatePublicKey(address) {
  try {
    return new PublicKey(address);
  } catch (err) {
    throw new Error('Invalid Solana public key address');
  }
}

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString(), service: 'sol-itaire-backend' });
});

app.get('/api/games/stats', (req, res) => {
  res.json({ totalGames: 0, activePlayers: 0, totalRewards: 0, network: process.env.SOLANA_NETWORK || 'devnet' });
});

app.get('/api/tokens', (req, res) => {
  res.json({
    gamingToken: {
      address: process.env.GAMING_TOKEN_MINT_ADDRESS || PROGRAM_IDS.gaming_token,
      symbol: 'SOL-IT',
      name: 'Solitaire Gaming Token'
    },
    memecoin: {
      address: process.env.MEMECOIN_MINT_ADDRESS || PROGRAM_IDS.memecoin,
      symbol: 'SOL-COIN',
      name: 'Solitaire Memecoin'
    }
  });
});

app.get('/api/network', (req, res) => {
  res.json({ network: process.env.SOLANA_NETWORK || 'devnet', rpc: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com', commitment: 'confirmed' });
});

app.post('/api/faucet/request', async (req, res) => {
  const { address, network } = req.body;
  if (!address) return res.status(400).json({ error: 'Wallet address required' });
  try {
    res.json({ success: true, message: 'SOL requested successfully', amount: '1 SOL', network: network || 'devnet' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to request SOL' });
  }
});

app.post('/api/game/initialize', async (req, res) => {
  try {
    const { gameId, playerWallet, stakeAmount, rewardMint } = req.body;
    if (!gameId || !playerWallet || !stakeAmount || !rewardMint) {
      return res.status(400).json({ error: 'All fields are required: gameId, playerWallet, stakeAmount, rewardMint', timestamp: new Date().toISOString() });
    }
    const playerPubkey = validatePublicKey(playerWallet);
    const rewardMintPubkey = validatePublicKey(rewardMint);
    const program = getSolitaireProgram();
    const gamePDA = findGamePDA(playerPubkey, gameId);
    const escrowPDA = findEscrowPDA(gameId);
    const escrowAuthorityPDA = findEscrowAuthorityPDA(gameId);
    const tx = await program.methods
      .initializeGame(gameId, new BN(stakeAmount), rewardMintPubkey.toBase58())
      .accounts({
        game: gamePDA,
        escrowTokenAccount: escrowPDA,
        escrowAuthority: escrowAuthorityPDA,
        userTokenAccount: playerPubkey,
        rewardMint: rewardMintPubkey,
        authority: playerPubkey,
        systemProgram: SystemProgram.programId,
        tokenProgram: new PublicKey('TokenzQdBNbLqP5VEh89ASGF8P25BN8fG9vex9HVzVL'),
        rent: SYSVAR_RENT_PUBKEY
      })
      .rpc();
    await cacheGameState({ player: playerPubkey.toBase58(), gameId, status: 'active', score: 0, moves: 0, won: false });
    return res.json({ success: true, txSignature: tx, gameId, player: playerPubkey.toBase58(), stakeAmount });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to initialize game', details: error.message, timestamp: new Date().toISOString() });
  }
});

app.post('/api/game/move', async (req, res) => {
  try {
    const { gameId, playerWallet, fromPile, toPile, cardIndex } = req.body;
    if (!gameId || !playerWallet || !fromPile || !toPile || typeof cardIndex !== 'number') {
      return res.status(400).json({ error: 'All fields are required: gameId, playerWallet, fromPile, toPile, cardIndex', timestamp: new Date().toISOString() });
    }
    const playerPubkey = validatePublicKey(playerWallet);
    const gamePDA = findGamePDA(playerPubkey, gameId);
    const program = getSolitaireProgram();
    const tx = await program.methods
      .makeMove(fromPile, toPile, cardIndex)
      .accounts({ game: gamePDA, authority: playerPubkey })
      .rpc();
    await cacheGameState({ player: playerPubkey.toBase58(), gameId, status: 'active', moves: 1 });
    return res.json({ success: true, txSignature: tx, moves: 1 });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to make move', details: error.message, timestamp: new Date().toISOString() });
  }
});

app.post('/api/game/complete', async (req, res) => {
  try {
    const { gameId, playerWallet, finalScore } = req.body;
    if (!gameId || !playerWallet || typeof finalScore !== 'number') {
      return res.status(400).json({ error: 'All fields are required: gameId, playerWallet, finalScore', timestamp: new Date().toISOString() });
    }
    const playerPubkey = validatePublicKey(playerWallet);
    const gamePDA = findGamePDA(playerPubkey, gameId);
    const escrowPDA = findEscrowPDA(gameId);
    const escrowAuthorityPDA = findEscrowAuthorityPDA(gameId);
    const program = getSolitaireProgram();
    const tx = await program.methods
      .completeGame(new BN(finalScore))
      .accounts({
        game: gamePDA,
        escrowTokenAccount: escrowPDA,
        escrowAuthority: escrowAuthorityPDA,
        userTokenAccount: playerPubkey,
        authority: playerPubkey,
        tokenProgram: new PublicKey('TokenzQdBNbLqP5VEh89ASGF8P25BN8fG9vex9HVzVL')
      })
      .rpc();
    const stakeAmount = 0;
    const won = finalScore > 0;
    const rewardAmount = won ? stakeAmount * 2 : Math.floor(stakeAmount / 2);
    await cacheGameState({ player: playerPubkey.toBase58(), gameId, status: 'completed', score: finalScore, won, moves: 0 });
    await updateLeaderboard(playerPubkey.toBase58(), finalScore, won);
    return res.json({ success: true, txSignature: tx, gameId, score: finalScore, won, rewardAmount });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to complete game', details: error.message, timestamp: new Date().toISOString() });
  }
});

app.post('/api/game/stake', async (req, res) => {
  try {
    const { playerWallet, mint, amount, lockPeriod } = req.body;
    if (!playerWallet || !mint || !amount || typeof lockPeriod !== 'number') {
      return res.status(400).json({ error: 'All fields are required: playerWallet, mint, amount, lockPeriod', timestamp: new Date().toISOString() });
    }
    const playerPubkey = validatePublicKey(playerWallet);
    const mintPubkey = validatePublicKey(mint);
    const program = getGamingTokenProgram();
    const [stakeVault] = PublicKey.findProgramAddressSync([Buffer.from('stake_vault'), mintPubkey.toBuffer()], program.programId);
    const [rewardVault] = PublicKey.findProgramAddressSync([Buffer.from('reward_vault'), mintPubkey.toBuffer()], program.programId);
    const [stakeAccount] = PublicKey.findProgramAddressSync([Buffer.from('stake'), playerPubkey.toBuffer(), mintPubkey.toBuffer()], program.programId);
    const tx = await program.methods
      .stakeTokens(new BN(amount), new BN(lockPeriod))
      .accounts({
        stakeAccount,
        userTokenAccount: playerPubkey,
        stakeVault,
        mint: mintPubkey,
        authority: playerPubkey,
        tokenProgram: new PublicKey('TokenzQdBNbLqP5VEh89ASGF8P25BN8fG9vex9HVzVL'),
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY
      })
      .rpc();
    const lockUntil = new Date(Date.now() + lockPeriod * 1000).toISOString();
    const db = await connectMongoDB();
    if (db) {
      await db.collection('stakeRecords').updateOne({ player: playerPubkey.toBase58(), mint: mintPubkey.toBase58() }, { $set: { amount, lockPeriod, lockUntil, active: true, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } }, { upsert: true });
    }
    return res.json({ success: true, txSignature: tx, amount, lockUntil });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to stake tokens', details: error.message, timestamp: new Date().toISOString() });
  }
});

app.post('/api/game/unstake', async (req, res) => {
  try {
    const { playerWallet, mint } = req.body;
    if (!playerWallet || !mint) {
      return res.status(400).json({ error: 'All fields are required: playerWallet, mint', timestamp: new Date().toISOString() });
    }
    const playerPubkey = validatePublicKey(playerWallet);
    const mintPubkey = validatePublicKey(mint);
    const program = getGamingTokenProgram();
    const [stakeAccount] = PublicKey.findProgramAddressSync([Buffer.from('stake'), playerPubkey.toBuffer(), mintPubkey.toBuffer()], program.programId);
    const [stakeVault] = PublicKey.findProgramAddressSync([Buffer.from('stake_vault'), mintPubkey.toBuffer()], program.programId);
    const [rewardVault] = PublicKey.findProgramAddressSync([Buffer.from('reward_vault'), mintPubkey.toBuffer()], program.programId);
    const tx = await program.methods
      .unstakeTokens()
      .accounts({
        stakeAccount,
        userTokenAccount: playerPubkey,
        stakeVault,
        mint: mintPubkey,
        authority: playerPubkey,
        tokenProgram: new PublicKey('TokenzQdBNbLqP5VEh89ASGF8P25BN8fG9vex9HVzVL')
      })
      .rpc();
    const db = await connectMongoDB();
    let principal = 0;
    let reward = 0;
    if (db) {
      const record = await db.collection('stakeRecords').findOne({ player: playerPubkey.toBase58(), mint: mintPubkey.toBase58() });
      if (record) {
        principal = record.amount || 0;
        reward = Math.floor(principal * 0.05);
        await db.collection('stakeRecords').updateOne({ player: playerPubkey.toBase58(), mint: mintPubkey.toBase58() }, { $set: { active: false } });
      }
    }
    return res.json({ success: true, txSignature: tx, principal, reward, total: principal + reward });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to unstake tokens', details: error.message, timestamp: new Date().toISOString() });
  }
});

app.post('/api/game/claim', async (req, res) => {
  try {
    const { playerWallet, mint } = req.body;
    if (!playerWallet || !mint) {
      return res.status(400).json({ error: 'All fields are required: playerWallet, mint', timestamp: new Date().toISOString() });
    }
    const playerPubkey = validatePublicKey(playerWallet);
    const mintPubkey = validatePublicKey(mint);
    const program = getGamingTokenProgram();
    const [stakeAccount] = PublicKey.findProgramAddressSync([Buffer.from('stake'), playerPubkey.toBuffer(), mintPubkey.toBuffer()], program.programId);
    const [rewardVault] = PublicKey.findProgramAddressSync([Buffer.from('reward_vault'), mintPubkey.toBuffer()], program.programId);
    const tx = await program.methods
      .claimRewards()
      .accounts({
        stakeAccount,
        userTokenAccount: playerPubkey,
        rewardVault,
        mint: mintPubkey,
        authority: playerPubkey,
        tokenProgram: new PublicKey('TokenzQdBNbLqP5VEh89ASGF8P25BN8fG9vex9HVzVL')
      })
      .rpc();
    const db = await connectMongoDB();
    let rewardAmount = 0;
    if (db) {
      const record = await db.collection('stakeRecords').findOne({ player: playerPubkey.toBase58(), mint: mintPubkey.toBase58() });
      if (record) {
        rewardAmount = Math.floor((record.amount || 0) * 0.05);
      }
    }
    return res.json({ success: true, txSignature: tx, rewardAmount });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to claim rewards', details: error.message, timestamp: new Date().toISOString() });
  }
});

app.get('/api/game/history/:player', async (req, res) => {
  try {
    const player = req.params.player;
    const history = await getPlayerHistory(player);
    return res.json({ player, history });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch player history', details: error.message, timestamp: new Date().toISOString() });
  }
});

app.get('/api/game/leaderboard', async (req, res) => {
  try {
    const leaderboard = await getLeaderboard();
    return res.json({ leaderboard });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch leaderboard', details: error.message, timestamp: new Date().toISOString() });
  }
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

async function startServer() {
  if (process.env.MONGODB_URI) {
    await connectMongoDB();
  }
  app.listen(PORT, () => {
    console.log(`🚀 Sol-itaire backend running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🌐 Network: ${process.env.SOLANA_NETWORK || 'devnet'}`);
  });
}

if (require.main === module) {
  startServer().catch(console.error);
}

module.exports = app;
