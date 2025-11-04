import { Router } from 'express';
import { z } from 'zod';
import { getDatabase } from '../config/database';
import { logger } from '../utils/logger';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { validateQuery } from '../middleware/validation';
import { ApiResponse, LeaderboardEntry, LeaderboardStats } from '../types';

const router = Router();

// Validation schema
const leaderboardQuerySchema = z.object({
  period: z.enum(['daily', 'weekly', 'monthly', 'all_time']).default('all_time'),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
  sort_by: z.enum(['wins', 'win_rate', 'earnings', 'games']).default('wins'),
});

// GET /leaderboard - Get global leaderboard
router.get('/',
  validateQuery(leaderboardQuerySchema),
  asyncHandler(async (req: Request, res: Response<ApiResponse<{ entries: LeaderboardEntry[], stats: LeaderboardStats }>>) => {
    const { period, limit, offset, sort_by } = req.query as any;

    const db = getDatabase();

    // Calculate date range based on period
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'daily':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'weekly':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'all_time':
      default:
        startDate = new Date(0);
        break;
    }

    // Get user statistics for the period
    let query = db
      .from('games')
      .select(`
        user_id,
        wallet_address,
        result,
        stake_amount,
        started_at,
        completed_at
      `)
      .gte('started_at', startDate.toISOString())
      .in('status', ['completed']);

    const { data: games, error: gamesError } = await query;

    if (gamesError) {
      throw createError('Failed to fetch game data', 500, 'DB_ERROR');
    }

    // Get user information
    const userIds = [...new Set(games?.map(game => game.user_id) || [])];
    const { data: users, error: usersError } = await db
      .from('users')
      .select('id, username, avatar_url, last_login')
      .in('id', userIds)
      .eq('is_active', true);

    if (usersError) {
      throw createError('Failed to fetch user data', 500, 'DB_ERROR');
    }

    // Get transaction data for earnings
    const { data: transactions, error: txError } = await db
      .from('transactions')
      .select('user_id, amount, type')
      .gte('created_at', startDate.toISOString())
      .eq('status', 'confirmed');

    if (txError) {
      throw createError('Failed to fetch transaction data', 500, 'DB_ERROR');
    }

    // Calculate leaderboard entries
    const userStats = new Map();

    // Initialize user stats
    users?.forEach(user => {
      userStats.set(user.id, {
        user_id: user.id,
        username: user.username,
        wallet_address: user.wallet_address,
        total_wins: 0,
        total_games: 0,
        total_earned: 0,
        avatar_url: user.avatar_url,
        last_active: user.last_login,
      });
    });

    // Calculate game statistics
    games?.forEach(game => {
      const stats = userStats.get(game.user_id);
      if (stats) {
        stats.total_games++;
        if (game.result === 'win') {
          stats.total_wins++;
        }
      }
    });

    // Calculate earnings
    transactions?.forEach(tx => {
      const stats = userStats.get(tx.user_id);
      if (stats) {
        if (tx.type === 'reward') {
          stats.total_earned += tx.amount;
        } else if (tx.type === 'stake') {
          stats.total_earned -= tx.amount;
        }
      }
    });

    // Calculate win rates and convert to LeaderboardEntry format
    const entries: LeaderboardEntry[] = Array.from(userStats.values())
      .map((stats, index) => ({
        rank: 0, // Will be set after sorting
        ...stats,
        win_rate: stats.total_games > 0 ? (stats.total_wins / stats.total_games) * 100 : 0,
      }))
      .filter(entry => entry.total_games > 0) // Only include users who have played games
      .sort((a, b) => {
        switch (sort_by) {
          case 'wins':
            return b.total_wins - a.total_wins;
          case 'win_rate':
            return b.win_rate - a.win_rate;
          case 'earnings':
            return b.total_earned - a.total_earned;
          case 'games':
          default:
            return b.total_games - a.total_games;
        }
      })
      .slice(offset, offset + limit)
      .map((entry, index) => ({
        ...entry,
        rank: offset + index + 1,
        win_rate: Math.round(entry.win_rate * 100) / 100,
      }));

    // Calculate overall stats
    const totalPlayers = users?.length || 0;
    const activePlayersToday = new Set(
      games?.filter(game => {
        const gameDate = new Date(game.started_at);
        return gameDate.toDateString() === now.toDateString();
      }).map(game => game.user_id) || []
    ).size;

    const todayGames = games?.filter(game => {
      const gameDate = new Date(game.started_at);
      return gameDate.toDateString() === now.toDateString();
    }).length || 0;

    const totalVolumeToday = transactions?.filter(tx => {
      const txDate = new Date(tx.created_at);
      return txDate.toDateString() === now.toDateString() && tx.type === 'stake';
    }).reduce((sum, tx) => sum + tx.amount, 0) || 0;

    const stats: LeaderboardStats = {
      total_players: totalPlayers,
      active_players_today: activePlayersToday,
      total_games_today: todayGames,
      total_volume_today: totalVolumeToday,
      top_earners: entries.slice(0, 10),
      most_wins: [...entries].sort((a, b) => b.total_wins - a.total_wins).slice(0, 10),
      highest_win_rate: [...entries].filter(e => e.total_games >= 5).sort((a, b) => b.win_rate - a.win_rate).slice(0, 10),
    };

    res.status(200).json({
      success: true,
      data: {
        entries,
        stats,
      },
      timestamp: new Date().toISOString(),
      pagination: {
        page: Math.floor(offset / limit) + 1,
        limit,
        total: entries.length,
        total_pages: Math.ceil(entries.length / limit),
      },
    });
  })
);

// GET /leaderboard/user/:userId - Get user's rank and position
router.get('/user/:userId',
  asyncHandler(async (req: Request, res: Response<ApiResponse<{ entry: LeaderboardEntry, rank: number }>>) => {
    const { userId } = req.params;
    const { period = 'all_time', sort_by = 'wins' } = req.query;

    const db = getDatabase();

    // Calculate date range based on period
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'daily':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'weekly':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'all_time':
      default:
        startDate = new Date(0);
        break;
    }

    // Get user's game statistics
    const { data: userGames, error: userGamesError } = await db
      .from('games')
      .select('result, stake_amount')
      .eq('user_id', userId)
      .gte('started_at', startDate.toISOString())
      .in('status', ['completed']);

    if (userGamesError) {
      throw createError('Failed to fetch user games', 500, 'DB_ERROR');
    }

    if (!userGames || userGames.length === 0) {
      throw createError('User has not played any games in this period', 404, 'NO_GAMES');
    }

    // Get user information
    const { data: user, error: userError } = await db
      .from('users')
      .select('username, wallet_address, avatar_url, last_login')
      .eq('id', userId)
      .eq('is_active', true)
      .single();

    if (userError || !user) {
      throw createError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Get user's transaction data
    const { data: userTransactions, error: userTxError } = await db
      .from('transactions')
      .select('amount, type')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString())
      .eq('status', 'confirmed');

    if (userTxError) {
      throw createError('Failed to fetch user transactions', 500, 'DB_ERROR');
    }

    // Calculate user statistics
    const totalGames = userGames.length;
    const totalWins = userGames.filter(game => game.result === 'win').length;
    const totalEarned = userTransactions?.reduce((sum, tx) => {
      if (tx.type === 'reward') {
        return sum + tx.amount;
      } else if (tx.type === 'stake') {
        return sum - tx.amount;
      }
      return sum;
    }, 0) || 0;

    const userEntry: LeaderboardEntry = {
      rank: 0, // Will be calculated
      user_id: userId,
      username: user.username,
      wallet_address: user.wallet_address,
      total_wins: totalWins,
      total_games: totalGames,
      win_rate: totalGames > 0 ? (totalWins / totalGames) * 100 : 0,
      total_earned: totalEarned,
      avatar_url: user.avatar_url,
      last_active: user.last_login,
    };

    // Get all users' stats to calculate rank
    const { data: allGames, error: allGamesError } = await db
      .from('games')
      .select('user_id, result, stake_amount')
      .gte('started_at', startDate.toISOString())
      .in('status', ['completed']);

    if (allGamesError) {
      throw createError('Failed to fetch all games', 500, 'DB_ERROR');
    }

    // Group games by user and calculate stats
    const allUserStats = new Map();
    allGames?.forEach(game => {
      if (!allUserStats.has(game.user_id)) {
        allUserStats.set(game.user_id, { wins: 0, games: 0 });
      }
      const stats = allUserStats.get(game.user_id);
      stats.games++;
      if (game.result === 'win') {
        stats.wins++;
      }
    });

    // Calculate user's rank
    let rank = 1;
    for (const [uid, stats] of allUserStats) {
      if (uid === userId) continue;

      let compareValue = 0;
      let userValue = 0;

      switch (sort_by) {
        case 'wins':
          compareValue = stats.wins;
          userValue = totalWins;
          break;
        case 'win_rate':
          compareValue = stats.games > 0 ? (stats.wins / stats.games) * 100 : 0;
          userValue = userEntry.win_rate;
          break;
        case 'earnings':
          // For earnings, we'd need to fetch all transactions - simplified here
          compareValue = 0;
          userValue = totalEarned;
          break;
        case 'games':
        default:
          compareValue = stats.games;
          userValue = totalGames;
          break;
      }

      if (compareValue > userValue) {
        rank++;
      }
    }

    res.status(200).json({
      success: true,
      data: {
        entry: {
          ...userEntry,
          rank,
          win_rate: Math.round(userEntry.win_rate * 100) / 100,
        },
        rank,
      },
      timestamp: new Date().toISOString(),
    });
  })
);

export default router;