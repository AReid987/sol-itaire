import { Router } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { getDatabase } from '../config/database';
import { logger } from '../utils/logger';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { validateBody } from '../middleware/validation';
import { AuthRequest, authenticateToken } from '../middleware/auth';
import { ApiResponse, AuthTokens, User } from '../types';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';

const router = Router();

// Validation schemas
const walletAuthSchema = z.object({
  wallet_address: z.string().min(32),
  signature: z.string(),
  message: z.string(),
  public_key: z.string(),
});

const usernameSchema = z.object({
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_-]+$/),
});

const refreshTokenSchema = z.object({
  refresh_token: z.string(),
});

// Verify Solana signature
async function verifySolanaSignature(
  walletAddress: string,
  signature: string,
  message: string,
  publicKey: string
): Promise<boolean> {
  try {
    const network = process.env.SOLANA_NETWORK || 'devnet';
    const rpcUrl = process.env.SOLANA_RPC_URL || clusterApiUrl(network as any);
    const connection = new Connection(rpcUrl);

    // Verify the signature matches the message and public key
    const isValidSignature = await connection.verifyMessage(
      Buffer.from(message),
      new PublicKey(publicKey),
      Buffer.from(signature, 'base64')
    );

    return isValidSignature && publicKey === walletAddress;
  } catch (error) {
    logger.error('Error verifying Solana signature:', error);
    return false;
  }
}

// Generate JWT tokens
function generateTokens(userId: string): AuthTokens {
  const jwtSecret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

  if (!jwtSecret) {
    throw new Error('JWT_SECRET not configured');
  }

  const accessToken = jwt.sign({ userId }, jwtSecret, { expiresIn });
  const refreshToken = jwt.sign({ userId }, jwtSecret, { expiresIn: '30d' });

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: 7 * 24 * 60 * 60, // 7 days in seconds
    token_type: 'Bearer',
  };
}

// POST /auth/wallet - Authenticate with wallet
router.post('/wallet',
  validateBody(walletAuthSchema),
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse<AuthTokens & { user: User }>>) => {
    const { wallet_address, signature, message, public_key } = req.body;

    // Verify the signature
    const isValidSignature = await verifySolanaSignature(
      wallet_address,
      signature,
      message,
      public_key
    );

    if (!isValidSignature) {
      throw createError('Invalid signature', 401, 'INVALID_SIGNATURE');
    }

    const db = getDatabase();

    // Find or create user
    let user: User;
    const { data: existingUser, error: fetchError } = await db
      .from('users')
      .select('*')
      .eq('wallet_address', wallet_address)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw createError('Database error', 500, 'DB_ERROR');
    }

    if (existingUser) {
      // Update last login
      const { data: updatedUser, error: updateError } = await db
        .from('users')
        .update({
          last_login: new Date().toISOString(),
          is_active: true
        })
        .eq('id', existingUser.id)
        .select()
        .single();

      if (updateError) {
        throw createError('Failed to update user', 500, 'UPDATE_ERROR');
      }

      user = updatedUser;
    } else {
      // Create new user
      const { data: newUser, error: insertError } = await db
        .from('users')
        .insert({
          wallet_address,
          username: `user_${wallet_address.slice(0, 8)}`, // Default username
          last_login: new Date().toISOString(),
          is_active: true,
          preferences: {
            theme: 'dark',
            notifications: true,
            sound_effects: true,
            auto_stake: false,
            default_stake_amount: 10,
          },
        })
        .select()
        .single();

      if (insertError) {
        throw createError('Failed to create user', 500, 'CREATE_ERROR');
      }

      user = newUser;
    }

    // Generate tokens
    const tokens = generateTokens(user.id);

    logger.info(`User authenticated: ${user.wallet_address}`);

    res.status(200).json({
      success: true,
      data: {
        ...tokens,
        user,
      },
      timestamp: new Date().toISOString(),
    });
  })
);

// POST /auth/username - Set username for authenticated user
router.post('/username',
  authenticateToken,
  validateBody(usernameSchema),
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse<User>>) => {
    const { username } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      throw createError('User not authenticated', 401, 'NOT_AUTHENTICATED');
    }

    const db = getDatabase();

    // Check if username is already taken
    const { data: existingUser, error: checkError } = await db
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw createError('Database error', 500, 'DB_ERROR');
    }

    if (existingUser) {
      throw createError('Username already taken', 409, 'USERNAME_TAKEN');
    }

    // Update username
    const { data: updatedUser, error: updateError } = await db
      .from('users')
      .update({ username })
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      throw createError('Failed to update username', 500, 'UPDATE_ERROR');
    }

    res.status(200).json({
      success: true,
      data: updatedUser,
      message: 'Username updated successfully',
      timestamp: new Date().toISOString(),
    });
  })
);

// POST /auth/refresh - Refresh access token
router.post('/refresh',
  validateBody(refreshTokenSchema),
  asyncHandler(async (req: Request, res: Response<ApiResponse<AuthTokens>>) => {
    const { refresh_token } = req.body;
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      throw createError('JWT_SECRET not configured', 500, 'CONFIG_ERROR');
    }

    try {
      const decoded = jwt.verify(refresh_token, jwtSecret) as { userId: string };

      // Verify user still exists and is active
      const db = getDatabase();
      const { data: user, error } = await db
        .from('users')
        .select('id')
        .eq('id', decoded.userId)
        .eq('is_active', true)
        .single();

      if (error || !user) {
        throw createError('User not found or inactive', 404, 'USER_NOT_FOUND');
      }

      // Generate new tokens
      const tokens = generateTokens(decoded.userId);

      res.status(200).json({
        success: true,
        data: tokens,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      throw createError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
    }
  })
);

// POST /auth/logout - Logout user (invalidate token)
router.post('/logout',
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res: Response<ApiResponse>) => {
    // In a production environment, you might want to implement token blacklisting
    // For now, we'll just return success - the client should delete the token
    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
      timestamp: new Date().toISOString(),
    });
  })
);

export default router;