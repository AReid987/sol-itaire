'use client'

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { GameState, GameTransaction, Card, Pile, Move } from '../types'
import { createDeck, canPlaceOnTableau, canPlaceOnFoundation, calculateScore } from '../utils'

interface GameStore {
  // Game state
  currentGame: GameState | null
  gameHistory: GameTransaction[]
  playerStats: {
    gamesPlayed: number
    gamesWon: number
    totalEarnings: number
    bestTime: number
    currentStreak: number
  }

  // Game actions
  startNewGame: (player: string, stakeAmount: number) => void
  makeMove: (fromPile: string, toPile: string, cardIndex: number) => void
  undoMove: () => void
  completeGame: (won: boolean, finalScore: number) => void
  resetGame: () => void

  // Blockchain integration
  syncWithBlockchain: () => Promise<void>
  stakeTokens: (amount: number) => Promise<string>
  claimRewards: (gameId: string) => Promise<string>
  withdrawStake: (gameId: string) => Promise<string>

  // UI state
  isLoading: boolean
  error: string | null
  setError: (error: string | null) => void
  setLoading: (loading: boolean) => void
}



export const useGameStore = create<GameStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        currentGame: null,
        gameHistory: [],
        playerStats: {
          gamesPlayed: 0,
          gamesWon: 0,
          totalEarnings: 0,
          bestTime: 0,
          currentStreak: 0,
        },
        isLoading: false,
        error: null,

        // Game actions
        startNewGame: (player: string, stakeAmount: number) => {
          const deck = createDeck()
          const piles: Record<string, Pile> = {}
          const moveHistory: Move[] = []

          // Initialize tableau piles
          for (let i = 0; i < 7; i++) {
            const tableauCards: Card[] = []
            for (let j = 0; j <= i; j++) {
              const card = deck.pop()!
              if (j === i) {
                card.faceUp = true
              }
              tableauCards.push(card)
            }
            piles[`tableau-${i}`] = {
              cards: tableauCards,
              type: 'tableau',
              id: `tableau-${i}`
            }
          }

          // Initialize foundation piles
          for (let i = 0; i < 4; i++) {
            piles[`foundation-${i}`] = {
              cards: [],
              type: 'foundation',
              id: `foundation-${i}`
            }
          }

          // Initialize stock pile
          deck.forEach(card => card.faceUp = false)
          piles['stock'] = {
            cards: deck,
            type: 'stock',
            id: 'stock'
          }

          // Initialize waste pile
          piles['waste'] = {
            cards: [],
            type: 'waste',
            id: 'waste'
          }

          const newGame: GameState = {
            piles,
            moves: 0,
            score: 0,
            isWon: false,
            isComplete: false,
            startTime: Date.now(),
            player,
            stakeAmount,
            moveHistory,
          }

          set((state) => ({
            currentGame: newGame,
            error: null,
          }))

          // Record transaction
          const transaction: GameTransaction = {
            type: 'start',
            gameId: `${player}-${Date.now()}`,
            player,
            amount: stakeAmount,
            timestamp: Date.now(),
            status: 'pending',
          }

          set((state) => ({
            gameHistory: [...state.gameHistory, transaction],
          }))
        },

        makeMove: (fromPile: string, toPile: string, cardIndex: number) => {
          const state = get()
          if (!state.currentGame) return

          const { piles, moves } = state.currentGame
          const fromPileData = piles[fromPile]
          const toPileData = piles[toPile]
          const card = fromPileData.cards[cardIndex]

          if (!card || !card.faceUp) {
            set({ error: 'Invalid move: Card is face down' })
            return
          }

          // Validate move
          let isValidMove = false

          if (toPileData.type === 'tableau') {
            const targetCard = toPileData.cards[toPileData.cards.length - 1] || null
            isValidMove = canPlaceOnTableau(card, targetCard)
          } else if (toPileData.type === 'foundation') {
            isValidMove = cardIndex === fromPileData.cards.length - 1 && canPlaceOnFoundation(card, toPileData.cards)
          }

          if (!isValidMove) {
            set({ error: 'Invalid move' })
            return
          }

          // Execute move
          const newPiles = { ...piles }
          const movedCards = newPiles[fromPile].cards.splice(cardIndex)
          newPiles[toPile].cards.push(...movedCards)

          // Flip the new top card of the from pile if it's a tableau pile
          let flippedCard: Card | undefined
          if (fromPileData.type === 'tableau' && newPiles[fromPile].cards.length > 0) {
            const topCard = newPiles[fromPile].cards[newPiles[fromPile].cards.length - 1]
            if (!topCard.faceUp) {
              topCard.faceUp = true
              flippedCard = { ...topCard }
            }
          }

          // Update game state
          const newMoves = moves + 1
          const newScore = calculateScore({
            ...state.currentGame,
            piles: newPiles,
            moves: newMoves,
          })

          const isWon = Object.values(newPiles)
            .filter(pile => pile.type === 'foundation')
            .reduce((total, pile) => total + pile.cards.length, 0) === 52

          // Record move for undo
          const move: Move = {
            fromPile,
            toPile,
            cardIndex,
            movedCards: [...movedCards],
            flippedCard: flippedCard ? { ...flippedCard } : undefined,
          }

          const updatedGame = {
            ...state.currentGame,
            piles: newPiles,
            moves: newMoves,
            score: newScore,
            isWon,
            moveHistory: [...state.currentGame.moveHistory, move],
          }

          set((state) => ({
            currentGame: updatedGame,
            error: null,
          }))

          // Record transaction
          const transaction: GameTransaction = {
            type: 'move',
            gameId: `${state.currentGame.player}-${state.currentGame.startTime}`,
            player: state.currentGame.player,
            timestamp: Date.now(),
            status: 'confirmed',
          }

          set((state) => ({
            gameHistory: [...state.gameHistory, transaction],
          }))
        },

        undoMove: () => {
          const state = get()
          if (!state.currentGame || state.currentGame.moveHistory.length === 0) {
            set({ error: 'No moves to undo' })
            return
          }

          const { moveHistory, piles } = state.currentGame
          const lastMove = moveHistory[moveHistory.length - 1]
          const newMoveHistory = moveHistory.slice(0, -1)
          const newPiles = { ...piles }

          // Reverse the move
          const cardsToReturn = newPiles[lastMove.toPile].cards.splice(-lastMove.movedCards.length)
          newPiles[lastMove.fromPile].cards.push(...cardsToReturn)

          // Flip back the card if it was flipped
          if (lastMove.flippedCard) {
            const topCard = newPiles[lastMove.fromPile].cards[newPiles[lastMove.fromPile].cards.length - 1]
            if (topCard) {
              topCard.faceUp = false
            }
          }

          const updatedGame = {
            ...state.currentGame,
            piles: newPiles,
            moves: Math.max(0, state.currentGame.moves - 1),
            moveHistory: newMoveHistory,
          }

          set((state) => ({
            currentGame: updatedGame,
            error: null,
          }))
        },

        completeGame: (won: boolean, finalScore: number) => {
          const state = get()
          if (!state.currentGame) return

          const completedGame = {
            ...state.currentGame,
            isComplete: true,
            isWon: won,
            score: finalScore,
            endTime: Date.now(),
          }

          // Update player stats
          const newStats = { ...state.playerStats }
          newStats.gamesPlayed += 1

          if (won) {
            newStats.gamesWon += 1
            newStats.currentStreak += 1

            const timeTaken = completedGame.endTime - completedGame.startTime
            if (newStats.bestTime === 0 || timeTaken < newStats.bestTime) {
              newStats.bestTime = timeTaken
            }
          } else {
            newStats.currentStreak = 0
          }

          set((state) => ({
            currentGame: completedGame,
            playerStats: newStats,
          }))

          // Record transaction
          const transaction: GameTransaction = {
            type: 'complete',
            gameId: `${state.currentGame.player}-${state.currentGame.startTime}`,
            player: state.currentGame.player,
            timestamp: Date.now(),
            status: 'confirmed',
          }

          set((state) => ({
            gameHistory: [...state.gameHistory, transaction],
          }))
        },

        resetGame: () => {
          set({
            currentGame: null,
            error: null,
          })
        },

        // Blockchain integration (placeholders for actual implementation)
        syncWithBlockchain: async () => {
          set({ isLoading: true, error: null })
          try {
            // TODO: Implement blockchain sync logic
            // Fetch game data from smart contracts
            console.log('Syncing with blockchain...')
            set({ isLoading: false })
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to sync with blockchain',
              isLoading: false
            })
          }
        },

        stakeTokens: async (amount: number) => {
          set({ isLoading: true, error: null })
          try {
            // TODO: Implement token staking logic
            // Interact with gaming token smart contract
            const transactionId = `stake_${Date.now()}`
            console.log(`Staking ${amount} tokens...`)
            set({ isLoading: false })
            return transactionId
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to stake tokens',
              isLoading: false
            })
            throw error
          }
        },

        claimRewards: async (gameId: string) => {
          set({ isLoading: true, error: null })
          try {
            // TODO: Implement reward claiming logic
            // Interact with memecoin smart contract
            const transactionId = `claim_${Date.now()}`
            console.log(`Claiming rewards for game ${gameId}...`)
            set({ isLoading: false })
            return transactionId
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to claim rewards',
              isLoading: false
            })
            throw error
          }
        },

        withdrawStake: async (gameId: string) => {
          set({ isLoading: true, error: null })
          try {
            // TODO: Implement stake withdrawal logic
            // Interact with game smart contract
            const transactionId = `withdraw_${Date.now()}`
            console.log(`Withdrawing stake for game ${gameId}...`)
            set({ isLoading: false })
            return transactionId
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to withdraw stake',
              isLoading: false
            })
            throw error
          }
        },

        setError: (error: string | null) => {
          set({ error })
        },

        setLoading: (loading: boolean) => {
          set({ isLoading: loading })
        },
      }),
      {
        name: 'solitaire-game-store',
        partialize: (state) => ({
          playerStats: state.playerStats,
          gameHistory: state.gameHistory.slice(-50), // Keep last 50 transactions
        }),
      }
    )
  )
)