import { Router } from 'express';
import { z } from 'zod';
import { getDatabase } from '../config/database';
import { logger } from '../utils/logger';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { validateBody, validateParams, commonSchemas } from '../middleware/validation';
import { AuthRequest, requireUser } from '../middleware/auth';
import { ApiResponse, Game, GameCreateRequest, GameUpdateRequest } from '../types';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';

const router = Router();

// Validation schemas
const gameCreateSchema = z.object({
  stake_amount: commonSchemas.positiveNumber.max(10000),
  wallet_address: z.string().min(32),
  signature: z.string(),
});

const gameUpdateSchema = z.object({
  game_data: z.object({
    deck: z.array(z.any()).optional(),
    tableau: z.array(z.any()).optional(),
    foundation: z.array(z.any()).optional(),
    stock: z.any().optional(),
    waste: z.any().optional(),
    moves: z.array(z.any()).optional(),
    current_time: z.number().optional(),
  }).optional(),
  moves_count: commonSchemas.nonNegativeNumber.optional(),
  time_elapsed: commonSchemas.nonNegativeNumber.optional(),
  status: commonSchemas.gameStatus.optional(),
  result: commonSchemas.gameResult.optional(),
  score: commonSchemas.nonNegativeNumber.optional(),
});

const gameParamsSchema = z.object({
  id: commonSchemas.uuid,
});

const gameQuerySchema = z.object({
  status: commonSchemas.gameStatus.optional(),
  result: commonSchemas.gameResult.optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

// Verify Solana transaction for game stake
async function verifyStakeTransaction(
  walletAddress: string,
  signature: string,
  stakeAmount: number
): Promise<boolean> {
  try {
    const network = process.env.SOLANA_NETWORK || 'devnet';
    const rpcUrl = process.env.SOLANA_RPC_URL || clusterApiUrl(network as any);
    const connection = new Connection(rpcUrl);

    const gameProgramId = process.env.GAME_PROGRAM_ID;
    const gamingTokenMint = process.env.GAMING_TOKEN_MINT;

    if (!gameProgramId || !gamingTokenMint) {
      throw new Error('Solana program IDs not configured');
    }

    // Get transaction details
    const tx = await connection.getTransaction(signature, {
      commitment: 'confirmed',
    });

    if (!tx) {
      return false;
    }

    // Verify the transaction involves the correct program and amount
    // This is a simplified check - in production, you'd verify more details
    const hasValidProgram = tx.transaction.message.programIds().some(
      programId => programId.equals(new PublicKey(gameProgramId))
    );

    return hasValidProgram;
  } catch (error) {
    logger.error('Error verifying stake transaction:', error);
    return false;
  }
}

// POST /games - Create a new game
router.post('/',
  requireUser,
  validateBody(gameCreateSchema),
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse<Game>>) => {
    const { stake_amount, wallet_address, signature } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      throw createError('User not authenticated', 401, 'NOT_AUTHENTICATED');
    }

    if (req.user?.wallet_address !== wallet_address) {
      throw createError('Wallet address mismatch', 400, 'WALLET_MISMATCH');
    }

    // Verify the stake transaction
    const isValidTransaction = await verifyStakeTransaction(wallet_address, signature, stake_amount);

    if (!isValidTransaction) {
      throw createError('Invalid stake transaction', 400, 'INVALID_TRANSACTION');
    }

    const db = getDatabase();

    // Initialize game data
    const initialGameData = {
      deck: generateDeck(),
      tableau: initializeTableau(),
      foundation: [],
      stock: { cards: [], type: 'stock' },
      waste: { cards: [], type: 'waste' },
      moves: [],
      current_time: 0,
    };

    // Create game record
    const { data: game, error } = await db
      .from('games')
      .insert({
        user_id: userId,
        wallet_address,
        stake_amount,
        status: 'active',
        moves_count: 0,
        time_elapsed: 0,
        started_at: new Date().toISOString(),
        game_data: initialGameData,
        transaction_signature: signature,
        rewards_claimed: false,
      })
      .select()
      .single();

    if (error) {
      logger.error('Error creating game:', error);
      throw createError('Failed to create game', 500, 'CREATE_ERROR');
    }

    logger.info(`Game created: ${game.id} for user ${userId}`);

    res.status(201).json({
      success: true,
      data: game,
      message: 'Game created successfully',
      timestamp: new Date().toISOString(),
    });
  })
);

// GET /games/:id - Get game by ID
router.get('/:id',
  requireUser,
  validateParams(gameParamsSchema),
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse<Game>>) => {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw createError('User not authenticated', 401, 'NOT_AUTHENTICATED');
    }

    const db = getDatabase();

    const { data: game, error } = await db
      .from('games')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !game) {
      throw createError('Game not found', 404, 'GAME_NOT_FOUND');
    }

    res.status(200).json({
      success: true,
      data: game,
      timestamp: new Date().toISOString(),
    });
  })
);

// PUT /games/:id - Update game state
router.put('/:id',
  requireUser,
  validateParams(gameParamsSchema),
  validateBody(gameUpdateSchema),
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse<Game>>) => {
    const { id } = req.params;
    const userId = req.user?.id;
    const updates = req.body;

    if (!userId) {
      throw createError('User not authenticated', 401, 'NOT_AUTHENTICATED');
    }

    const db = getDatabase();

    // Check if game exists and belongs to user
    const { data: existingGame, error: fetchError } = await db
      .from('games')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (fetchError || !existingGame) {
      throw createError('Game not found', 404, 'GAME_NOT_FOUND');
    }

    if (existingGame.status !== 'active') {
      throw createError('Game is not active', 400, 'GAME_NOT_ACTIVE');
    }

    // Update game
    const { data: updatedGame, error: updateError } = await db
      .from('games')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      logger.error('Error updating game:', updateError);
      throw createError('Failed to update game', 500, 'UPDATE_ERROR');
    }

    res.status(200).json({
      success: true,
      data: updatedGame,
      message: 'Game updated successfully',
      timestamp: new Date().toISOString(),
    });
  })
);

// POST /games/:id/complete - Complete a game
router.post('/:id/complete',
  requireUser,
  validateParams(gameParamsSchema),
  validateBody(z.object({
    result: commonSchemas.gameResult,
    score: commonSchemas.nonNegativeNumber,
    final_signature: z.string().optional(),
  })),
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse<Game>>) => {
    const { id } = req.params;
    const userId = req.user?.id;
    const { result, score, final_signature } = req.body;

    if (!userId) {
      throw createError('User not authenticated', 401, 'NOT_AUTHENTICATED');
    }

    const db = getDatabase();

    // Check if game exists and belongs to user
    const { data: existingGame, error: fetchError } = await db
      .from('games')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (fetchError || !existingGame) {
      throw createError('Game not found', 404, 'GAME_NOT_FOUND');
    }

    if (existingGame.status !== 'active') {
      throw createError('Game is not active', 400, 'GAME_NOT_ACTIVE');
    }

    // Complete the game
    const { data: completedGame, error: updateError } = await db
      .from('games')
      .update({
        status: 'completed',
        result,
        score,
        completed_at: new Date().toISOString(),
        transaction_signature: final_signature || existingGame.transaction_signature,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      logger.error('Error completing game:', updateError);
      throw createError('Failed to complete game', 500, 'UPDATE_ERROR');
    }

    // Process rewards (this would typically involve blockchain transactions)
    if (result === 'win') {
      // Create reward transaction record
      const rewardAmount = existingGame.stake_amount * 2; // 2x reward for winning
      await db
        .from('transactions')
        .insert({
          user_id: userId,
          wallet_address: existingGame.wallet_address,
          type: 'reward',
          amount: rewardAmount,
          token_type: 'GAME',
          transaction_signature: final_signature || '',
          status: 'pending',
          game_id: id,
          created_at: new Date().toISOString(),
        });
    }

    logger.info(`Game completed: ${id} with result: ${result}`);

    res.status(200).json({
      success: true,
      data: completedGame,
      message: `Game completed with result: ${result}`,
      timestamp: new Date().toISOString(),
    });
  })
);

// GET /games - Get user's games
router.get('/',
  requireUser,
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse<{ games: Game[], total: number }>>) => {
    const userId = req.user?.id;
    const { status, result, limit = 20, offset = 0 } = req.query as any;

    if (!userId) {
      throw createError('User not authenticated', 401, 'NOT_AUTHENTICATED');
    }

    const db = getDatabase();

    let query = db
      .from('games')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    if (result) {
      query = query.eq('result', result);
    }

    const { data: games, error, count } = await query;

    if (error) {
      throw createError('Failed to fetch games', 500, 'DB_ERROR');
    }

    res.status(200).json({
      success: true,
      data: {
        games: games || [],
        total: count || 0,
      },
      timestamp: new Date().toISOString(),
      pagination: {
        page: Math.floor(offset / limit) + 1,
        limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limit),
      },
    });
  })
);

// Helper functions for game initialization
function generateDeck() {
  const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
  const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const deck = [];

  for (const suit of suits) {
    for (let i = 0; i < ranks.length; i++) {
      deck.push({
        suit,
        rank: ranks[i],
        value: i + 1,
        face_up: false,
        id: `${suit}-${ranks[i]}`,
      });
    }
  }

  return deck;
}

function initializeTableau() {
  const tableau = [];
  for (let i = 0; i < 7; i++) {
    tableau.push({
      cards: [],
      type: 'tableau',
      id: `tableau-${i}`,
    });
  }
  return tableau;
}

export default router;