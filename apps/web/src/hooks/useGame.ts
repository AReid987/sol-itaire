'use client'

import { useCallback } from 'react'
import { PublicKey } from '@solana/web3.js'
import { useGameStore } from '@/store/gameStore'
import { useSolana, GAMING_TOKEN_MINT, MEMECOIN_MINT } from './useSolana'

export function useGame() {
  const gameStore = useGameStore()
  const solana = useSolana()

  const startNewGame = useCallback(async (stakeAmount: number) => {
    if (!solana.isConnected) {
      gameStore.setError('Please connect your wallet first')
      return
    }

    const balance = await solana.getTokenBalance(GAMING_TOKEN_MINT)

    if (balance < stakeAmount) {
      gameStore.setError('Insufficient token balance')
      return
    }

    const result = await solana.initializeGame(stakeAmount)
    if (!result) {
      return
    }

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

    gameStore.makeMove(fromPile, toPile, cardIndex)

    const gameId = `${currentGame.player}-${currentGame.startTime}`
    const signature = await solana.makeMove(gameId, fromPile, toPile, cardIndex)

    if (!signature) {
      gameStore.undoMove()
      return
    }
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

    gameStore.completeGame(won, currentGame.score)

    if (won && solana.publicKey) {
      const timeTaken = currentGame.endTime ? currentGame.endTime - currentGame.startTime : 0
      const moves = currentGame.moves
      let reward = 100

      if (timeTaken < 2 * 60) reward += 200
      else if (timeTaken < 3 * 60) reward += 100
      else if (timeTaken < 5 * 60) reward += 50

      if (moves < 60) reward += 200
      else if (moves < 80) reward += 100
      else if (moves < 100) reward += 50

      const rewardSignature = await solana.claimRewards(gameId, reward)
      if (rewardSignature) {
        gameStore.setError(null)
      }
    }
  }, [gameStore, solana])

  const withdrawStake = useCallback(async () => {
    const { currentGame } = gameStore
    if (!currentGame || !solana.isConnected) {
      return
    }

    const gameId = `${currentGame.player}-${currentGame.startTime}`
    const signature = await solana.withdrawStake(gameId)

    if (signature) {
      gameStore.resetGame()
    }
  }, [gameStore, solana])

  const syncStats = useCallback(async () => {
    if (!solana.isConnected) return

    try {
      const stats = await fetchPlayerStats(solana.publicKey?.toBase58() || '')
      gameStore.setPlayerStats(stats)
    } catch (error) {
      console.error('Failed to sync stats:', error)
    }
  }, [solana, gameStore])

  return {
    currentGame: gameStore.currentGame,
    gameHistory: gameStore.gameHistory,
    playerStats: gameStore.playerStats,

    startNewGame,
    makeMove,
    undoMove: gameStore.undoMove,
    completeGame,
    withdrawStake,
    resetGame: gameStore.resetGame,

    syncStats,

    isLoading: gameStore.isLoading || solana.isLoading,
    error: gameStore.error || solana.error,
    setError: gameStore.setError,
    clearError: () => {
      gameStore.setError(null)
      solana.clearError()
    },
  }
}

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