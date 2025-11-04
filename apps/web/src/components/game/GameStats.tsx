'use client'

import { motion } from 'framer-motion'
import { useWallet } from '@solana/wallet-adapter-react'

interface GameStatsProps {
  // These would come from your backend or smart contract
  gamesPlayed?: number
  gamesWon?: number
  totalEarnings?: number
  bestTime?: number
  currentStreak?: number
}

export function GameStats({
  gamesPlayed = 0,
  gamesWon = 0,
  totalEarnings = 0,
  bestTime = 0,
  currentStreak = 0,
}: GameStatsProps) {
  const { publicKey } = useWallet()
  const winRate = gamesPlayed > 0 ? (gamesWon / gamesPlayed) * 100 : 0

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatEarnings = (amount: number) => {
    return `${amount.toFixed(2)} GAME`
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8"
    >
      <motion.div
        whileHover={{ scale: 1.05 }}
        className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-6 border border-white border-opacity-20"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-300 text-sm">Games Played</span>
          <span className="text-2xl">🎮</span>
        </div>
        <p className="text-3xl font-bold text-white">{gamesPlayed}</p>
      </motion.div>

      <motion.div
        whileHover={{ scale: 1.05 }}
        className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-6 border border-white border-opacity-20"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-300 text-sm">Win Rate</span>
          <span className="text-2xl">🏆</span>
        </div>
        <p className="text-3xl font-bold text-white">{winRate.toFixed(1)}%</p>
        <p className="text-sm text-gray-400">{gamesWon} wins</p>
      </motion.div>

      <motion.div
        whileHover={{ scale: 1.05 }}
        className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-6 border border-white border-opacity-20"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-300 text-sm">Total Earnings</span>
          <span className="text-2xl">💰</span>
        </div>
        <p className="text-3xl font-bold text-white">{formatEarnings(totalEarnings)}</p>
      </motion.div>

      <motion.div
        whileHover={{ scale: 1.05 }}
        className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-6 border border-white border-opacity-20"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-300 text-sm">Best Time</span>
          <span className="text-2xl">⚡</span>
        </div>
        <p className="text-3xl font-bold text-white">
          {bestTime > 0 ? formatTime(bestTime) : '--:--'}
        </p>
      </motion.div>

      <motion.div
        whileHover={{ scale: 1.05 }}
        className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-6 border border-white border-opacity-20"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-300 text-sm">Current Streak</span>
          <span className="text-2xl">🔥</span>
        </div>
        <p className="text-3xl font-bold text-white">{currentStreak}</p>
        <p className="text-sm text-gray-400">
          {currentStreak > 0 ? 'games' : 'Start playing!'}
        </p>
      </motion.div>
    </motion.div>
  )
}