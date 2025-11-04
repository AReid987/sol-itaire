import { Router } from 'express';
import { z } from 'zod';
import { getDatabase } from '../config/database';
import { logger } from '../utils/logger';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { validateQuery } from '../middleware/validation';
import { ApiResponse } from '../types';

const router = Router();

// Validation schema
const statsQuerySchema = z.object({
  period: z.enum(['hour', 'day', 'week', 'month', 'all_time']).default('day'),
  limit: z.coerce.number().min(1).max(1000).default(100),
});

// GET /stats/overview - Get global statistics overview
router.get('/overview',
  asyncHandler(async (req: Request, res: Response<ApiResponse<{
    total_users: number;
    active_users_today: number;
    total_games: number;
    games_today: number;
    total_volume: number;
    volume_today: number;
    total_wins: number;
    win_rate_today: number;
    top_games_today: any[];
  }>>) => {
    const { period } = req.query as any;

    const db = getDatabase();

    // Calculate date ranges
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get user statistics
    const { data: users, error: usersError } = await db
      .from('users')
      .select('id, created_at, last_login')
      .eq('is_active', true);

    if (usersError) {
      throw createError('Failed to fetch user data', 500, 'DB_ERROR');
    }

    const totalUsers = users?.length || 0;
    const activeUsersToday = users?.filter(user =>
      user.last_login && new Date(user.last_login) >= todayStart
    ).length || 0;

    // Get game statistics
    const { data: games, error: gamesError } = await db
      .from('games')
      .select('status, result, stake_amount, started_at, user_id, score')
      .in('status', ['completed', 'abandoned']);

    if (gamesError) {
      throw createError('Failed to fetch game data', 500, 'DB_ERROR');
    }

    const totalGames = games?.length || 0;
    const gamesToday = games?.filter(game => new Date(game.started_at) >= todayStart).length || 0;

    // Calculate win rates
    const completedGames = games?.filter(game => game.status === 'completed') || [];
    const totalWins = completedGames.filter(game => game.result === 'win').length;
    const gamesCompletedToday = completedGames.filter(game => new Date(game.started_at) >= todayStart);
    const winsToday = gamesCompletedToday.filter(game => game.result === 'win').length;
    const winRateToday = gamesCompletedToday.length > 0 ? (winsToday / gamesCompletedToday.length) * 100 : 0;

    // Get transaction statistics
    const { data: transactions, error: txError } = await db
      .from('transactions')
      .select('amount, type, created_at')
      .eq('status', 'confirmed');

    if (txError) {
      throw createError('Failed to fetch transaction data', 500, 'DB_ERROR');
    }

    const totalVolume = transactions?.reduce((sum, tx) => {
      return tx.type === 'stake' ? sum + tx.amount : sum;
    }, 0) || 0;

    const volumeToday = transactions?.filter(tx =>
      new Date(tx.created_at) >= todayStart && tx.type === 'stake'
    ).reduce((sum, tx) => sum + tx.amount, 0) || 0;

    // Get top games today
    const topGamesToday = gamesCompletedToday
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 10)
      .map(game => ({
        game_id: game.id,
        user_id: game.user_id,
        score: game.score,
        result: game.result,
        started_at: game.started_at,
      }));

    const overview = {
      total_users: totalUsers,
      active_users_today: activeUsersToday,
      total_games: totalGames,
      games_today: gamesToday,
      total_volume: totalVolume,
      volume_today: volumeToday,
      total_wins: totalWins,
      win_rate_today: Math.round(winRateToday * 100) / 100,
      top_games_today: topGamesToday,
    };

    res.status(200).json({
      success: true,
      data: overview,
      timestamp: new Date().toISOString(),
    });
  })
);

// GET /stats/games - Get detailed game statistics
router.get('/games',
  validateQuery(statsQuerySchema),
  asyncHandler(async (req: Request, res: Response<ApiResponse<{
    total_games: number;
    completed_games: number;
    abandoned_games: number;
    wins: number;
    losses: number;
    win_rate: number;
    average_score: number;
    highest_score: number;
    average_time: number;
    fastest_time: number;
    period_data: any[];
  }>>) => {
    const { period } = req.query as any;

    const db = getDatabase();

    // Calculate date range based on period
    const now = new Date();
    let startDate: Date;
    let groupBy: string;

    switch (period) {
      case 'hour':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        groupBy = 'hour';
        break;
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        groupBy = 'day';
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        groupBy = 'day';
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        groupBy = 'day';
        break;
      case 'all_time':
      default:
        startDate = new Date(0);
        groupBy = 'month';
        break;
    }

    // Get game data for the period
    const { data: games, error: gamesError } = await db
      .from('games')
      .select('status, result, score, time_elapsed, started_at, completed_at')
      .gte('started_at', startDate.toISOString())
      .in('status', ['completed', 'abandoned']);

    if (gamesError) {
      throw createError('Failed to fetch game data', 500, 'DB_ERROR');
    }

    if (!games || games.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          total_games: 0,
          completed_games: 0,
          abandoned_games: 0,
          wins: 0,
          losses: 0,
          win_rate: 0,
          average_score: 0,
          highest_score: 0,
          average_time: 0,
          fastest_time: 0,
          period_data: [],
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Calculate statistics
    const totalGames = games.length;
    const completedGames = games.filter(game => game.status === 'completed');
    const abandonedGames = games.filter(game => game.status === 'abandoned');
    const wins = completedGames.filter(game => game.result === 'win');
    const losses = completedGames.filter(game => game.result === 'lose');
    const winRate = completedGames.length > 0 ? (wins.length / completedGames.length) * 100 : 0;

    const scores = completedGames.map(game => game.score || 0);
    const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const highestScore = Math.max(...scores);

    const times = completedGames.map(game => game.time_elapsed || 0);
    const averageTime = times.reduce((a, b) => a + b, 0) / times.length;
    const fastestTime = Math.min(...times);

    // Generate period data for charts
    const periodData = generatePeriodData(games, groupBy, startDate, now);

    const stats = {
      total_games: totalGames,
      completed_games: completedGames.length,
      abandoned_games: abandonedGames.length,
      wins: wins.length,
      losses: losses.length,
      win_rate: Math.round(winRate * 100) / 100,
      average_score: Math.round(averageScore * 100) / 100,
      highest_score: highestScore,
      average_time: Math.round(averageTime),
      fastest_time: fastestTime,
      period_data: periodData,
    };

    res.status(200).json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    });
  })
);

// GET /stats/transactions - Get transaction statistics
router.get('/transactions',
  validateQuery(statsQuerySchema),
  asyncHandler(async (req: Request, res: Response<ApiResponse<{
    total_transactions: number;
    staking_volume: number;
    rewards_paid: number;
    pending_transactions: number;
    average_stake: number;
    period_data: any[];
  }>>) => {
    const { period } = req.query as any;

    const db = getDatabase();

    // Calculate date range based on period
    const now = new Date();
    let startDate: Date;
    let groupBy: string;

    switch (period) {
      case 'hour':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        groupBy = 'hour';
        break;
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        groupBy = 'hour';
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        groupBy = 'day';
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        groupBy = 'day';
        break;
      case 'all_time':
      default:
        startDate = new Date(0);
        groupBy = 'month';
        break;
    }

    // Get transaction data
    const { data: transactions, error: txError } = await db
      .from('transactions')
      .select('type, amount, status, created_at')
      .gte('created_at', startDate.toISOString());

    if (txError) {
      throw createError('Failed to fetch transaction data', 500, 'DB_ERROR');
    }

    if (!transactions || transactions.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          total_transactions: 0,
          staking_volume: 0,
          rewards_paid: 0,
          pending_transactions: 0,
          average_stake: 0,
          period_data: [],
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Calculate statistics
    const totalTransactions = transactions.length;
    const confirmedTransactions = transactions.filter(tx => tx.status === 'confirmed');
    const pendingTransactions = transactions.filter(tx => tx.status === 'pending');

    const stakingTransactions = confirmedTransactions.filter(tx => tx.type === 'stake');
    const rewardTransactions = confirmedTransactions.filter(tx => tx.type === 'reward');

    const stakingVolume = stakingTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    const rewardsPaid = rewardTransactions.reduce((sum, tx) => sum + tx.amount, 0);

    const averageStake = stakingTransactions.length > 0
      ? stakingVolume / stakingTransactions.length
      : 0;

    // Generate period data
    const periodData = generateTransactionPeriodData(transactions, groupBy, startDate, now);

    const stats = {
      total_transactions: totalTransactions,
      staking_volume: stakingVolume,
      rewards_paid: rewardsPaid,
      pending_transactions: pendingTransactions.length,
      average_stake: Math.round(averageStake * 100) / 100,
      period_data: periodData,
    };

    res.status(200).json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    });
  })
);

// Helper functions
function generatePeriodData(games: any[], groupBy: string, startDate: Date, endDate: Date): any[] {
  const periodMap = new Map();

  // Initialize periods
  const current = new Date(startDate);
  while (current <= endDate) {
    const key = getPeriodKey(current, groupBy);
    periodMap.set(key, {
      period: key,
      games: 0,
      wins: 0,
      losses: 0,
      volume: 0,
    });

    // Increment by period
    switch (groupBy) {
      case 'hour':
        current.setHours(current.getHours() + 1);
        break;
      case 'day':
        current.setDate(current.getDate() + 1);
        break;
      case 'month':
        current.setMonth(current.getMonth() + 1);
        break;
    }
  }

  // Aggregate data
  games.forEach(game => {
    const key = getPeriodKey(new Date(game.started_at), groupBy);
    const period = periodMap.get(key);
    if (period) {
      period.games++;
      if (game.result === 'win') {
        period.wins++;
      } else if (game.result === 'lose') {
        period.losses++;
      }
    }
  });

  return Array.from(periodMap.values());
}

function generateTransactionPeriodData(transactions: any[], groupBy: string, startDate: Date, endDate: Date): any[] {
  const periodMap = new Map();

  // Initialize periods
  const current = new Date(startDate);
  while (current <= endDate) {
    const key = getPeriodKey(current, groupBy);
    periodMap.set(key, {
      period: key,
      transactions: 0,
      staking_volume: 0,
      rewards_paid: 0,
    });

    // Increment by period
    switch (groupBy) {
      case 'hour':
        current.setHours(current.getHours() + 1);
        break;
      case 'day':
        current.setDate(current.getDate() + 1);
        break;
      case 'month':
        current.setMonth(current.getMonth() + 1);
        break;
    }
  }

  // Aggregate data
  transactions.forEach(tx => {
    const key = getPeriodKey(new Date(tx.created_at), groupBy);
    const period = periodMap.get(key);
    if (period) {
      period.transactions++;
      if (tx.type === 'stake') {
        period.staking_volume += tx.amount;
      } else if (tx.type === 'reward') {
        period.rewards_paid += tx.amount;
      }
    }
  });

  return Array.from(periodMap.values());
}

function getPeriodKey(date: Date, groupBy: string): string {
  switch (groupBy) {
    case 'hour':
      return date.toISOString().slice(0, 13) + ':00';
    case 'day':
      return date.toISOString().slice(0, 10);
    case 'month':
      return date.toISOString().slice(0, 7);
    default:
      return date.toISOString().slice(0, 10);
  }
}

export default router;