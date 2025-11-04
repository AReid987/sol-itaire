import { PublicKey } from '@solana/web3.js'
import bs58 from 'bs58'

// Security utilities for Sol-itaire

export class SecurityUtils {
  // Validate public key format
  static isValidPublicKey(address: string): boolean {
    try {
      new PublicKey(address)
      return true
    } catch {
      return false
    }
  }

  // Validate and sanitize user input
  static sanitizeInput(input: string, maxLength: number = 100): string {
    if (typeof input !== 'string') return ''

    // Remove potentially dangerous characters
    const sanitized = input
      .replace(/[<>]/g, '') // Remove HTML tags
      .replace(/javascript:/gi, '') // Remove javascript protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim()

    // Truncate to max length
    return sanitized.substring(0, maxLength)
  }

  // Validate game ID format
  static isValidGameId(gameId: string): boolean {
    if (typeof gameId !== 'string' || gameId.length === 0) return false

    // Game ID should be in format: address-timestamp
    const parts = gameId.split('-')
    if (parts.length !== 2) return false

    const [address, timestamp] = parts
    return this.isValidPublicKey(address) && !isNaN(parseInt(timestamp))
  }

  // Validate stake amount
  static isValidStakeAmount(amount: number, minAmount: number = 1, maxAmount: number = 10000): boolean {
    if (typeof amount !== 'number' || isNaN(amount)) return false
    return amount >= minAmount && amount <= maxAmount && Number.isInteger(amount)
  }

  // Rate limiting for transactions
  static createRateLimiter(maxRequests: number, windowMs: number) {
    const requests: number[] = []

    return {
      isAllowed(): boolean {
        const now = Date.now()
        const windowStart = now - windowMs

        // Remove old requests
        while (requests.length > 0 && requests[0] < windowStart) {
          requests.shift()
        }

        if (requests.length >= maxRequests) {
          return false
        }

        requests.push(now)
        return true
      },

      getRemainingRequests(): number {
        const now = Date.now()
        const windowStart = now - windowMs

        // Remove old requests
        while (requests.length > 0 && requests[0] < windowStart) {
          requests.shift()
        }

        return Math.max(0, maxRequests - requests.length)
      }
    }
  }

  // Validate transaction signature
  static isValidSignature(signature: string): boolean {
    try {
      // Solana signatures are base58 encoded 64-byte arrays
      const decoded = bs58.decode(signature)
      return decoded.length === 64
    } catch {
      return false
    }
  }

  // Generate secure random game ID
  static generateSecureGameId(playerAddress: string): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 15)
    return `${playerAddress}-${timestamp}-${random}`
  }

  // Validate token mint
  static isValidTokenMint(mint: string): boolean {
    return this.isValidPublicKey(mint)
  }

  // Validate and sanitize URL parameters
  static validateUrlParams(params: Record<string, string | string[]>): Record<string, string> {
    const sanitized: Record<string, string> = {}

    Object.entries(params).forEach(([key, value]) => {
      const sanitizedValue = Array.isArray(value) ? value[0] : value
      if (sanitizedValue) {
        sanitized[key] = this.sanitizeInput(sanitizedValue, 200)
      }
    })

    return sanitized
  }

  // Check for common attack patterns
  static containsSuspiciousContent(input: string): boolean {
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /eval\(/i,
      /document\./i,
      /window\./i,
      /localStorage/i,
      /sessionStorage/i,
      /cookie/i,
      /fetch\(/i,
      /XMLHttpRequest/i,
    ]

    return suspiciousPatterns.some(pattern => pattern.test(input))
  }

  // Validate move data structure
  static validateMoveData(move: any): boolean {
    if (!move || typeof move !== 'object') return false

    const requiredFields = ['fromPile', 'toPile', 'cardIndex']
    return requiredFields.every(field => field in move) &&
           typeof move.fromPile === 'string' &&
           typeof move.toPile === 'string' &&
           typeof move.cardIndex === 'number' &&
           move.cardIndex >= 0
  }

  // Validate game state integrity
  static validateGameState(gameState: any): boolean {
    if (!gameState || typeof gameState !== 'object') return false

    const requiredFields = ['piles', 'moves', 'score', 'startTime', 'player']
    if (!requiredFields.every(field => field in gameState)) return false

    // Validate player address
    if (!this.isValidPublicKey(gameState.player)) return false

    // Validate timestamp
    if (!Number.isInteger(gameState.startTime) || gameState.startTime <= 0) return false

    // Validate moves and score
    if (!Number.isInteger(gameState.moves) || gameState.moves < 0) return false
    if (!Number.isInteger(gameState.score) || gameState.score < 0) return false

    // Validate piles structure
    if (!gameState.piles || typeof gameState.piles !== 'object') return false

    return true
  }

  // Content Security Policy headers
  static getCSPHeaders(): Record<string, string> {
    return {
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "font-src 'self' data:",
        "connect-src 'self' https://api.devnet.solana.com https://api.mainnet-beta.solana.com",
        "frame-src 'none'",
        "object-src 'none'",
      ].join('; '),
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    }
  }

  // Validate environment variables
  static validateEnvironment(): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    // Check required environment variables
    const requiredEnvVars = [
      'NEXT_PUBLIC_SOLANA_NETWORK',
      'NEXT_PUBLIC_SOLANA_RPC_URL',
    ]

    requiredEnvVars.forEach(envVar => {
      if (!process.env[envVar]) {
        errors.push(`Missing environment variable: ${envVar}`)
      }
    })

    // Validate Solana network
    const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK
    if (network && !['devnet', 'testnet', 'mainnet-beta'].includes(network)) {
      errors.push(`Invalid Solana network: ${network}`)
    }

    // Validate RPC URL
    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL
    if (rpcUrl && !rpcUrl.startsWith('https://')) {
      errors.push(`RPC URL must use HTTPS: ${rpcUrl}`)
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }
}

// Rate limiters for different operations
export const transactionRateLimit = SecurityUtils.createRateLimiter(10, 60000) // 10 transactions per minute
export const gameStartRateLimit = SecurityUtils.createRateLimiter(5, 300000) // 5 games per 5 minutes
export const claimRateLimit = SecurityUtils.createRateLimiter(3, 3600000) // 3 claims per hour

// Security utilities for Next.js API routes
export const validateMethod = (method: string, allowedMethods: string[] = ['GET', 'POST', 'PUT', 'DELETE']) => {
  return allowedMethods.includes(method)
}

export const validateContentType = (contentType: string | undefined) => {
  return contentType?.includes('application/json') ?? false
}

export const getSecurityHeaders = () => {
  return {
    ...SecurityUtils.getCSPHeaders(),
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  }
}