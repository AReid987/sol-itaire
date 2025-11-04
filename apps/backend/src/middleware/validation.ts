import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';
import { createError } from './errorHandler';

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = schema.parse(req.body);
      req.body = validatedData;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessage = error.errors.map(err =>
          `${err.path.join('.')}: ${err.message}`
        ).join(', ');
        next(createError(`Validation failed: ${errorMessage}`, 400, 'VALIDATION_ERROR'));
      } else {
        next(createError('Invalid request body', 400, 'INVALID_BODY'));
      }
    }
  };
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = schema.parse(req.query);
      req.query = validatedData;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessage = error.errors.map(err =>
          `${err.path.join('.')}: ${err.message}`
        ).join(', ');
        next(createError(`Query validation failed: ${errorMessage}`, 400, 'QUERY_VALIDATION_ERROR'));
      } else {
        next(createError('Invalid query parameters', 400, 'INVALID_QUERY'));
      }
    }
  };
}

export function validateParams<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = schema.parse(req.params);
      req.params = validatedData;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessage = error.errors.map(err =>
          `${err.path.join('.')}: ${err.message}`
        ).join(', ');
        next(createError(`Parameter validation failed: ${errorMessage}`, 400, 'PARAM_VALIDATION_ERROR'));
      } else {
        next(createError('Invalid parameters', 400, 'INVALID_PARAMS'));
      }
    }
  };
}

// Common validation schemas
export const commonSchemas = {
  uuid: z.string().uuid(),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$|^[1-9A-HJ-NP-Za-km-z]{32,44}$/, 'Invalid wallet address'),
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
  email: z.string().email().optional().nullable(),
  positiveNumber: z.number().positive(),
  nonNegativeNumber: z.number().min(0),
  timestamp: z.string().datetime(),
  gameStatus: z.enum(['pending', 'active', 'completed', 'abandoned']),
  gameResult: z.enum(['win', 'lose', 'incomplete']).optional(),
  transactionType: z.enum(['stake', 'reward', 'deposit', 'withdrawal']),
  tokenType: z.enum(['GAME', 'MEMECOIN']),
  transactionStatus: z.enum(['pending', 'confirmed', 'failed']),
};