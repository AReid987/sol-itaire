'use client'

import { motion } from 'framer-motion'
import { Pile } from '../../types'
import { PlayingCard } from './PlayingCard'

interface CardPileProps {
  pile: Pile
  onClick: (cardIndex: number) => void
  isSelected: boolean
}

export function CardPile({ pile, onClick, isSelected }: CardPileProps) {
  const handleCardClick = (cardIndex: number) => {
    const card = pile.cards[cardIndex]
    if (card && card.faceUp) {
      onClick(cardIndex)
    }
  }

  const handleEmptyPileClick = () => {
    if (pile.cards.length === 0) {
      onClick(0)
    }
  }

  const getPileClass = () => {
    switch (pile.type) {
      case 'foundation':
        return 'foundation-pile'
      case 'tableau':
        return 'tableau-pile'
      case 'stock':
        return 'card-pile'
      case 'waste':
        return 'card-pile'
      default:
        return 'card-pile'
    }
  }

  return (
    <div className="relative">
      {pile.cards.length === 0 ? (
        <motion.div
          onClick={handleEmptyPileClick}
          whileHover={{ scale: 1.05 }}
          className={`${getPileClass()} ${isSelected ? 'ring-4 ring-blue-400' : ''} cursor-pointer`}
        >
          {pile.type === 'foundation' && (
            <div className="flex items-center justify-center h-full">
              <span className="text-4xl text-yellow-600 opacity-50">A</span>
            </div>
          )}
          {pile.type === 'stock' && (
            <div className="flex items-center justify-center h-full">
              <div className="w-16 h-22 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg border-2 border-blue-900 opacity-50">
                <div className="w-full h-full flex items-center justify-center">
                  <div className="w-12 h-16 bg-blue-700 rounded-sm border border-blue-800" />
                </div>
              </div>
            </div>
          )}
        </motion.div>
      ) : (
        <div className={`${getPileClass()} ${isSelected ? 'ring-4 ring-blue-400' : ''}`}>
          {pile.cards.map((card, index) => (
            <motion.div
              key={`${card.id}-${index}`}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="absolute"
              style={{
                top: pile.type === 'tableau' ? `${index * 30}px` : '0',
                left: '0',
                zIndex: index,
              }}
            >
              <PlayingCard
                card={card}
                isSelected={isSelected && index === pile.cards.length - 1}
                onClick={() => handleCardClick(index)}
              />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}