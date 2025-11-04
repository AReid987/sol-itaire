'use client'

import React, { useMemo, useCallback, useState } from 'react'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  CoinbaseWalletAdapter,
} from '@solana/wallet-adapter-wallets'
import { clusterApiUrl, Connection, Commitment } from '@solana/web3.js'

// Default styles that can be overridden by your app
require('@solana/wallet-adapter-react-ui/styles.css')

// Error handling for wallet connections
const handleWalletError = (error: Error) => {
  console.error('Wallet connection error:', error)
  // In production, you might want to send this to an error reporting service
  if (process.env.NEXT_PUBLIC_ENABLE_ERROR_REPORTING === 'true') {
    // Send error to Sentry or other error reporting service
  }
}

export function WalletAdapterProvider({ children }: { children: React.ReactNode }) {
  const [connectionError, setConnectionError] = useState<string | null>(null)

  // The network can be set to 'devnet', 'testnet', or 'mainnet-beta'
  const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet'
  const isProduction = process.env.NODE_ENV === 'production'

  // Get commitment level based on environment
  const commitment: Commitment = isProduction ? 'confirmed' : 'processed'

  // You can also provide a custom RPC endpoint
  const endpoint = useMemo(() => {
    const customRpc = process.env.NEXT_PUBLIC_SOLANA_RPC_URL
    if (customRpc) {
      return customRpc
    }
    return clusterApiUrl(network as 'devnet' | 'testnet' | 'mainnet-beta')
  }, [network])

  // Create connection with optimized configuration for production
  const connection = useMemo(() => {
    try {
      return new Connection(endpoint, {
        commitment,
        wsEndpoint: process.env.NEXT_PUBLIC_SOLANA_WS_RPC_URL,
        httpHeaders: isProduction ? { 'Origin': process.env.NEXT_PUBLIC_APP_URL || '' } : undefined,
        disableRetryOnRateLimit: false,
        confirmTransactionInitialTimeout: parseInt(process.env.NEXT_PUBLIC_TRANSACTION_TIMEOUT || '30000'),
      })
    } catch (error) {
      console.error('Failed to create Solana connection:', error)
      setConnectionError('Failed to connect to Solana network')
      return new Connection(clusterApiUrl('devnet'), commitment)
    }
  }, [endpoint, commitment, isProduction])

  // Enhanced wallet configuration for production
  const wallets = useMemo(() => {
    const walletList = [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new CoinbaseWalletAdapter(),
    ]

    return walletList
  }, [network])

  // Auto-connect configuration
  const autoConnect = process.env.NEXT_PUBLIC_WALLET_AUTO_CONNECT === 'true'

  // Wallet event handlers
  const onError = useCallback((error: Error) => {
    handleWalletError(error)
    setConnectionError(error.message)
  }, [])

  const onConnect = useCallback(() => {
    setConnectionError(null)
    console.log('Wallet connected successfully')
  }, [])

  const onDisconnect = useCallback(() => {
    console.log('Wallet disconnected')
  }, [])

  // Handle connection errors with user-friendly messages
  if (connectionError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
          <div className="text-red-500 text-center">
            <h2 className="text-xl font-semibold mb-2">Connection Error</h2>
            <p className="text-gray-600 mb-4">
              {connectionError || 'Failed to connect to the Solana network. Please try again.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider
        wallets={wallets}
        autoConnect={autoConnect}
        onError={onError}
        onConnect={onConnect}
        onDisconnect={onDisconnect}
        localStorageKey="solitaire-wallet-adapter"
      >
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}