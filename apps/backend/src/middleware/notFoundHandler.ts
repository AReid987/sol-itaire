import { Request, Response } from 'express';
import { ApiResponse } from '../types';

export function notFoundHandler(req: Request, res: Response<ApiResponse>) {
  res.status(404).json({
    success: false,
    error: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString(),
  });
}