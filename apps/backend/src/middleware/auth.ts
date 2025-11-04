import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getDatabase } from '../config/database';
import { logger } from '../utils/logger';
import { createError } from './errorHandler';
import { User } from '../types';

export interface AuthRequest extends Request {
  user?: User;
}

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return next(createError('Access token required', 401, 'MISSING_TOKEN'));
  }

  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET not configured');
    }

    const decoded = jwt.verify(token, jwtSecret) as { userId: string };
    req.user = { id: decoded.userId } as User;
    next();
  } catch (error) {
    logger.warn('Invalid token:', error);
    next(createError('Invalid or expired token', 401, 'INVALID_TOKEN'));
  }
}

export async function requireUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) {
      return next(createError('User authentication required', 401, 'USER_REQUIRED'));
    }

    const db = getDatabase();
    const { data: user, error } = await db
      .from('users')
      .select('*')
      .eq('id', req.user.id)
      .eq('is_active', true)
      .single();

    if (error || !user) {
      return next(createError('User not found or inactive', 404, 'USER_NOT_FOUND'));
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error('Error in requireUser middleware:', error);
    next(createError('Authentication failed', 500, 'AUTH_ERROR'));
  }
}

export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next(); // Continue without user
  }

  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return next();
    }

    const decoded = jwt.verify(token, jwtSecret) as { userId: string };
    req.user = { id: decoded.userId } as User;
  } catch (error) {
    // Ignore token errors for optional auth
    logger.debug('Optional auth token validation failed:', error);
  }

  next();
}