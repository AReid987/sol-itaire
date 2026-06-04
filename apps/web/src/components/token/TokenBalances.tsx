'use client'

import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { useEffect, useState } from 'react'
import { PublicKey } from '@solana/web3.js'
import { getAccount, getAssociatedTokenAddress } from '@solana/spl-token'
import { motion } from 'framer-motion'
import { GAMING_TOKEN_MINT, MEMECOIN_MINT, useSolana } from '@/hooks/useSolana'

interface TokenBalance {
  mint: string
  balance: number
  decimals: number
  symbol: string
  name: string
}

export function TokenBalances() {
  const { connection } = useConnection()
  const { publicKey } = useWallet()
  const { fetchBalances, balance } = useSolana()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!publicKey) return

    const fetchAllBalances = async () => {
      setLoading(true)
      await fetchBalances()
      setLoading(false)
    }

    fetchAllBalances()
  }, [publicKey, fetchBalances])

  const balances: TokenBalance[] = [
    {
      mint: GAMING_TOKEN_MINT.toBase58(),
      balance: balance.game,
      decimals: 9,
      symbol: 'GAME',
      name: 'Gaming Token',
    },
    {
      mint: MEMECOIN_MINT.toBase58(),
      balance: balance.memecoin,
      decimals: 9,
      symbol: 'SOLI',
      name: 'Sol-itaire Memecoin',
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
        <span className="text-white">Loading...</span>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center space-x-4"
    >
      {balances.map((token, index) => (
        <motion.div
          key={token.mint}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.1 }}
          className="bg-white bg-opacity-10 backdrop-blur-md rounded-lg px-4 py-2 border border-white border-opacity-20"
        >
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" />
            <div>
              <p className="text-white font-medium text-sm">{token.symbol}</p>
              <p className="text-gray-300 text-xs">
                {token.balance.toLocaleString()} {token.name}
              </p>
            </div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  )
}