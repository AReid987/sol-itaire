import { SecurityUtils } from './security'
import { Card, CardSuit, CardRank, GameState } from '../types'

export class ValidationUtils {
  // Validate card data
  static validateCard(card: any): card is Card {
    if (!card || typeof card !== 'object') return false

    const validSuits: CardSuit[] = ['hearts', 'diamonds', 'clubs', 'spades']
    const validRanks: CardRank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']

    return validSuits.includes(card.suit) &&
           validRanks.includes(card.rank) &&
           typeof card.id === 'string' &&
           typeof card.faceUp === 'boolean'
  }

  // Validate pile data
  static validatePile(pile: any): boolean {
    if (!pile || typeof pile !== 'object') return false

    const validTypes = ['tableau', 'foundation', 'stock', 'waste']
    return validTypes.includes(pile.type) &&
           typeof pile.id === 'string' &&
           Array.isArray(pile.cards) &&
           pile.cards.every((card: any) => this.validateCard(card))
  }

  // Validate complete game state
  static validateGameState(gameState: any): gameState is GameState {
    if (!gameState || typeof gameState !== 'object') return false

    // Check required fields
    const requiredFields = ['piles', 'moves', 'score', 'isWon', 'isComplete', 'startTime', 'player']
    if (!requiredFields.every(field => field in gameState)) return false

    // Validate player address
    if (!SecurityUtils.isValidPublicKey(gameState.player)) return false

    // Validate timestamp
    if (!Number.isInteger(gameState.startTime) || gameState.startTime <= 0) return false

    // Validate numeric fields
    if (!Number.isInteger(gameState.moves) || gameState.moves < 0) return false
    if (!Number.isInteger(gameState.score) || gameState.score < 0) return false
    if (typeof gameState.isWon !== 'boolean') return false
    if (typeof gameState.isComplete !== 'boolean') return false

    // Validate piles
    if (!gameState.piles || typeof gameState.piles !== 'object') return false
    const pileEntries = Object.entries(gameState.piles)

    // Check for required pile types
    const pileTypes = pileEntries.map(([, pile]) => pile.type)
    const hasTableau = pileTypes.filter(type => type === 'tableau').length === 7
    const hasFoundations = pileTypes.filter(type => type === 'foundation').length === 4
    const hasStock = pileTypes.includes('stock')
    const hasWaste = pileTypes.includes('waste')

    if (!hasTableau || !hasFoundations || !hasStock || !hasWaste) return false

    // Validate each pile
    return pileEntries.every(([, pile]) => this.validatePile(pile))
  }

  // Validate move parameters
  static validateMoveParams(fromPile: string, toPile: string, cardIndex: number): boolean {
    if (typeof fromPile !== 'string' || typeof toPile !== 'string') return false
    if (!Number.isInteger(cardIndex) || cardIndex < 0) return false

    // Validate pile ID format
    const validPileTypes = ['tableau', 'foundation', 'stock', 'waste']
    const fromPileType = fromPile.split('-')[0]
    const toPileType = toPile.split('-')[0]

    return validPileTypes.includes(fromPileType) && validPileTypes.includes(toPileType)
  }

  // Validate stake amount
  static validateStakeAmount(amount: number, balance: number): { isValid: boolean; error?: string } {
    if (!Number.isInteger(amount) || amount <= 0) {
      return { isValid: false, error: 'Stake amount must be a positive integer' }
    }

    if (amount > balance) {
      return { isValid: false, error: 'Insufficient balance for this stake amount' }
    }

    const MIN_STAKE = 1
    const MAX_STAKE = 10000

    if (amount < MIN_STAKE) {
      return { isValid: false, error: `Minimum stake amount is ${MIN_STAKE}` }
    }

    if (amount > MAX_STAKE) {
      return { isValid: false, error: `Maximum stake amount is ${MAX_STAKE}` }
    }

    return { isValid: true }
  }

  // Validate transaction data
  static validateTransaction(transaction: any): boolean {
    if (!transaction || typeof transaction !== 'object') return false

    const validTypes = ['start', 'move', 'complete', 'withdraw']
    const validStatuses = ['pending', 'confirmed', 'failed']

    return validTypes.includes(transaction.type) &&
           validStatuses.includes(transaction.status) &&
           typeof transaction.gameId === 'string' &&
           SecurityUtils.isValidPublicKey(transaction.player) &&
           (transaction.amount === undefined || Number.isInteger(transaction.amount)) &&
           Number.isInteger(transaction.timestamp) &&
           transaction.timestamp > 0
  }

  // Validate game configuration
  static validateGameConfig(config: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!config || typeof config !== 'object') {
      errors.push('Game configuration must be an object')
      return { isValid: false, errors }
    }

    // Validate required fields
    const requiredFields = ['minStake', 'maxStake', 'rewardMultiplier', 'network']
    requiredFields.forEach(field => {
      if (!(field in config)) {
        errors.push(`Missing required field: ${field}`)
      }
    })

    // Validate numeric fields
    if (config.minStake !== undefined) {
      if (!Number.isInteger(config.minStake) || config.minStake <= 0) {
        errors.push('minStake must be a positive integer')
      }
    }

    if (config.maxStake !== undefined) {
      if (!Number.isInteger(config.maxStake) || config.maxStake <= 0) {
        errors.push('maxStake must be a positive integer')
      }
    }

    if (config.rewardMultiplier !== undefined) {
      if (typeof config.rewardMultiplier !== 'number' || config.rewardMultiplier <= 0) {
        errors.push('rewardMultiplier must be a positive number')
      }
    }

    // Validate logical constraints
    if (config.minStake && config.maxStake && config.minStake > config.maxStake) {
      errors.push('minStake cannot be greater than maxStake')
    }

    // Validate network
    const validNetworks = ['devnet', 'testnet', 'mainnet-beta']
    if (config.network && !validNetworks.includes(config.network)) {
      errors.push(`Invalid network: ${config.network}`)
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  // Validate API response
  static validateApiResponse(response: any, expectedType: 'game' | 'transaction' | 'stats'): boolean {
    if (!response || typeof response !== 'object') return false

    switch (expectedType) {
      case 'game':
        return this.validateGameState(response.data)
      case 'transaction':
        return this.validateTransaction(response.data)
      case 'stats':
        return this.validatePlayerStats(response.data)
      default:
        return false
    }
  }

  // Validate player stats
  static validatePlayerStats(stats: any): boolean {
    if (!stats || typeof stats !== 'object') return false

    const numericFields = ['gamesPlayed', 'gamesWon', 'totalEarnings', 'bestTime', 'currentStreak']

    return numericFields.every(field =>
      Number.isInteger(stats[field]) && stats[field] >= 0
    ) && stats.gamesPlayed >= stats.gamesWon // Can't win more games than played
  }

  // Sanitize and validate user input for game creation
  static sanitizeGameCreationInput(input: any): { isValid: boolean; sanitized: any; errors: string[] } {
    const errors: string[] = []
    const sanitized: any = {}

    // Validate and sanitize stake amount
    if (input.stakeAmount !== undefined) {
      const stakeValidation = this.validateStakeAmount(input.stakeAmount, Infinity)
      if (!stakeValidation.isValid) {
        errors.push(stakeValidation.error || 'Invalid stake amount')
      } else {
        sanitized.stakeAmount = input.stakeAmount
      }
    }

    // Validate reward mint
    if (input.rewardMint) {
      if (!SecurityUtils.isValidTokenMint(input.rewardMint)) {
        errors.push('Invalid reward mint address')
      } else {
        sanitized.rewardMint = input.rewardMint
      }
    }

    // Validate game options
    if (input.options && typeof input.options === 'object') {
      sanitized.options = {
        difficulty: ['easy', 'medium', 'hard'].includes(input.options.difficulty)
          ? input.options.difficulty
          : 'medium',
        timeLimit: Number.isInteger(input.options.timeLimit) && input.options.timeLimit > 0
          ? input.options.timeLimit
          : undefined,
      }
    }

    return {
      isValid: errors.length === 0,
      sanitized,
      errors,
    }
  }

  // Validate move integrity
  static validateMoveIntegrity(gameState: GameState, fromPile: string, toPile: string, cardIndex: number): { isValid: boolean; error?: string } {
    if (!this.validateGameState(gameState)) {
      return { isValid: false, error: 'Invalid game state' }
    }

    if (!this.validateMoveParams(fromPile, toPile, cardIndex)) {
      return { isValid: false, error: 'Invalid move parameters' }
    }

    const sourcePile = gameState.piles[fromPile]
    const targetPile = gameState.piles[toPile]

    if (!sourcePile || !targetPile) {
      return { isValid: false, error: 'Pile not found' }
    }

    if (cardIndex >= sourcePile.cards.length) {
      return { isValid: false, error: 'Card index out of bounds' }
    }

    const card = sourcePile.cards[cardIndex]
    if (!card.faceUp) {
      return { isValid: false, error: 'Cannot move face-down card' }
    }

    return { isValid: true }
  }
}