'use client'

import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { useState, useCallback, useEffect } from 'react'
import {
  PublicKey,
  Transaction,
  SystemProgram,
  TransactionInstruction,
} from '@solana/web3.js'
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAccount,
} from '@solana/spl-token'

export const GAME_PROGRAM_ID = new PublicKey('Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS')
export const GAMING_TOKEN_PROGRAM_ID = new PublicKey('DhkqYC1mAnZ41dgPz6NDLovGM6zxE1j7wHLBAizYkNB8')
export const MEMECOIN_PROGRAM_ID = new PublicKey('A1WF2rG5Vs5tG6nhq2ZeDEN9hyESrWV3dtyq1XdBWkqT')
export const GAMING_TOKEN_MINT = new PublicKey('2M4qUmbTiSRtRmfRcnZFWQyNXqkeQ4c9TzCdC7d6svPD')
export const MEMECOIN_MINT = new PublicKey('6ygxtUVufLvihkSm4xv3Ny42ocRmwbMHaJ23kiovFKiH')

export function useSolana() {
  const { connection } = useConnection()
  const { publicKey, sendTransaction } = useWallet()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [balance, setBalance] = useState<{ game: number; memecoin: number }>({
    game: 0,
    memecoin: 0,
  })

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const deriveGameSeeds = useCallback((player: PublicKey, gameId: string) => {
    return [Buffer.from('game'), player.toBuffer(), Buffer.from(gameId)]
  }, [])

  const deriveEscrowAuthority = useCallback((gameId: string) => {
    return [Buffer.from('escrow'), Buffer.from(gameId)]
  }, [])

  const getTokenBalance = useCallback(async (mint: PublicKey) => {
    if (!publicKey) return 0

    try {
      const tokenAccount = await getAssociatedTokenAddress(mint, publicKey)
      const accountInfo = await getAccount(connection, tokenAccount)
      return Number(accountInfo.amount) / Math.pow(10, 9)
    } catch (err) {
      console.error('Failed to get token balance:', err)
      return 0
    }
  }, [publicKey, connection])

  const fetchBalances = useCallback(async () => {
    if (!publicKey) {
      setBalance({ game: 0, memecoin: 0 })
      return
    }

    const gameBalance = await getTokenBalance(GAMING_TOKEN_MINT)
    const memecoinBalance = await getTokenBalance(MEMECOIN_MINT)
    setBalance({ game: gameBalance, memecoin: memecoinBalance })
  }, [publicKey, getTokenBalance])

  useEffect(() => {
    fetchBalances()
  }, [fetchBalances])

  const initializeGame = useCallback(
    async (stakeAmount: number) => {
      if (!publicKey || !sendTransaction) {
        setError('Wallet not connected')
        return null
      }

      setIsLoading(true)
      setError(null)

      try {
        const gameId = `${publicKey.toBase58()}-${Date.now()}`
        const [gameAccount] = await PublicKey.findProgramAddress(
          deriveGameSeeds(publicKey, gameId),
          GAME_PROGRAM_ID
        )
        const [escrowAuthority] = await PublicKey.findProgramAddress(
          deriveEscrowAuthority(gameId),
          GAME_PROGRAM_ID
        )
        const escrowTokenAccount = await getAssociatedTokenAddress(
          GAMING_TOKEN_MINT,
          escrowAuthority,
          true
        )
        const userTokenAccount = await getAssociatedTokenAddress(GAMING_TOKEN_MINT, publicKey)

        const transaction = new Transaction()

        const escrowAccountInfo = await connection.getAccountInfo(escrowTokenAccount)
        if (!escrowAccountInfo) {
          transaction.add(
            createAssociatedTokenAccountInstruction(
              publicKey,
              escrowTokenAccount,
              escrowAuthority,
              GAMING_TOKEN_MINT,
              TOKEN_PROGRAM_ID,
              ASSOCIATED_TOKEN_PROGRAM_ID
            )
          )
        }

        const gameIdBytes = Buffer.from(gameId)
        const data = Buffer.concat([
          Buffer.from([0]),
          Buffer.from([gameIdBytes.length]),
          gameIdBytes,
          encodeU64(BigInt(Math.floor(stakeAmount * Math.pow(10, 9)))),
          MEMECOIN_MINT.toBuffer(),
        ])

        const initializeGameIx = new TransactionInstruction({
          programId: GAME_PROGRAM_ID,
          keys: [
            { pubkey: gameAccount, isSigner: false, isWritable: true },
            { pubkey: escrowTokenAccount, isSigner: false, isWritable: true },
            { pubkey: escrowAuthority, isSigner: false, isWritable: false },
            { pubkey: userTokenAccount, isSigner: false, isWritable: true },
            { pubkey: GAMING_TOKEN_MINT, isSigner: false, isWritable: false },
            { pubkey: publicKey, isSigner: true, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
          ],
          data,
        })

        transaction.add(initializeGameIx)

        const signature = await sendTransaction(transaction, connection)
        await connection.confirmTransaction(signature, 'confirmed')

        setIsLoading(false)
        return { signature, gameId }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize game'
        setError(errorMessage)
        setIsLoading(false)
        return null
      }
    },
    [publicKey, sendTransaction, connection, deriveGameSeeds, deriveEscrowAuthority]
  )

  const makeMove = useCallback(
    async (gameId: string, fromPile: string, toPile: string, cardIndex: number) => {
      if (!publicKey || !sendTransaction) {
        setError('Wallet not connected')
        return null
      }

      setIsLoading(true)
      setError(null)

      try {
        const [gameAccount] = await PublicKey.findProgramAddress(
          deriveGameSeeds(publicKey, gameId),
          GAME_PROGRAM_ID
        )

        const fromPileBytes = Buffer.from(fromPile)
        const toPileBytes = Buffer.from(toPile)
        const data = Buffer.concat([
          Buffer.from([1]),
          Buffer.from([fromPileBytes.length]),
          fromPileBytes,
          Buffer.from([toPileBytes.length]),
          toPileBytes,
          encodeU8(cardIndex),
        ])

        const makeMoveIx = new TransactionInstruction({
          programId: GAME_PROGRAM_ID,
          keys: [
            { pubkey: gameAccount, isSigner: false, isWritable: true },
            { pubkey: publicKey, isSigner: true, isWritable: false },
          ],
          data,
        })

        const transaction = new Transaction().add(makeMoveIx)
        const signature = await sendTransaction(transaction, connection)
        await connection.confirmTransaction(signature, 'confirmed')

        setIsLoading(false)
        return signature
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to make move'
        setError(errorMessage)
        setIsLoading(false)
        return null
      }
    },
    [publicKey, sendTransaction, connection, deriveGameSeeds]
  )

  const completeGame = useCallback(
    async (gameId: string, won: boolean, finalScore: number) => {
      if (!publicKey || !sendTransaction) {
        setError('Wallet not connected')
        return null
      }

      setIsLoading(true)
      setError(null)

      try {
        const [gameAccount] = await PublicKey.findProgramAddress(
          deriveGameSeeds(publicKey, gameId),
          GAME_PROGRAM_ID
        )
        const [escrowAuthority] = await PublicKey.findProgramAddress(
          deriveEscrowAuthority(gameId),
          GAME_PROGRAM_ID
        )
        const escrowTokenAccount = await getAssociatedTokenAddress(
          GAMING_TOKEN_MINT,
          escrowAuthority,
          true
        )
        const userTokenAccount = await getAssociatedTokenAddress(GAMING_TOKEN_MINT, publicKey)

        const data = Buffer.concat([
          Buffer.from([2]),
          encodeU64(BigInt(Math.floor(finalScore))),
        ])

        const completeGameIx = new TransactionInstruction({
          programId: GAME_PROGRAM_ID,
          keys: [
            { pubkey: gameAccount, isSigner: false, isWritable: true },
            { pubkey: escrowTokenAccount, isSigner: false, isWritable: true },
            { pubkey: userTokenAccount, isSigner: false, isWritable: true },
            { pubkey: escrowAuthority, isSigner: false, isWritable: false },
            { pubkey: publicKey, isSigner: true, isWritable: false },
            { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
          ],
          data,
        })

        const transaction = new Transaction().add(completeGameIx)
        const signature = await sendTransaction(transaction, connection)
        await connection.confirmTransaction(signature, 'confirmed')

        setIsLoading(false)
        return signature
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to complete game'
        setError(errorMessage)
        setIsLoading(false)
        return null
      }
    },
    [publicKey, sendTransaction, connection, deriveGameSeeds, deriveEscrowAuthority]
  )

  const stakeTokens = useCallback(
    async (amount: number) => {
      if (!publicKey || !sendTransaction) {
        setError('Wallet not connected')
        return null
      }

      setIsLoading(true)
      setError(null)

      try {
        const userTokenAccount = await getAssociatedTokenAddress(GAMING_TOKEN_MINT, publicKey)

        const [stakeAccount] = await PublicKey.findProgramAddress(
          [Buffer.from('stake'), publicKey.toBuffer(), GAMING_TOKEN_MINT.toBuffer()],
          GAMING_TOKEN_PROGRAM_ID
        )
        const [stakeVault] = await PublicKey.findProgramAddress(
          [Buffer.from('stake_vault'), GAMING_TOKEN_MINT.toBuffer()],
          GAMING_TOKEN_PROGRAM_ID
        )
        const [rewardVault] = await PublicKey.findProgramAddress(
          [Buffer.from('reward_vault'), GAMING_TOKEN_MINT.toBuffer()],
          GAMING_TOKEN_PROGRAM_ID
        )

        const data = Buffer.concat([
          encodeU8(1),
          encodeU64(BigInt(Math.floor(amount * Math.pow(10, 9)))),
          encodeI64(BigInt(7 * 24 * 60 * 60)),
        ])

        const stakeTokensIx = new TransactionInstruction({
          programId: GAMING_TOKEN_PROGRAM_ID,
          keys: [
            { pubkey: stakeAccount, isSigner: false, isWritable: true },
            { pubkey: stakeVault, isSigner: false, isWritable: true },
            { pubkey: rewardVault, isSigner: false, isWritable: true },
            { pubkey: userTokenAccount, isSigner: false, isWritable: true },
            { pubkey: GAMING_TOKEN_MINT, isSigner: false, isWritable: false },
            { pubkey: publicKey, isSigner: true, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
          ],
          data,
        })

        const transaction = new Transaction().add(stakeTokensIx)
        const signature = await sendTransaction(transaction, connection)
        await connection.confirmTransaction(signature, 'confirmed')

        fetchBalances()
        setIsLoading(false)
        return signature
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to stake tokens'
        setError(errorMessage)
        setIsLoading(false)
        return null
      }
    },
    [publicKey, sendTransaction, connection, fetchBalances]
  )

  const claimRewards = useCallback(
    async (gameId: string, amount: number) => {
      if (!publicKey || !sendTransaction) {
        setError('Wallet not connected')
        return null
      }

      setIsLoading(true)
      setError(null)

      try {
        const [memecoinConfig] = await PublicKey.findProgramAddress(
          [Buffer.from('memecoin_config'), MEMECOIN_MINT.toBuffer()],
          MEMECOIN_PROGRAM_ID
        )
        const gameRewardsAccount = await getAssociatedTokenAddress(
          MEMECOIN_MINT,
          publicKey
        )
        const playerAccount = await getAssociatedTokenAddress(MEMECOIN_MINT, publicKey)

        const gameIdBytes = Buffer.from(gameId)
        const data = Buffer.concat([
          encodeU8(3),
          publicKey.toBuffer(),
          Buffer.from([gameIdBytes.length]),
          gameIdBytes,
          encodeU64(BigInt(Math.floor(amount * Math.pow(10, 9))))
        ])

        const claimRewardsIx = new TransactionInstruction({
          programId: MEMECOIN_PROGRAM_ID,
          keys: [
            { pubkey: memecoinConfig, isSigner: false, isWritable: true },
            { pubkey: publicKey, isSigner: true, isWritable: true },
            { pubkey: gameRewardsAccount, isSigner: false, isWritable: true },
            { pubkey: playerAccount, isSigner: false, isWritable: true },
            { pubkey: MEMECOIN_MINT, isSigner: false, isWritable: false },
            { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          ],
          data,
        })

        const transaction = new Transaction().add(claimRewardsIx)
        const signature = await sendTransaction(transaction, connection)
        await connection.confirmTransaction(signature, 'confirmed')

        fetchBalances()
        setIsLoading(false)
        return signature
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to claim rewards'
        setError(errorMessage)
        setIsLoading(false)
        return null
      }
    },
    [publicKey, sendTransaction, connection, fetchBalances]
  )

  const withdrawStake = useCallback(
    async (gameId: string) => {
      if (!publicKey || !sendTransaction) {
        setError('Wallet not connected')
        return null
      }

      setIsLoading(true)
      setError(null)

      try {
        const [gameAccount] = await PublicKey.findProgramAddress(
          deriveGameSeeds(publicKey, gameId),
          GAME_PROGRAM_ID
        )
        const [escrowAuthority] = await PublicKey.findProgramAddress(
          deriveEscrowAuthority(gameId),
          GAME_PROGRAM_ID
        )
        const escrowTokenAccount = await getAssociatedTokenAddress(
          GAMING_TOKEN_MINT,
          escrowAuthority,
          true
        )
        const userTokenAccount = await getAssociatedTokenAddress(GAMING_TOKEN_MINT, publicKey)

        const data = Buffer.concat([
          encodeU8(3)
        ])

        const withdrawStakeIx = new TransactionInstruction({
          programId: GAME_PROGRAM_ID,
          keys: [
            { pubkey: gameAccount, isSigner: false, isWritable: true },
            { pubkey: escrowTokenAccount, isSigner: false, isWritable: true },
            { pubkey: userTokenAccount, isSigner: false, isWritable: true },
            { pubkey: escrowAuthority, isSigner: false, isWritable: false },
            { pubkey: publicKey, isSigner: true, isWritable: false },
            { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
          ],
          data,
        })

        const transaction = new Transaction().add(withdrawStakeIx)
        const signature = await sendTransaction(transaction, connection)
        await connection.confirmTransaction(signature, 'confirmed')

        fetchBalances()
        setIsLoading(false)
        return signature
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to withdraw stake'
        setError(errorMessage)
        setIsLoading(false)
        return null
      }
    },
    [publicKey, sendTransaction, connection, deriveGameSeeds, deriveEscrowAuthority, fetchBalances]
  )

  return {
    initializeGame,
    makeMove,
    completeGame,
    getTokenBalance,
    fetchBalances,
    stakeTokens,
    claimRewards,
    withdrawStake,
    clearError,
    isLoading,
    error,
    isConnected: !!publicKey,
    publicKey,
    balance,
  }
}

function encodeU64(value: bigint): Buffer {
  const buf = Buffer.alloc(8)
  buf.writeBigUInt64LE(value)
  return buf
}

function encodeI64(value: bigint): Buffer {
  const buf = Buffer.alloc(8)
  buf.writeBigInt64LE(value)
  return buf
}

function encodeU8(value: number): Buffer {
  return Buffer.from([value & 0xff])
}