import { Connection, Commitment, PublicKey, Transaction, SystemProgram } from '@solana/web3.js'
import { TransactionConfirmationStatus } from '@solana/web3.js'

// Production Web3 Configuration
export const WEB3_CONFIG = {
  // Network configuration
  network: process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet',

  // RPC configuration
  rpcUrl: process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
  wsRpcUrl: process.env.NEXT_PUBLIC_SOLANA_WS_RPC_URL,

  // Connection configuration
  commitment: (process.env.NODE_ENV === 'production' ? 'confirmed' : 'processed') as Commitment,
  transactionTimeout: parseInt(process.env.NEXT_PUBLIC_TRANSACTION_TIMEOUT || '30000'),
  maxRetries: parseInt(process.env.NEXT_PUBLIC_MAX_RETRIES || '3'),

  // Wallet configuration
  autoConnect: process.env.NEXT_PUBLIC_WALLET_AUTO_CONNECT === 'true',
  walletTimeout: parseInt(process.env.NEXT_PUBLIC_WALLET_TIMEOUT || '10000'),

  // Security settings
  allowedOrigins: process.env.NODE_ENV === 'production'
    ? [process.env.NEXT_PUBLIC_APP_URL].filter(Boolean)
    : ['http://localhost:3000', 'http://localhost:3001'],

  // Gas/transaction settings
  maxPriorityFee: process.env.NODE_ENV === 'production' ? 0.001 : 0.0005,
  maxComputeUnits: 2000000,
}

// Create optimized connection for different environments
export function createOptimizedConnection(endpoint?: string): Connection {
  const url = endpoint || WEB3_CONFIG.rpcUrl

  const connectionConfig = {
    commitment: WEB3_CONFIG.commitment,
    wsEndpoint: WEB3_CONFIG.wsRpcUrl,
    httpHeaders: process.env.NODE_ENV === 'production'
      ? {
          'Origin': process.env.NEXT_PUBLIC_APP_URL || '',
          'User-Agent': 'Sol-itaire/1.0.0'
        }
      : undefined,
    disableRetryOnRateLimit: false,
    confirmTransactionInitialTimeout: WEB3_CONFIG.transactionTimeout,
  }

  return new Connection(url, connectionConfig)
}

// Production transaction builder with safety checks
export class ProductionTransactionBuilder {
  private connection: Connection

  constructor(connection: Connection) {
    this.connection = connection
  }

  // Create a transaction with appropriate fee settings
  async createTransaction(instructions: any[]): Promise<Transaction> {
    const transaction = new Transaction()

    // Add recent blockhash for better reliability
    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash()
    transaction.recentBlockhash = blockhash
    transaction.lastValidBlockHeight = lastValidBlockHeight

    // Add instructions
    instructions.forEach(instruction => {
      transaction.add(instruction)
    })

    // Set fee payer (this will be set by wallet when signing)
    return transaction
  }

  // Confirm transaction with proper error handling
  async confirmTransaction(signature: string): Promise<{ confirmed: boolean; error?: string }> {
    try {
      const confirmation = await this.connection.confirmTransaction(
        {
          signature,
          lastValidBlockHeight: await this.connection.getBlockHeight().then(height => height + 150),
          blockhash: await this.connection.getLatestBlockhash().then(b => b.blockhash),
        },
        WEB3_CONFIG.commitment
      )

      if (confirmation.value.err) {
        return {
          confirmed: false,
          error: `Transaction failed: ${JSON.stringify(confirmation.value.err)}`
        }
      }

      return { confirmed: true }
    } catch (error) {
      return {
        confirmed: false,
        error: error instanceof Error ? error.message : 'Unknown confirmation error'
      }
    }
  }

  // Get transaction with retry logic
  async getTransaction(signature: string, maxRetries: number = WEB3_CONFIG.maxRetries): Promise<any> {
    let lastError: Error

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await this.connection.getTransaction(signature, {
          commitment: WEB3_CONFIG.commitment,
          maxSupportedTransactionVersion: 0
        })
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')

        // Wait before retrying with exponential backoff
        if (i < maxRetries - 1) {
          const delay = Math.min(1000 * Math.pow(2, i), 10000)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    throw lastError || new Error('Failed to get transaction after retries')
  }
}

// Environment-specific RPC endpoint management
export function getRpcEndpoint(network?: string): string {
  const targetNetwork = network || WEB3_CONFIG.network

  // Custom RPC URL takes precedence
  if (WEB3_CONFIG.rpcUrl && !WEB3_CONFIG.rpcUrl.includes('api.solana.com')) {
    return WEB3_CONFIG.rpcUrl
  }

  // Production networks should use dedicated RPC endpoints
  switch (targetNetwork) {
    case 'mainnet-beta':
      // Replace with your production RPC endpoint
      return process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'
    case 'devnet':
      return process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com'
    case 'testnet':
      return process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.testnet.solana.com'
    default:
      throw new Error(`Unsupported network: ${targetNetwork}`)
  }
}

// Security utilities
export const SecurityUtils = {
  // Validate Solana address
  isValidAddress(address: string): boolean {
    try {
      new PublicKey(address)
      return true
    } catch {
      return false
    }
  },

  // Validate amount is within reasonable bounds
  validateAmount(amount: number, maxAmount: number = 1000): boolean {
    return amount > 0 && amount <= maxAmount && Number.isFinite(amount)
  },

  // Check if origin is allowed
  isOriginAllowed(origin: string): boolean {
    return WEB3_CONFIG.allowedOrigins.includes(origin) ||
           WEB3_CONFIG.allowedOrigins.some(allowed => origin.startsWith(allowed))
  },

  // Generate secure random value
  generateSecureRandom(): string {
    return crypto.getRandomValues(new Uint32Array(1))[0].toString(36)
  }
}

// Error handling utilities
export class Web3Error extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message)
    this.name = 'Web3Error'
  }
}

export const ErrorCodes = {
  WALLET_NOT_CONNECTED: 'WALLET_NOT_CONNECTED',
  TRANSACTION_FAILED: 'TRANSACTION_FAILED',
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  NETWORK_ERROR: 'NETWORK_ERROR',
  INVALID_ADDRESS: 'INVALID_ADDRESS',
  TIMEOUT: 'TIMEOUT',
  USER_REJECTED: 'USER_REJECTED',
} as const

export default {
  WEB3_CONFIG,
  createOptimizedConnection,
  ProductionTransactionBuilder,
  getRpcEndpoint,
  SecurityUtils,
  Web3Error,
  ErrorCodes,
}