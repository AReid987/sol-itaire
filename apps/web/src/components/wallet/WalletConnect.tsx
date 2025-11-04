'use client'

import { motion } from 'framer-motion'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'

export function WalletConnect() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center min-h-[60vh]"
    >
      <div className="text-center max-w-2xl mx-auto">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="w-24 h-24 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mx-auto mb-8"
        />

        <h1 className="text-5xl font-bold text-white mb-6 gradient-text">
          Welcome to Sol-itaire
        </h1>

        <p className="text-xl text-gray-300 mb-8">
          Connect your wallet to start playing classic Solitaire with crypto rewards on Solana
        </p>

        <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-2xl p-8 border border-white border-opacity-20">
          <h2 className="text-2xl font-semibold text-white mb-6">
            Getting Started
          </h2>

          <div className="space-y-4 text-left max-w-md mx-auto">
            <div className="flex items-start space-x-3">
              <span className="text-2xl">🔗</span>
              <div>
                <h3 className="text-white font-medium">Connect Wallet</h3>
                <p className="text-gray-300 text-sm">
                  Connect your Solana wallet (Phantom, Solflare, etc.)
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <span className="text-2xl">💰</span>
              <div>
                <h3 className="text-white font-medium">Get Gaming Tokens</h3>
                <p className="text-gray-300 text-sm">
                  Acquire gaming tokens to stake and play
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <span className="text-2xl">🎮</span>
              <div>
                <h3 className="text-white font-medium">Play & Earn</h3>
                <p className="text-gray-300 text-sm">
                  Stake tokens, play Solitaire, and win rewards
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <WalletMultiButton className="wallet-button w-full text-lg py-4" />
          </div>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <div className="flex items-center space-x-2 bg-white bg-opacity-10 rounded-full px-4 py-2">
            <div className="w-6 h-6 bg-purple-500 rounded-full" />
            <span className="text-white text-sm">Phantom</span>
          </div>
          <div className="flex items-center space-x-2 bg-white bg-opacity-10 rounded-full px-4 py-2">
            <div className="w-6 h-6 bg-orange-500 rounded-full" />
            <span className="text-white text-sm">Solflare</span>
          </div>
          <div className="flex items-center space-x-2 bg-white bg-opacity-10 rounded-full px-4 py-2">
            <div className="w-6 h-6 bg-blue-500 rounded-full" />
            <span className="text-white text-sm">Backpack</span>
          </div>
          <div className="flex items-center space-x-2 bg-white bg-opacity-10 rounded-full px-4 py-2">
            <div className="w-6 h-6 bg-blue-600 rounded-full" />
            <span className="text-white text-sm">Coinbase</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}