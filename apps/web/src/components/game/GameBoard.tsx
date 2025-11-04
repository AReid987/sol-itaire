'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, Pile, CardSuit, CardRank } from '../../types'
import { createDeck, canPlaceOnTableau, canPlaceOnFoundation, formatTime } from '../../utils'
import { PlayingCard } from './PlayingCard'
import { CardPile } from './CardPile'
import { GameControls } from './GameControls'
import { StakeModal } from './StakeModal'
import { DevnetHelper } from './DevnetHelper'
import { useWallet } from '@solana/wallet-adapter-react'

interface GameBoardProps {
  onGameEnd: () => void
}

export function GameBoard({ onGameEnd }: GameBoardProps) {
  const { publicKey } = useWallet()
  const [gameState, setGameState] = useState({
    piles: {} as Record<string, Pile>,
    moves: 0,
    score: 0,
    isWon: false,
    startTime: Date.now(),
  })
  const [selectedCard, setSelectedCard] = useState<{ pileId: string; cardIndex: number } | null>(null)
  const [showStakeModal, setShowStakeModal] = useState(true)
  const [showDevnetHelper, setShowDevnetHelper] = useState(false)
  const [stakeAmount, setStakeAmount] = useState(100)
  const [gameId, setGameId] = useState<string>('')

  // Initialize game
  useEffect(() => {
    if (!showStakeModal) {
      const deck = createDeck()
      const piles: Record<string, Pile> = {}

      // Initialize tableau piles (7 piles)
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

      // Initialize foundation piles (4 piles)
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

      // Generate game ID
      const newGameId = `${publicKey?.toBase58()}-${Date.now()}`
      setGameId(newGameId)

      setGameState({
        piles,
        moves: 0,
        score: 0,
        isWon: false,
        startTime: Date.now(),
      })
    }
  }, [showStakeModal, publicKey])

  const handleCardClick = (pileId: string, cardIndex: number) => {
    const pile = gameState.piles[pileId]
    const card = pile.cards[cardIndex]

    if (!card || !card.faceUp) return

    if (selectedCard && selectedCard.pileId === pileId && selectedCard.cardIndex === cardIndex) {
      // Deselect if clicking the same card
      setSelectedCard(null)
      return
    }

    if (selectedCard) {
      // Try to move the selected card to this pile
      handleMove(selectedCard.pileId, selectedCard.cardIndex, pileId)
      setSelectedCard(null)
    } else {
      // Select this card
      setSelectedCard({ pileId, cardIndex })
    }
  }

  const handleMove = (fromPileId: string, fromCardIndex: number, toPileId: string) => {
    const fromPile = gameState.piles[fromPileId]
    const toPile = gameState.piles[toPileId]
    const card = fromPile.cards[fromCardIndex]

    if (!card || !card.faceUp) return

    // Validate move
    let isValidMove = false

    if (toPile.type === 'tableau') {
      const targetCard = toPile.cards[toPile.cards.length - 1] || null
      isValidMove = canPlaceOnTableau(card, targetCard)
    } else if (toPile.type === 'foundation') {
      isValidMove = fromCardIndex === fromPile.cards.length - 1 && canPlaceOnFoundation(card, toPile.cards)
    }

    if (isValidMove) {
      // Execute move
      const newPiles = { ...gameState.piles }
      const movedCards = newPiles[fromPileId].cards.splice(fromCardIndex)
      newPiles[toPileId].cards.push(...movedCards)

      // Flip the new top card of the from pile if it's a tableau pile
      if (fromPile.type === 'tableau' && newPiles[fromPileId].cards.length > 0) {
        const topCard = newPiles[fromPileId].cards[newPiles[fromPileId].cards.length - 1]
        if (!topCard.faceUp) {
          topCard.faceUp = true
        }
      }

      // Update game state
      const newMoves = gameState.moves + 1
      const newScore = calculateScore(newPiles, newMoves, gameState.startTime)
      const isWon = checkWinCondition(newPiles)

      setGameState({
        ...gameState,
        piles: newPiles,
        moves: newMoves,
        score: newScore,
        isWon,
      })

      // Check for win
      if (isWon) {
        setTimeout(() => {
          handleGameComplete(true)
        }, 1000)
      }
    }
  }

  const handleStockClick = () => {
    const stockPile = gameState.piles['stock']
    const wastePile = gameState.piles['waste']

    if (stockPile.cards.length === 0) {
      // Reset stock from waste
      if (wastePile.cards.length > 0) {
        const newPiles = { ...gameState.piles }
        const wasteCards = newPiles['waste'].cards.splice(0)
        wasteCards.forEach(card => card.faceUp = false)
        newPiles['stock'].cards = wasteCards.reverse()

        setGameState({
          ...gameState,
          piles: newPiles,
          moves: gameState.moves + 1,
        })
      }
    } else {
      // Draw cards from stock to waste
      const newPiles = { ...gameState.piles }
      const drawnCards = newPiles['stock'].cards.splice(-3) // Draw 3 cards
      drawnCards.forEach(card => card.faceUp = true)
      newPiles['waste'].cards.push(...drawnCards)

      setGameState({
        ...gameState,
        piles: newPiles,
        moves: gameState.moves + 1,
      })
    }
  }

  const calculateScore = (piles: Record<string, Pile>, moves: number, startTime: number) => {
    let score = 0

    // Foundation cards give points
    Object.values(piles)
      .filter(pile => pile.type === 'foundation')
      .forEach(pile => {
        score += pile.cards.length * 10
      })

    // Time bonus
    const timeTaken = Date.now() - startTime
    const timeBonus = Math.max(0, 1000 - Math.floor(timeTaken / 1000))
    score += timeBonus

    // Move penalty
    score -= moves

    return Math.max(0, score)
  }

  const checkWinCondition = (piles: Record<string, Pile>) => {
    const foundationCards = Object.values(piles)
      .filter(pile => pile.type === 'foundation')
      .reduce((total, pile) => total + pile.cards.length, 0)

    return foundationCards === 52
  }

  const handleGameComplete = (won: boolean) => {
    // Here you would interact with the smart contract to complete the game
    // and distribute rewards
    console.log('Game completed:', { won, score: gameState.score, moves: gameState.moves })
    onGameEnd()
  }

  const handleStake = () => {
    // Here you would interact with the smart contract to stake tokens
    console.log('Staking:', { amount: stakeAmount, gameId })
    setShowStakeModal(false)
  }

  const elapsedTime = formatTime(Date.now() - gameState.startTime)

  return (
    <div className="game-board">
      {/* Game Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex space-x-6">
          <div className="text-white">
            <span className="text-gray-300">Moves:</span> {gameState.moves}
          </div>
          <div className="text-white">
            <span className="text-gray-300">Score:</span> {gameState.score}
          </div>
          <div className="text-white">
            <span className="text-gray-300">Time:</span> {elapsedTime}
          </div>
        </div>

        <div className="flex space-x-4">
          <button
            onClick={() => setShowDevnetHelper(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            🚀 Devnet Setup
          </button>
          <GameControls
            onNewGame={() => setShowStakeModal(true)}
            onUndo={() => {/* Implement undo */}}
            onHint={() => {/* Implement hint */}}
          />
        </div>
      </div>

      {/* Game Layout */}
      <div className="space-y-8">
        {/* Top Row: Stock, Waste, and Foundations */}
        <div className="flex justify-between">
          <div className="flex space-x-4">
            {/* Stock Pile */}
            <div onClick={handleStockClick} className="cursor-pointer">
              <CardPile
                pile={gameState.piles['stock']}
                onClick={() => {}}
                isSelected={false}
              />
            </div>

            {/* Waste Pile */}
            <CardPile
              pile={gameState.piles['waste']}
              onClick={(index) => handleCardClick('waste', index)}
              isSelected={selectedCard?.pileId === 'waste' && selectedCard.cardIndex === gameState.piles['waste'].cards.length - 1}
            />
          </div>

          {/* Foundation Piles */}
          <div className="flex space-x-4">
            {Array.from({ length: 4 }, (_, i) => (
              <CardPile
                key={`foundation-${i}`}
                pile={gameState.piles[`foundation-${i}`]}
                onClick={() => handleCardClick(`foundation-${i}`, 0)}
                isSelected={false}
              />
            ))}
          </div>
        </div>

        {/* Tableau Piles */}
        <div className="flex justify-center space-x-4">
          {Array.from({ length: 7 }, (_, i) => (
            <CardPile
              key={`tableau-${i}`}
              pile={gameState.piles[`tableau-${i}`]}
              onClick={(index) => handleCardClick(`tableau-${i}`, index)}
              isSelected={selectedCard?.pileId === `tableau-${i}`}
            />
          ))}
        </div>
      </div>

      {/* Win Message */}
      {gameState.isWon && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        >
          <div className="bg-white rounded-2xl p-8 text-center max-w-md">
            <h2 className="text-3xl font-bold text-green-600 mb-4">🎉 Congratulations!</h2>
            <p className="text-gray-700 mb-2">You won the game!</p>
            <p className="text-lg font-semibold mb-6">
              Score: {gameState.score} | Moves: {gameState.moves}
            </p>
            <button
              onClick={() => handleGameComplete(true)}
              className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700"
            >
              Claim Rewards
            </button>
          </div>
        </motion.div>
      )}

      {/* Stake Modal */}
      {showStakeModal && (
        <StakeModal
          isOpen={showStakeModal}
          onClose={() => setShowStakeModal(false)}
          onStake={handleStake}
          stakeAmount={stakeAmount}
          onStakeAmountChange={setStakeAmount}
        />
      )}

      {/* Devnet Helper Modal */}
      {showDevnetHelper && (
        <DevnetHelper
          onClose={() => setShowDevnetHelper(false)}
        />
      )}
    </div>
  )
}