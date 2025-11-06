'use client'

import { useCallback } from 'react'
import { PublicKey } from '@solana/web3.js'
import { useGameStore } from '@/store/gameStore'
import { useSolana } from './useSolana'

export function useGame() {
  const gameStore = useGameStore()
  const solana = useSolana()

  // Enhanced game actions with blockchain integration
  const startNewGame = useCallback(async (stakeAmount: number) => {
    if (!solana.isConnected) {
      gameStore.setError('Please connect your wallet first')
      return
    }

    // Check if user has sufficient balance
    const balance = await solana.getTokenBalance(
      new PublicKey('GAMING_TOKEN_MINT_ADDRESS') // Replace with actual mint
    )

    if (balance < stakeAmount) {
      gameStore.setError('Insufficient token balance')
      return
    }

    // Start game on blockchain
    const result = await solana.initializeGame(stakeAmount)
    if (!result) {
      return // Error already set by solana hook
    }

    // Start local game
    gameStore.startNewGame(solana.publicKey?.toBase58() || '', stakeAmount)
  }, [solana, gameStore])

  const makeMove = useCallback(async (
    fromPile: string,
    toPile: string,
    cardIndex: number
  ) => {
    const { currentGame } = gameStore
    if (!currentGame || !solana.isConnected) {
      return
    }

    // Make move locally first for immediate feedback
    gameStore.makeMove(fromPile, toPile, cardIndex)

    const gameId = `${currentGame.player}-${currentGame.startTime}`
    const signature = await solana.makeMove(gameId, fromPile, toPile, cardIndex)

    if (!signature) {
      // Revert move if blockchain transaction failed
      gameStore.undoMove()
      return
    }

    // Update transaction record
    const transaction = {
      type: 'move' as const,
      gameId,
      player: currentGame.player,
      timestamp: Date.now(),
      signature,
      status: 'confirmed' as const,
    }

    // Note: GameStore doesn't have setState method in current implementation
    // This would need to be added to the store if needed
  }, [gameStore, solana])

  const completeGame = useCallback(async (won: boolean) => {
    const { currentGame } = gameStore
    if (!currentGame || !solana.isConnected) {
      return
    }

    const gameId = `${currentGame.player}-${currentGame.startTime}`
    const signature = await solana.completeGame(gameId, won, currentGame.score)

    if (!signature) {
      gameStore.setError('Failed to complete game on blockchain')
      return
    }

    // Update local game state
    gameStore.completeGame(won, currentGame.score)

    // Claim rewards if won
    if (won) {
      const rewardSignature = await solana.claimRewards(gameId)
      if (rewardSignature) {
        // Update player stats with rewards
        // Note: GameStore doesn't have setState method in current implementation
        // This would need to be added to the store if needed
      }
    }
  }, [gameStore, solana])

  const withdrawStake = useCallback(async () => {
    const { currentGame } = gameStore
    if (!currentGame || !solana.isConnected) {
      return
    }

    const gameId = `${currentGame.player}-${currentGame.startTime}`
    const signature = await solana.stakeTokens(-currentGame.stakeAmount) // Negative for withdrawal

    if (signature) {
      gameStore.resetGame()
    }
  }, [gameStore, solana])

  // Get game statistics from blockchain
  const syncStats = useCallback(async () => {
    if (!solana.isConnected) return

    try {
      // Fetch player stats from your backend or smart contract
      // This is a placeholder - implement based on your architecture
      const stats = await fetchPlayerStats(solana.publicKey?.toBase58() || '')
      // Note: GameStore doesn't have setState method in current implementation
      // This would need to be added to the store if needed
    } catch (error) {
      console.error('Failed to sync stats:', error)
    }
  }, [solana, gameStore])

  return {
    // Game state
    currentGame: gameStore.currentGame,
    gameHistory: gameStore.gameHistory,
    playerStats: gameStore.playerStats,

    // Game actions
    startNewGame,
    makeMove,
    undoMove: gameStore.undoMove,
    completeGame,
    withdrawStake,
    resetGame: gameStore.resetGame,

    // Blockchain actions
    syncStats,
    stakeTokens: solana.stakeTokens,
    claimRewards: solana.claimRewards,

    // UI state
    isLoading: gameStore.isLoading || solana.isLoading,
    error: gameStore.error || solana.error,
    setError: gameStore.setError,
    clearError: () => {
      gameStore.setError(null)
      solana.clearError()
    },
  }
}

// Helper function to fetch player stats from backend
async function fetchPlayerStats(playerAddress: string) {
  try {
    const response = await fetch(`/api/player-stats?address=${playerAddress}`)
    if (!response.ok) throw new Error('Failed to fetch stats')
    return await response.json()
  } catch (error) {
    console.error('Failed to fetch player stats:', error)
    return {
      gamesPlayed: 0,
      gamesWon: 0,
      totalEarnings: 0,
      bestTime: 0,
      currentStreak: 0,
    }
  }
}