import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { ApiError, ApiResponse } from '../types';

export function errorHandler(
  error: Error,
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
) {
  logger.error('Unhandled error:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';

  const apiError: ApiError = {
    code: 'INTERNAL_SERVER_ERROR',
    message: isDevelopment ? error.message : 'An unexpected error occurred',
    details: isDevelopment ? error.stack : undefined,
    timestamp: new Date().toISOString(),
  };

  res.status(500).json({
    success: false,
    error: apiError.message,
    timestamp: apiError.timestamp,
  });
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function createError(
  message: string,
  statusCode: number = 500,
  code?: string
): Error & { statusCode?: number; code?: string } {
  const error = new Error(message) as any;
  error.statusCode = statusCode;
  error.code = code || 'INTERNAL_ERROR';
  return error;
}