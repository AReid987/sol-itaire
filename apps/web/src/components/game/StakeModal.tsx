'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useSolana, GAMING_TOKEN_MINT } from '@/hooks/useSolana'

interface StakeModalProps {
  isOpen: boolean
  onClose: () => void
  onStake: (amount: number) => Promise<void>
  stakeAmount: number
  onStakeAmountChange: (amount: number) => void
  isLoading?: boolean
}

export function StakeModal({ isOpen, onClose, onStake, stakeAmount, onStakeAmountChange, isLoading = false }: StakeModalProps) {
  const { balance } = useSolana()

  const presetAmounts = useMemo(() => [50, 100, 250, 500, 1000], [])
  const insufficientBalance = balance.game < stakeAmount && stakeAmount > 0

  if (!isOpen) return null

  const handleStake = async () => {
    if (isLoading) return

    try {
      await onStake(stakeAmount)
      onClose()
    } catch (error) {
      console.error("Stake failed", error)
    }
  }

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
          Stake Tokens to Play
        </h2>

        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">
            Available Balance: <span className="font-semibold text-blue-600">{balance.game.toLocaleString()} GAME</span> tokens
          </p>
        </div>

        <p className="text-gray-600 mb-6">
          Stake your gaming tokens to play Solitaire. Win to double your stake!
        </p>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Stake Amount (GAME tokens)
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="number"
              value={stakeAmount}
              onChange={event => onStakeAmountChange(Number(event.target.value))}
              min="1"
              disabled={isLoading}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
            />
            <span className="text-gray-500">GAME</span>
          </div>
          {insufficientBalance && (
            <p className="text-red-500 text-xs mt-1">Insufficient balance</p>
          )}
        </div>

        <div className="mb-6">
          <p className="text-sm text-gray-600 mb-2">Quick amounts:</p>
          <div className="grid grid-cols-3 gap-2">
            {presetAmounts.map((amount) => (
              <button
                key={amount}
                onClick={() => onStakeAmountChange(amount)}
                disabled={amount > balance.game || isLoading}
                className={`px-3 py-2 rounded-lg font-medium transition-colors duration-200 ${
                  stakeAmount === amount
                    ? 'bg-blue-600 text-white'
                    : amount > balance.game
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {amount}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">Rewards</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>🏆 Win: Get 2x your stake back</li>
            <li>🎯 Complete: Get 50% of your stake back</li>
            <li>💎 Bonus: Earn memecoins for great performance</li>
          </ul>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleStake}
            disabled={isLoading || insufficientBalance || stakeAmount <= 0}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Staking...' : 'Stake & Play'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}