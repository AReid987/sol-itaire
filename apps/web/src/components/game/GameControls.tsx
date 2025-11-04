'use client'

import { motion } from 'framer-motion'

interface GameControlsProps {
  onNewGame: () => void
  onUndo: () => void
  onHint: () => void
}

export function GameControls({ onNewGame, onUndo, onHint }: GameControlsProps) {
  return (
    <div className="flex space-x-3">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onNewGame}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200"
      >
        🎮 New Game
      </motion.button>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onUndo}
        className="px-4 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors duration-200"
      >
        ↩️ Undo
      </motion.button>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onHint}
        className="px-4 py-2 bg-yellow-600 text-white rounded-lg font-medium hover:bg-yellow-700 transition-colors duration-200"
      >
        💡 Hint
      </motion.button>
    </div>
  )
}