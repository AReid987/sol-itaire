'use client'

import { useState } from 'react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { useWallet } from '@solana/wallet-adapter-react'
import { GameBoard } from '@/components/game/GameBoard'
import { GameStats } from '@/components/game/GameStats'
import { WalletConnect } from '@/components/wallet/WalletConnect'
import { TokenBalances } from '@/components/token/TokenBalances'
import { motion } from 'framer-motion'

export default function Home() {
  const { connected } = useWallet()
  const [gameStarted, setGameStarted] = useState(false)

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="bg-black bg-opacity-20 backdrop-blur-md border-b border-white border-opacity-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <motion.div
                initial={{ rotate: 0 }}
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
              />
              <h1 className="text-2xl font-bold gradient-text">Sol-itaire</h1>
            </div>

            <div className="flex items-center space-x-6">
              {connected && <TokenBalances />}
              <WalletMultiButton className="wallet-button" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {!connected ? (
          <WalletConnect />
        ) : (
          <div className="space-y-8">
            {/* Game Stats */}
            <GameStats />

            {/* Game Board */}
            {gameStarted ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <GameBoard onGameEnd={() => setGameStarted(false)} />
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="text-center py-16"
              >
                <h2 className="text-4xl font-bold text-white mb-4">
                  Ready to Play?
                </h2>
                <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                  Stake tokens, play classic Solitaire, and win crypto rewards on the Solana blockchain!
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <button
                    onClick={() => setGameStarted(true)}
                    className="stake-button text-lg"
                  >
                    🎮 Start New Game
                  </button>

                  <div className="flex items-center space-x-2 text-gray-300">
                    <span className="text-2xl">💰</span>
                    <span>Win up to 2x your stake!</span>
                  </div>
                </div>

                <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-6 border border-white border-opacity-20"
                  >
                    <div className="text-3xl mb-3">🃏</div>
                    <h3 className="text-xl font-semibold text-white mb-2">Classic Solitaire</h3>
                    <p className="text-gray-300">
                      Enjoy the timeless card game you know and love, now with crypto rewards.
                    </p>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-6 border border-white border-opacity-20"
                  >
                    <div className="text-3xl mb-3">🎯</div>
                    <h3 className="text-xl font-semibold text-white mb-2">Play-to-Earn</h3>
                    <p className="text-gray-300">
                      Stake gaming tokens and earn rewards based on your performance.
                    </p>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-6 border border-white border-opacity-20"
                  >
                    <div className="text-3xl mb-3">🏆</div>
                    <h3 className="text-xl font-semibold text-white mb-2">Compete & Win</h3>
                    <p className="text-gray-300">
                      Climb the leaderboard and compete for exclusive memecoin rewards.
                    </p>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-black bg-opacity-20 backdrop-blur-md border-t border-white border-opacity-10 mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-gray-400">
            <p>&copy; 2024 Sol-itaire. Built on Solana.</p>
            <p className="mt-2 text-sm">
              Play responsibly. Crypto gaming involves financial risk.
            </p>
          </div>
        </div>
      </footer>
    </main>
  )
}