import { Router } from 'express';
import { z } from 'zod';
import { getDatabase } from '../config/database';
import { logger } from '../utils/logger';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { validateBody, validateParams, commonSchemas } from '../middleware/validation';
import { AuthRequest, requireUser, optionalAuth } from '../middleware/auth';
import { ApiResponse, User, UserUpdateRequest, GameStats } from '../types';

const router = Router();

// Validation schemas
const userUpdateSchema = z.object({
  username: commonSchemas.username.optional(),
  email: commonSchemas.email.optional(),
  avatar_url: z.string().url().optional().nullable(),
  preferences: z.object({
    theme: z.enum(['light', 'dark', 'auto']).optional(),
    notifications: z.boolean().optional(),
    sound_effects: z.boolean().optional(),
    auto_stake: z.boolean().optional(),
    default_stake_amount: commonSchemas.positiveNumber.optional(),
  }).optional(),
});

const userParamsSchema = z.object({
  id: commonSchemas.uuid,
});

const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

// GET /users/me - Get current user profile
router.get('/me',
  requireUser,
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse<User>>) => {
    const user = req.user;

    if (!user) {
      throw createError('User not found', 404, 'USER_NOT_FOUND');
    }

    res.status(200).json({
      success: true,
      data: user,
      timestamp: new Date().toISOString(),
    });
  })
);

// PUT /users/me - Update current user profile
router.put('/me',
  requireUser,
  validateBody(userUpdateSchema),
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse<User>>) => {
    const userId = req.user?.id;
    const updates = req.body;

    if (!userId) {
      throw createError('User not authenticated', 401, 'NOT_AUTHENTICATED');
    }

    const db = getDatabase();

    // Check if username is already taken (if updating username)
    if (updates.username) {
      const { data: existingUser, error: checkError } = await db
        .from('users')
        .select('id')
        .eq('username', updates.username)
        .neq('id', userId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw createError('Database error', 500, 'DB_ERROR');
      }

      if (existingUser) {
        throw createError('Username already taken', 409, 'USERNAME_TAKEN');
      }
    }

    // Update user
    const { data: updatedUser, error: updateError } = await db
      .from('users')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      logger.error('Error updating user:', updateError);
      throw createError('Failed to update user', 500, 'UPDATE_ERROR');
    }

    res.status(200).json({
      success: true,
      data: updatedUser,
      message: 'User updated successfully',
      timestamp: new Date().toISOString(),
    });
  })
);

// GET /users/:id - Get user profile by ID (public info only)
router.get('/:id',
  validateParams(userParamsSchema),
  optionalAuth,
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse<Partial<User>>>) => {
    const { id } = req.params;
    const currentUserId = req.user?.id;

    const db = getDatabase();

    const { data: user, error } = await db
      .from('users')
      .select(`
        id,
        username,
        avatar_url,
        created_at,
        last_login,
        ${currentUserId === id ? 'email, wallet_address, preferences' : ''}
      `)
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error || !user) {
      throw createError('User not found', 404, 'USER_NOT_FOUND');
    }

    res.status(200).json({
      success: true,
      data: user,
      timestamp: new Date().toISOString(),
    });
  })
);

// GET /users/:id/stats - Get user game statistics
router.get('/:id/stats',
  validateParams(userParamsSchema),
  optionalAuth,
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse<GameStats>>) => {
    const { id } = req.params;

    const db = getDatabase();

    // Get user's games
    const { data: games, error: gamesError } = await db
      .from('games')
      .select('*')
      .eq('user_id', id)
      .in('status', ['completed', 'abandoned']);

    if (gamesError) {
      throw createError('Failed to fetch user games', 500, 'DB_ERROR');
    }

    // Get user's transactions
    const { data: transactions, error: txError } = await db
      .from('transactions')
      .select('*')
      .eq('user_id', id)
      .eq('status', 'confirmed');

    if (txError) {
      throw createError('Failed to fetch user transactions', 500, 'DB_ERROR');
    }

    // Calculate statistics
    const totalGames = games.length;
    const wins = games.filter(game => game.result === 'win').length;
    const losses = games.filter(game => game.result === 'lose').length;
    const winRate = totalGames > 0 ? (wins / totalGames) * 100 : 0;

    const completedGames = games.filter(game => game.status === 'completed');
    const scores = completedGames.map(game => game.score || 0);
    const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const bestScore = scores.length > 0 ? Math.max(...scores) : 0;

    const times = completedGames.map(game => game.time_elapsed || 0);
    const averageTime = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
    const bestTime = times.length > 0 ? Math.min(...times) : 0;

    const stakedTransactions = transactions.filter(tx => tx.type === 'stake');
    const totalStaked = stakedTransactions.reduce((sum, tx) => sum + tx.amount, 0);

    const rewardTransactions = transactions.filter(tx => tx.type === 'reward');
    const totalEarned = rewardTransactions.reduce((sum, tx) => sum + tx.amount, 0);

    const netProfit = totalEarned - totalStaked;

    // Calculate streaks
    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;

    games.sort((a, b) => new Date(b.completed_at || b.started_at).getTime() - new Date(a.completed_at || a.started_at).getTime());

    for (const game of games) {
      if (game.result === 'win') {
        tempStreak++;
        if (currentStreak === 0 && games.indexOf(game) === 0) {
          currentStreak = tempStreak;
        }
        bestStreak = Math.max(bestStreak, tempStreak);
      } else if (game.result === 'lose') {
        tempStreak = 0;
        if (currentStreak > 0 && games.indexOf(game) === 0) {
          currentStreak = 0;
        }
      }
    }

    const stats: GameStats = {
      total_games: totalGames,
      total_wins: wins,
      total_losses: losses,
      win_rate: Math.round(winRate * 100) / 100,
      average_score: Math.round(averageScore * 100) / 100,
      best_score: bestScore,
      average_time: Math.round(averageTime),
      best_time: bestTime,
      total_staked: totalStaked,
      total_earned: totalEarned,
      net_profit: netProfit,
      current_streak: currentStreak,
      best_streak: bestStreak,
      last_played: games.length > 0 ? games[0].started_at : '',
    };

    res.status(200).json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    });
  })
);

// GET /users - Search users (public info only)
router.get('/',
  validateParams(paginationSchema),
  asyncHandler(async (req: Request, res: Response<ApiResponse<{ users: Partial<User>[], total: number }>>) => {
    const { page, limit } = req.query as { page: number; limit: number };
    const offset = (page - 1) * limit;

    const db = getDatabase();

    // Get search query
    const search = req.query.search as string;
    let query = db
      .from('users')
      .select('id, username, avatar_url, created_at, last_login', { count: 'exact' })
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.ilike('username', `%${search}%`);
    }

    const { data: users, error, count } = await query;

    if (error) {
      throw createError('Failed to fetch users', 500, 'DB_ERROR');
    }

    res.status(200).json({
      success: true,
      data: {
        users: users || [],
        total: count || 0,
      },
      timestamp: new Date().toISOString(),
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limit),
      },
    });
  })
);

export default router;