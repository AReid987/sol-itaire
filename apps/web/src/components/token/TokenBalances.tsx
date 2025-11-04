'use client'

import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { useEffect, useState } from 'react'
import { PublicKey } from '@solana/web3.js'
import { getAccount } from '@solana/spl-token'
import { motion } from 'framer-motion'

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
  const [balances, setBalances] = useState<TokenBalance[]>([])
  const [loading, setLoading] = useState(false)

  // Token mint addresses (these would come from your deployed programs)
  const TOKENS = {
    GAMING_TOKEN: {
      mint: 'GAMING_TOKEN_MINT_ADDRESS', // Replace with actual mint
      symbol: 'GAME',
      name: 'Gaming Token',
      decimals: 9,
    },
    MEMECOIN: {
      mint: 'MEMECOIN_MINT_ADDRESS', // Replace with actual mint
      symbol: 'SOLI',
      name: 'Sol-itaire Memecoin',
      decimals: 9,
    },
  }

  useEffect(() => {
    if (!publicKey) return

    const fetchBalances = async () => {
      setLoading(true)
      const tokenBalances: TokenBalance[] = []

      for (const [key, token] of Object.entries(TOKENS)) {
        try {
          // Create token account address
          const tokenAccount = await getAssociatedTokenAddress(
            new PublicKey(token.mint),
            publicKey
          )

          // Get account info
          const accountInfo = await getAccount(connection, tokenAccount)

          tokenBalances.push({
            mint: token.mint,
            balance: Number(accountInfo.amount) / Math.pow(10, token.decimals),
            decimals: token.decimals,
            symbol: token.symbol,
            name: token.name,
          })
        } catch (error) {
          // Token account doesn't exist or user has no balance
          tokenBalances.push({
            mint: token.mint,
            balance: 0,
            decimals: token.decimals,
            symbol: token.symbol,
            name: token.name,
          })
        }
      }

      setBalances(tokenBalances)
      setLoading(false)
    }

    fetchBalances()
  }, [publicKey, connection])

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
                {token.balance.toFixed(4)} {token.name}
              </p>
            </div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  )
}

// Helper function to get associated token address
async function getAssociatedTokenAddress(
  mint: PublicKey,
  owner: PublicKey,
  allowOwnerOffCurve = false,
  programId = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
  associatedTokenProgramId = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL')
): Promise<PublicKey> {
  const [associatedToken] = await PublicKey.findProgramAddress(
    [
      owner.toBuffer(),
      programId.toBuffer(),
      mint.toBuffer(),
    ],
    associatedTokenProgramId
  )
  return associatedToken
}