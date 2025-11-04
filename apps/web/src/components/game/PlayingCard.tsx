'use client'

import { motion } from 'framer-motion'
import { Card, CardSuit, CardRank } from '../../types'
import { getCardColor } from '../../utils'

interface PlayingCardProps {
  card: Card
  isDragging?: boolean
  isSelected?: boolean
  onClick?: () => void
}

export function PlayingCard({ card, isDragging, isSelected, onClick }: PlayingCardProps) {
  const color = getCardColor(card)
  const suitSymbol = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠',
  }[card.suit]

  const cardVariants = {
    idle: { scale: 1, rotateY: 0 },
    hover: { scale: 1.05, rotateY: 5 },
    selected: { scale: 1.1, y: -10 },
    dragging: { scale: 1.1, rotate: 5, zIndex: 1000 },
  }

  return (
    <motion.div
      variants={cardVariants}
      animate={isDragging ? 'dragging' : isSelected ? 'selected' : 'idle'}
      whileHover="hover"
      onClick={onClick}
      className={`solitaire-card ${color} ${isSelected ? 'ring-4 ring-blue-400' : ''}`}
      style={{
        cursor: card.faceUp ? 'pointer' : 'default',
        userSelect: 'none',
      }}
    >
      {card.faceUp ? (
        <div className="flex flex-col items-center justify-between h-full p-2">
          {/* Top Rank and Suit */}
          <div className="flex flex-col items-center">
            <span className={`text-2xl font-bold ${color === 'red' ? 'text-red-500' : 'text-gray-900'}`}>
              {card.rank}
            </span>
            <span className={`text-3xl ${color === 'red' ? 'text-red-500' : 'text-gray-900'}`}>
              {suitSymbol}
            </span>
          </div>

          {/* Center Suit */}
          <span className={`text-4xl ${color === 'red' ? 'text-red-500' : 'text-gray-900'} opacity-20`}>
            {suitSymbol}
          </span>

          {/* Bottom Rank and Suit (upside down) */}
          <div className="flex flex-col items-center rotate-180">
            <span className={`text-2xl font-bold ${color === 'red' ? 'text-red-500' : 'text-gray-900'}`}>
              {card.rank}
            </span>
            <span className={`text-3xl ${color === 'red' ? 'text-red-500' : 'text-gray-900'}`}>
              {suitSymbol}
            </span>
          </div>
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-12 h-16 bg-gradient-to-br from-blue-600 to-blue-800 rounded border-2 border-blue-900">
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-8 h-10 bg-blue-700 rounded-sm border border-blue-800" />
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}