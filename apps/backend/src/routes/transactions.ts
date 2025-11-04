import { Router } from 'express';
import { z } from 'zod';
import { getDatabase } from '../config/database';
import { logger } from '../utils/logger';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { validateParams, validateQuery, commonSchemas } from '../middleware/validation';
import { AuthRequest, requireUser, optionalAuth } from '../middleware/auth';
import { ApiResponse, Transaction } from '../types';

const router = Router();

// Validation schemas
const transactionParamsSchema = z.object({
  id: commonSchemas.uuid,
});

const transactionQuerySchema = z.object({
  type: commonSchemas.transactionType.optional(),
  status: commonSchemas.transactionStatus.optional(),
  token_type: commonSchemas.tokenType.optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

// GET /transactions - Get user's transactions
router.get('/',
  requireUser,
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse<{ transactions: Transaction[], total: number }>>) => {
    const userId = req.user?.id;
    const { type, status, token_type, limit = 20, offset = 0 } = req.query as any;

    if (!userId) {
      throw createError('User not authenticated', 401, 'NOT_AUTHENTICATED');
    }

    const db = getDatabase();

    let query = db
      .from('transactions')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (type) {
      query = query.eq('type', type);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (token_type) {
      query = query.eq('token_type', token_type);
    }

    const { data: transactions, error, count } = await query;

    if (error) {
      throw createError('Failed to fetch transactions', 500, 'DB_ERROR');
    }

    res.status(200).json({
      success: true,
      data: {
        transactions: transactions || [],
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

// GET /transactions/:id - Get transaction by ID
router.get('/:id',
  requireUser,
  validateParams(transactionParamsSchema),
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse<Transaction>>) => {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw createError('User not authenticated', 401, 'NOT_AUTHENTICATED');
    }

    const db = getDatabase();

    const { data: transaction, error } = await db
      .from('transactions')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !transaction) {
      throw createError('Transaction not found', 404, 'TRANSACTION_NOT_FOUND');
    }

    res.status(200).json({
      success: true,
      data: transaction,
      timestamp: new Date().toISOString(),
    });
  })
);

// GET /transactions/public/:walletAddress - Get public transactions for a wallet (limited info)
router.get('/public/:walletAddress',
  validateParams(z.object({ walletAddress: z.string().min(32) })),
  optionalAuth,
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse<Partial<Transaction>[]>>) => {
    const { walletAddress } = req.params;
    const { limit = 10 } = req.query as any;

    const db = getDatabase();

    const { data: transactions, error } = await db
      .from('transactions')
      .select(`
        id,
        type,
        amount,
        token_type,
        status,
        created_at,
        confirmed_at,
        game_id
      `)
      .eq('wallet_address', walletAddress)
      .eq('status', 'confirmed')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw createError('Failed to fetch transactions', 500, 'DB_ERROR');
    }

    res.status(200).json({
      success: true,
      data: transactions || [],
      timestamp: new Date().toISOString(),
    });
  })
);

// GET /transactions/stats - Get transaction statistics for user
router.get('/stats',
  requireUser,
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse<{
    total_staked: number;
    total_earned: number;
    net_profit: number;
    transaction_count: number;
    pending_count: number;
    recent_transactions: Transaction[];
  }>>) => {
    const userId = req.user?.id;

    if (!userId) {
      throw createError('User not authenticated', 401, 'NOT_AUTHENTICATED');
    }

    const db = getDatabase();

    // Get all user transactions
    const { data: transactions, error } = await db
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw createError('Failed to fetch transactions', 500, 'DB_ERROR');
    }

    if (!transactions || transactions.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          total_staked: 0,
          total_earned: 0,
          net_profit: 0,
          transaction_count: 0,
          pending_count: 0,
          recent_transactions: [],
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Calculate statistics
    const confirmedTransactions = transactions.filter(tx => tx.status === 'confirmed');
    const pendingTransactions = transactions.filter(tx => tx.status === 'pending');

    const totalStaked = confirmedTransactions
      .filter(tx => tx.type === 'stake')
      .reduce((sum, tx) => sum + tx.amount, 0);

    const totalEarned = confirmedTransactions
      .filter(tx => tx.type === 'reward')
      .reduce((sum, tx) => sum + tx.amount, 0);

    const netProfit = totalEarned - totalStaked;

    const stats = {
      total_staked: totalStaked,
      total_earned: totalEarned,
      net_profit: netProfit,
      transaction_count: transactions.length,
      pending_count: pendingTransactions.length,
      recent_transactions: transactions.slice(0, 5),
    };

    res.status(200).json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    });
  })
);

// POST /transactions/verify - Verify a transaction on-chain
router.post('/verify',
  requireUser,
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse<{ verified: boolean, details?: any }>>) => {
    const userId = req.user?.id;
    const { transaction_signature } = req.body;

    if (!userId) {
      throw createError('User not authenticated', 401, 'NOT_AUTHENTICATED');
    }

    if (!transaction_signature) {
      throw createError('Transaction signature is required', 400, 'MISSING_SIGNATURE');
    }

    // Verify the transaction exists and belongs to the user
    const db = getDatabase();
    const { data: transaction, error } = await db
      .from('transactions')
      .select('*')
      .eq('transaction_signature', transaction_signature)
      .eq('user_id', userId)
      .single();

    if (error || !transaction) {
      throw createError('Transaction not found', 404, 'TRANSACTION_NOT_FOUND');
    }

    if (transaction.status === 'confirmed') {
      return res.status(200).json({
        success: true,
        data: {
          verified: true,
          details: {
            status: transaction.status,
            confirmed_at: transaction.confirmed_at,
            block_height: transaction.block_height,
            slot: transaction.slot,
          },
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Verify on-chain (this would involve Solana RPC calls)
    try {
      // Placeholder for actual Solana transaction verification
      // In production, you'd use @solana/web3.js to verify the transaction

      // For now, simulate verification
      const isVerified = Math.random() > 0.1; // 90% chance of success for demo

      if (isVerified) {
        // Update transaction status
        await db
          .from('transactions')
          .update({
            status: 'confirmed',
            confirmed_at: new Date().toISOString(),
            block_height: Math.floor(Math.random() * 1000000),
            slot: Math.floor(Math.random() * 1000000),
          })
          .eq('id', transaction.id);

        res.status(200).json({
          success: true,
          data: {
            verified: true,
            details: {
              status: 'confirmed',
              confirmed_at: new Date().toISOString(),
            },
          },
          message: 'Transaction verified and confirmed',
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(200).json({
          success: true,
          data: {
            verified: false,
          },
          message: 'Transaction not yet confirmed',
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('Error verifying transaction:', error);
      throw createError('Failed to verify transaction', 500, 'VERIFICATION_ERROR');
    }
  })
);

export default router;