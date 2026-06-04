'use client'

import { motion } from 'framer-motion'

interface RewardsModalProps {
  isOpen: boolean
  onClose: () => void
  onClaim: () => Promise<void>
  score: number
  stakeAmount: number
  isLoading: boolean
}

export function RewardsModal({ isOpen, onClose, onClaim, score, stakeAmount, isLoading }: RewardsModalProps) {
  if (!isOpen) return null

  const gameReward = stakeAmount * 2
  const memecoinReward = Math.floor(score / 100)
  const totalReward = gameReward + memecoinReward

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl p-8 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Claim Your Rewards
        </h2>

        <div className="mb-6">
          <div className="bg-green-50 rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-600 mb-1">Game Reward</p>
            <p className="text-2xl font-bold text-green-600">{gameReward.toLocaleString()} GAME tokens</p>
            <p className="text-xs text-gray-500">(2x stake for winning)</p>
          </div>

          <div className="bg-purple-50 rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-600 mb-1">Memecoin Bonus</p>
            <p className="text-2xl font-bold text-purple-600">{memecoinReward.toLocaleString()} SOLI tokens</p>
            <p className="text-xs text-gray-500">(Performance bonus)</p>
          </div>

          <div className="bg-gray-100 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Total Reward</p>
            <p className="text-3xl font-bold text-gray-900">{totalReward.toLocaleString()} tokens</p>
          </div>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50"
          >
            Skip
          </button>
          <button
            onClick={onClaim}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-medium hover:from-green-700 hover:to-emerald-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Claiming...' : 'Claim Rewards'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}