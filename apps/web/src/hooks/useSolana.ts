'use client'

import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { useState, useCallback } from 'react'
import {
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
} from '@solana/web3.js'
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token'

// Program IDs (these would be your actual deployed program IDs)
const GAME_PROGRAM_ID = new PublicKey('Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS')
const GAMING_TOKEN_MINT = new PublicKey('GAMING_TOKEN_MINT_ADDRESS') // Replace with actual
const MEMECOIN_MINT = new PublicKey('MEMECOIN_MINT_ADDRESS') // Replace with actual

export function useSolana() {
  const { connection } = useConnection()
  const { publicKey, signTransaction, sendTransaction } = useWallet()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Initialize game on blockchain
  const initializeGame = useCallback(async (
    stakeAmount: number,
    rewardMint: PublicKey = GAMING_TOKEN_MINT
  ) => {
    if (!publicKey || !signTransaction) {
      setError('Wallet not connected')
      return null
    }

    setIsLoading(true)
    setError(null)

    try {
      // Generate game ID
      const gameId = `${publicKey.toBase58()}-${Date.now()}`
      const gameSeeds = [Buffer.from('game'), publicKey.toBuffer(), Buffer.from(gameId)]

      // Find game account PDA
      const [gameAccount] = await PublicKey.findProgramAddress(gameSeeds, GAME_PROGRAM_ID)

      // Find escrow authority PDA
      const [escrowAuthority] = await PublicKey.findProgramAddress(
        [Buffer.from('escrow'), Buffer.from(gameId)],
        GAME_PROGRAM_ID
      )

      // Get associated token account for escrow
      const escrowTokenAccount = await getAssociatedTokenAddress(
        rewardMint,
        escrowAuthority,
        true
      )

      // Get user's token account
      const userTokenAccount = await getAssociatedTokenAddress(rewardMint, publicKey)

      // Create transaction
      const transaction = new Transaction()

      // Create escrow token account if it doesn't exist
      const escrowAccountInfo = await connection.getAccountInfo(escrowTokenAccount)
      if (!escrowAccountInfo) {
        const createEscrowAccountIx = createAssociatedTokenAccountInstruction(
          publicKey,
          escrowTokenAccount,
          escrowAuthority,
          rewardMint
        )
        transaction.add(createEscrowAccountIx)
      }

      // Add initialize game instruction
      // This would be your actual program instruction
      const initializeGameInstruction = SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: gameAccount,
        lamports: stakeAmount * LAMPORTS_PER_SOL,
      })
      transaction.add(initializeGameInstruction)

      // Send transaction
      const signature = await sendTransaction(transaction, connection)
      await connection.confirmTransaction(signature, 'confirmed')

      setIsLoading(false)
      return { signature, gameId }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize game'
      setError(errorMessage)
      setIsLoading(false)
      return null
    }
  }, [publicKey, signTransaction, connection])

  // Make move on blockchain
  const makeMove = useCallback(async (
    gameId: string,
    fromPile: string,
    toPile: string,
    cardIndex: number
  ) => {
    if (!publicKey || !signTransaction) {
      setError('Wallet not connected')
      return null
    }

    setIsLoading(true)
    setError(null)

    try {
      // Create transaction with move instruction
      const transaction = new Transaction()

      // Add make move instruction
      // This would be your actual program instruction
      const makeMoveInstruction = SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: GAME_PROGRAM_ID,
        lamports: 0, // No SOL transfer, just for example
      })
      transaction.add(makeMoveInstruction)

      const signature = await sendTransaction(transaction, connection)
      await connection.confirmTransaction(signature, 'confirmed')

      setIsLoading(false)
      return signature
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to make move'
      setError(errorMessage)
      setIsLoading(false)
      return null
    }
  }, [publicKey, signTransaction, connection])

  // Complete game and claim rewards
  const completeGame = useCallback(async (
    gameId: string,
    won: boolean,
    finalScore: number
  ) => {
    if (!publicKey || !signTransaction) {
      setError('Wallet not connected')
      return null
    }

    setIsLoading(true)
    setError(null)

    try {
      // Create transaction with complete game instruction
      const transaction = new Transaction()

      // Add complete game instruction
      // This would be your actual program instruction
      const completeGameInstruction = SystemProgram.transfer({
        fromPubkey: GAME_PROGRAM_ID,
        toPubkey: publicKey,
        lamports: won ? finalScore * LAMPORTS_PER_SOL : finalScore * LAMPORTS_PER_SOL / 2,
      })
      transaction.add(completeGameInstruction)

      const signature = await sendTransaction(transaction, connection)
      await connection.confirmTransaction(signature, 'confirmed')

      setIsLoading(false)
      return signature
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to complete game'
      setError(errorMessage)
      setIsLoading(false)
      return null
    }
  }, [publicKey, signTransaction, connection])

  // Get token balance
  const getTokenBalance = useCallback(async (mint: PublicKey) => {
    if (!publicKey) return 0

    try {
      const tokenAccount = await getAssociatedTokenAddress(mint, publicKey)
      const accountInfo = await connection.getAccountInfo(tokenAccount)

      if (!accountInfo) return 0

      // Parse token account data (simplified)
      const balance = await connection.getTokenAccountBalance(tokenAccount)
      return parseFloat(balance.value.amount)
    } catch (err) {
      console.error('Failed to get token balance:', err)
      return 0
    }
  }, [publicKey, connection])

  // Stake tokens
  const stakeTokens = useCallback(async (amount: number) => {
    if (!publicKey || !signTransaction) {
      setError('Wallet not connected')
      return null
    }

    setIsLoading(true)
    setError(null)

    try {
      const tokenAccount = await getAssociatedTokenAddress(GAMING_TOKEN_MINT, publicKey)

      // Create transaction with stake instruction
      const transaction = new Transaction()

      // Add stake instruction
      // This would be your actual gaming token program instruction
      const stakeInstruction = SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: GAME_PROGRAM_ID,
        lamports: amount * LAMPORTS_PER_SOL,
      })
      transaction.add(stakeInstruction)

      const signature = await sendTransaction(transaction, connection)
      await connection.confirmTransaction(signature, 'confirmed')

      setIsLoading(false)
      return signature
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to stake tokens'
      setError(errorMessage)
      setIsLoading(false)
      return null
    }
  }, [publicKey, signTransaction, connection])

  // Claim memecoin rewards
  const claimRewards = useCallback(async (gameId: string) => {
    if (!publicKey || !signTransaction) {
      setError('Wallet not connected')
      return null
    }

    setIsLoading(true)
    setError(null)

    try {
      // Create transaction with claim rewards instruction
      const transaction = new Transaction()

      // Add claim rewards instruction
      // This would be your actual memecoin program instruction
      const claimInstruction = SystemProgram.transfer({
        fromPubkey: GAME_PROGRAM_ID,
        toPubkey: publicKey,
        lamports: 100 * LAMPORTS_PER_SOL, // Example reward amount
      })
      transaction.add(claimInstruction)

      const signature = await sendTransaction(transaction, connection)
      await connection.confirmTransaction(signature, 'confirmed')

      setIsLoading(false)
      return signature
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to claim rewards'
      setError(errorMessage)
      setIsLoading(false)
      return null
    }
  }, [publicKey, signTransaction, connection])

  return {
    // Methods
    initializeGame,
    makeMove,
    completeGame,
    getTokenBalance,
    stakeTokens,
    claimRewards,
    clearError,

    // State
    isLoading,
    error,
    isConnected: !!publicKey,
    publicKey,
  }
}