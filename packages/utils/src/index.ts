import { PublicKey } from '@solana/web3.js';
import { Card, CardSuit, CardRank, GameState, Pile } from '@sol-itaire/types';

// Card utility functions
export const createDeck = (): Card[] => {
  const suits: CardSuit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
  const ranks: CardRank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const deck: Card[] = [];

  suits.forEach(suit => {
    ranks.forEach((rank, index) => {
      deck.push({
        suit,
        rank,
        id: `${suit}-${rank}`,
        faceUp: false
      });
    });
  });

  return shuffle(deck);
};

export const shuffle = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const getCardValue = (rank: CardRank): number => {
  switch (rank) {
    case 'A': return 1;
    case 'J': return 11;
    case 'Q': return 12;
    case 'K': return 13;
    default: return parseInt(rank);
  }
};

export const getCardColor = (suit: CardSuit): 'red' | 'black' => {
  return (suit === 'hearts' || suit === 'diamonds') ? 'red' : 'black';
};

export const canPlaceOnTableau = (card: Card, targetCard: Card | null): boolean => {
  if (!targetCard) return getCardValue(card.rank) === 13; // Only Kings on empty tableau

  const cardValue = getCardValue(card.rank);
  const targetValue = getCardValue(targetCard.rank);
  const cardColor = getCardColor(card.suit);
  const targetColor = getCardColor(targetCard.suit);

  return cardValue === targetValue - 1 && cardColor !== targetColor;
};

export const canPlaceOnFoundation = (card: Card, foundation: Pile): boolean => {
  if (foundation.cards.length === 0) {
    return card.rank === 'A';
  }

  const topCard = foundation.cards[foundation.cards.length - 1];
  const cardValue = getCardValue(card.rank);
  const topValue = getCardValue(topCard.rank);

  return card.suit === topCard.suit && cardValue === topValue + 1;
};

// Game state utility functions
export const initializeGame = (player: string): GameState => {
  const deck = createDeck();

  // Initialize tableau piles
  const tableauPiles: Record<string, Pile> = {};
  for (let i = 0; i < 7; i++) {
    const tableauCards: Card[] = [];
    for (let j = 0; j <= i; j++) {
      const card = deck.pop()!;
      if (j === i) {
        card.faceUp = true;
      }
      tableauCards.push(card);
    }
    tableauPiles[`tableau-${i}`] = {
      cards: tableauCards,
      type: 'tableau',
      id: `tableau-${i}`
    };
  }

  // Initialize foundation piles
  const foundationPiles: Record<string, Pile> = {};
  for (let i = 0; i < 4; i++) {
    foundationPiles[`foundation-${i}`] = {
      cards: [],
      type: 'foundation',
      id: `foundation-${i}`
    };
  }

  // Initialize stock pile
  deck.forEach(card => card.faceUp = false);
  const stockPile: Pile = {
    cards: deck,
    type: 'stock',
    id: 'stock'
  };

  return {
    piles: {
      ...tableauPiles,
      ...foundationPiles,
      stock: stockPile,
      waste: {
        cards: [],
        type: 'waste',
        id: 'waste'
      }
    },
    moves: 0,
    score: 0,
    isWon: false,
    isComplete: false,
    startTime: Date.now(),
    player
  };
};

export const isGameWon = (gameState: GameState): boolean => {
  const foundationCards = Object.values(gameState.piles)
    .filter(pile => pile.type === 'foundation')
    .reduce((total, pile) => total + pile.cards.length, 0);

  return foundationCards === 52;
};

export const calculateScore = (gameState: GameState): number => {
  let score = 0;

  // Foundation cards give points
  Object.values(gameState.piles)
    .filter(pile => pile.type === 'foundation')
    .forEach(pile => {
      score += pile.cards.length * 10;
    });

  // Time bonus (for quick completion)
  if (gameState.isComplete && gameState.endTime) {
    const timeTaken = gameState.endTime - gameState.startTime;
    const timeBonus = Math.max(0, 1000 - Math.floor(timeTaken / 1000));
    score += timeBonus;
  }

  // Move penalty
  score -= gameState.moves * 1;

  return Math.max(0, score);
};

// Blockchain utility functions
export const isValidPublicKey = (publicKey: string): boolean => {
  try {
    new PublicKey(publicKey);
    return true;
  } catch {
    return false;
  }
};

export const formatLamports = (lamports: number, decimals: number = 9): string => {
  return (lamports / Math.pow(10, decimals)).toFixed(decimals);
};

export const parseLamports = (amount: string, decimals: number = 9): number => {
  return Math.floor(parseFloat(amount) * Math.pow(10, decimals));
};

// Transaction utility functions
export const createGameSeed = (player: string, timestamp: number): Buffer => {
  const playerBuffer = Buffer.from(player, 'utf8');
  const timestampBuffer = Buffer.alloc(8);
  timestampBuffer.writeBigUInt64LE(BigInt(timestamp));

  return Buffer.concat([playerBuffer, timestampBuffer]);
};

export const generateGameId = (player: string): string => {
  const timestamp = Date.now();
  const seed = createGameSeed(player, timestamp);
  return seed.toString('hex').substring(0, 32);
};

// Validation utility functions
export const validateMove = (
  fromPile: Pile,
  toPile: Pile,
  cardIndex: number
): { valid: boolean; reason?: string } => {
  if (cardIndex >= fromPile.cards.length) {
    return { valid: false, reason: 'Invalid card index' };
  }

  const card = fromPile.cards[cardIndex];
  if (!card.faceUp) {
    return { valid: false, reason: 'Cannot move face-down card' };
  }

  if (toPile.type === 'tableau') {
    const targetCard = toPile.cards[toPile.cards.length - 1] || null;
    if (!canPlaceOnTableau(card, targetCard)) {
      return { valid: false, reason: 'Invalid tableau move' };
    }
  } else if (toPile.type === 'foundation') {
    if (cardIndex !== fromPile.cards.length - 1) {
      return { valid: false, reason: 'Can only move top card to foundation' };
    }
    if (!canPlaceOnFoundation(card, toPile)) {
      return { valid: false, reason: 'Invalid foundation move' };
    }
  }

  return { valid: true };
};

export const formatTime = (milliseconds: number): string => {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};