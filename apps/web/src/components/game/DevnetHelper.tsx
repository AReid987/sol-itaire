'use client'

import { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js'

interface DevnetHelperProps {
  onClose: () => void
}

export function DevnetHelper({ onClose }: DevnetHelperProps) {
  const { publicKey, connected } = useWallet()
  const [isLoading, setIsLoading] = useState(false)
  const [faucetMessage, setFaucetMessage] = useState('')
  const [networkMessage, setNetworkMessage] = useState('')

  // Check if user is on devnet
  const checkNetwork = async () => {
    if (!connected || !publicKey) {
      setNetworkMessage('Please connect your wallet first')
      return false
    }

    try {
      // Try to connect to devnet to check network
      const connection = new Connection(clusterApiUrl('devnet'))
      const balance = await connection.getBalance(publicKey)

      if (balance >= 0) {
        setNetworkMessage('✅ Connected to Devnet successfully!')
        return true
      }
    } catch (error) {
      setNetworkMessage('❌ Not connected to Devnet. Please switch your wallet network to Devnet.')
      return false
    }
  }

  // Auto-switch to devnet (works with some wallets)
  const switchToDevnet = async () => {
    if (!connected || !publicKey) {
      setNetworkMessage('Please connect your wallet first')
      return
    }

    try {
      // This works with Phantom and other compatible wallets
      if ((window as any).solana) {
        await (window as any).solana.request({
          method: 'wallet_switchSolanaChain',
          params: [{ chainId: '0x91b171bb1e321f4b4db3fce8' }] // devnet chainId
        })
        setNetworkMessage('✅ Switched to Devnet! Please refresh the page.')
      }
    } catch (error) {
      setNetworkMessage('❌ Auto-switch failed. Please manually switch to Devnet in your wallet.')
    }
  }

  // Request SOL from faucet
  const requestDevnetSol = async () => {
    if (!connected || !publicKey) {
      setFaucetMessage('Please connect your wallet first')
      return
    }

    setIsLoading(true)
    setFaucetMessage('')

    try {
      // Multiple faucet options for higher success rate
      const faucets = [
        'https://faucet.solana.com/api/v1/faucet',
        'https://solfaucet.com/api/v1/faucet',
      ]

      let success = false
      let results = []

      for (const faucetUrl of faucets) {
        try {
          const response = await fetch(faucetUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              address: publicKey.toBase58(),
              network: 'devnet'
            })
          })

          const data = await response.json()

          if (response.ok) {
            success = true
            results.push(`✅ ${faucetUrl.split('//')[1].split('/')[0]}: Success!`)
          } else {
            results.push(`❌ ${faucetUrl.split('//')[1].split('/')[0]}: ${data.message || 'Failed'}`)
          }
        } catch (error) {
          results.push(`❌ ${faucetUrl.split('//')[1].split('/')[0]}: Network error`)
        }
      }

      if (success) {
        setFaucetMessage(`🎉 SOL requested successfully!\n\n${results.join('\n')}\n\n💡 SOL should arrive in your wallet within 1-2 minutes.`)
      } else {
        setFaucetMessage(`❌ All faucets failed. Try again later or visit https://faucet.solana.com manually`)
      }
    } catch (error) {
      setFaucetMessage('❌ Failed to request SOL. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Auto-add test tokens
  const addTestTokens = async () => {
    if (!connected || !publicKey) {
      setFaucetMessage('Please connect your wallet first')
      return
    }

    try {
      const tokens = [
        {
          address: '2M4qUmbTiSRtRmfRcnZFWQyNXqkeQ4c9TzCdC7d6svPD',
          symbol: 'SOL-IT',
          name: 'Solitaire Gaming Token'
        },
        {
          address: '6ygxtUVufLvihkSm4xv3Ny42ocRmwbMHaJ23kiovFKiH',
          symbol: 'SOL-COIN',
          name: 'Solitaire Memecoin'
        }
      ]

      let addedTokens = []

      for (const token of tokens) {
        try {
          if ((window as any).solana) {
            await (window as any).solana.request({
              method: 'wallet_watchAsset',
              params: {
                type: 'SPL',
                address: token.address,
                symbol: token.symbol,
                name: token.name
              }
            })
            addedTokens.push(`✅ ${token.symbol}`)
          }
        } catch (error) {
          addedTokens.push(`❌ ${token.symbol}: Failed to add`)
        }
      }

      setFaucetMessage(`Token add results:\n${addedTokens.join('\n')}\n\n💡 If tokens failed to add, you can add them manually using the addresses in the guide.`)
    } catch (error) {
      setFaucetMessage('❌ Failed to add tokens. Please add them manually.')
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-blue-600">🚀 Devnet Setup Helper</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="space-y-6">
          {/* Status */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Connection Status:</h3>
            <p className="text-sm">
              Wallet: {connected ? `✅ Connected (${publicKey?.toBase58().slice(0, 8)}...)` : '❌ Not connected'}
            </p>
            {networkMessage && (
              <p className="text-sm mt-2 whitespace-pre-line">{networkMessage}</p>
            )}
          </div>

          {/* Quick Setup Button */}
          <div className="text-center">
            <h3 className="text-xl font-semibold mb-4">🎯 One-Click Devnet Setup</h3>
            <button
              onClick={async () => {
                await checkNetwork()
                await requestDevnetSol()
                await addTestTokens()
              }}
              disabled={!connected || isLoading}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-8 py-4 rounded-lg font-semibold text-lg w-full"
            >
              {isLoading ? '⏳ Setting up...' : '🚀 Setup Everything for Testing'}
            </button>
            <p className="text-sm text-gray-600 mt-2">
              Switches to devnet + Gets SOL + Adds tokens automatically
            </p>
          </div>

          {/* Manual Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <h4 className="font-semibold mb-2">1. Network</h4>
              <button
                onClick={switchToDevnet}
                disabled={!connected}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded text-sm w-full"
              >
                Switch to Devnet
              </button>
            </div>

            <div className="text-center">
              <h4 className="font-semibold mb-2">2. Get SOL</h4>
              <button
                onClick={requestDevnetSol}
                disabled={!connected || isLoading}
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-4 py-2 rounded text-sm w-full"
              >
                {isLoading ? 'Getting...' : 'Get Free SOL'}
              </button>
            </div>

            <div className="text-center">
              <h4 className="font-semibold mb-2">3. Add Tokens</h4>
              <button
                onClick={addTestTokens}
                disabled={!connected}
                className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white px-4 py-2 rounded text-sm w-full"
              >
                Add Test Tokens
              </button>
            </div>
          </div>

          {/* Messages */}
          {faucetMessage && (
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <p className="text-sm whitespace-pre-line">{faucetMessage}</p>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">📋 Quick Instructions:</h4>
            <ol className="text-sm space-y-1 list-decimal list-inside">
              <li>Click "Setup Everything for Testing" above</li>
              <li>Wait 1-2 minutes for SOL to arrive</li>
              <li>Start playing with test tokens!</li>
            </ol>
          </div>

          {/* Help */}
          <div className="bg-gray-100 p-4 rounded-lg text-sm">
            <h4 className="font-semibold mb-2">❓ Need Help?</h4>
            <ul className="space-y-1">
              <li>• If auto-switch fails, manually switch to Devnet in your wallet</li>
              <li>• If SOL doesn't arrive, try the manual faucet: https://faucet.solana.com</li>
              <li>• If tokens don't add, use the addresses in the user guide</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}