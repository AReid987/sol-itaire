import { SolitaireError, ErrorCode } from '../types'

export class SolitaireGameError extends Error {
  public readonly code: ErrorCode
  public readonly details?: any
  public readonly timestamp: number

  constructor(code: ErrorCode, message: string, details?: any) {
    super(message)
    this.name = 'SolitaireGameError'
    this.code = code
    this.details = details
    this.timestamp = Date.now()
  }

  toJSON(): SolitaireError {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp,
    }
  }
}

export class WalletError extends SolitaireGameError {
  constructor(message: string, details?: any) {
    super('WALLET_NOT_CONNECTED', message, details)
    this.name = 'WalletError'
  }
}

export class TransactionError extends SolitaireGameError {
  constructor(message: string, details?: any) {
    super('TRANSACTION_FAILED', message, details)
    this.name = 'TransactionError'
  }
}

export class NetworkError extends SolitaireGameError {
  constructor(message: string, details?: any) {
    super('NETWORK_ERROR', message, details)
    this.name = 'NetworkError'
  }
}

export class InsufficientFundsError extends SolitaireGameError {
  constructor(message: string, details?: any) {
    super('INSUFFICIENT_FUNDS', message, details)
    this.name = 'InsufficientFundsError'
  }
}

export class GameError extends SolitaireGameError {
  constructor(message: string, details?: any) {
    super('INVALID_GAME_STATE', message, details)
    this.name = 'GameError'
  }
}

export class UnauthorizedError extends SolitaireGameError {
  constructor(message: string, details?: any) {
    super('UNAUTHORIZED', message, details)
    this.name = 'UnauthorizedError'
  }
}

export class TokenError extends SolitaireGameError {
  constructor(message: string, details?: any) {
    super('TOKEN_ERROR', message, details)
    this.name = 'TokenError'
  }
}

// Error handler utilities
export const handleSolanaError = (error: any): SolitaireGameError => {
  if (error.name === 'WalletError') {
    return new WalletError(error.message, error.details)
  }

  if (error.name === 'TransactionError') {
    return new TransactionError(error.message, error.details)
  }

  // Handle common Solana RPC errors
  if (error.message?.includes('insufficient funds')) {
    return new InsufficientFundsError('Insufficient SOL for transaction fees', error)
  }

  if (error.message?.includes('blockhash')) {
    return new NetworkError('Transaction expired. Please try again.', error)
  }

  if (error.message?.includes('connection')) {
    return new NetworkError('Network connection error. Please check your internet connection.', error)
  }

  // Handle program-specific errors
  if (error.message?.includes('custom program error')) {
    return new GameError('Game operation failed', error)
  }

  // Default error
  return new SolitaireGameError('TRANSACTION_FAILED', error.message || 'An unknown error occurred', error)
}

export const getErrorMessage = (error: SolitaireGameError): string => {
  switch (error.code) {
    case 'WALLET_NOT_CONNECTED':
      return 'Please connect your wallet to continue'
    case 'INSUFFICIENT_FUNDS':
      return 'Insufficient funds for this operation'
    case 'TRANSACTION_FAILED':
      return 'Transaction failed. Please try again.'
    case 'NETWORK_ERROR':
      return 'Network error. Please check your connection.'
    case 'INVALID_GAME_STATE':
      return 'Invalid game state. Please restart the game.'
    case 'UNAUTHORIZED':
      return 'You are not authorized to perform this action.'
    case 'INVALID_MOVE':
      return 'Invalid move. Please check the game rules.'
    case 'GAME_NOT_FOUND':
      return 'Game not found. Please start a new game.'
    case 'TOKEN_ERROR':
      return 'Token operation failed. Please try again.'
    default:
      return error.message || 'An unexpected error occurred'
  }
}

export const getErrorSeverity = (error: SolitaireGameError): 'low' | 'medium' | 'high' => {
  switch (error.code) {
    case 'WALLET_NOT_CONNECTED':
    case 'INVALID_MOVE':
      return 'low'
    case 'NETWORK_ERROR':
    case 'TRANSACTION_FAILED':
    case 'TOKEN_ERROR':
      return 'medium'
    case 'INSUFFICIENT_FUNDS':
    case 'UNAUTHORIZED':
    case 'INVALID_GAME_STATE':
      return 'high'
    default:
      return 'medium'
  }
}