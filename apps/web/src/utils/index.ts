import { Card } from '../types';

// Utility Functions
export const formatAddress = (address: string, length = 4): string => {
  return `${address.slice(0, length)}...${address.slice(-length)}`;
};

export const formatBalance = (balance: number, decimals = 9): string => {
  return (balance / Math.pow(10, decimals)).toFixed(4);
};

export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export const isValidPublicKey = (publicKey: string): boolean => {
  try {
    // Basic validation for Solana public key format
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(publicKey);
  } catch {
    return false;
  }
};

// Game utilities
export const shuffleArray = <T>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

export const createDeck = (): Card[] => {
  const suits: Card['suit'][] = ['hearts', 'diamonds', 'clubs', 'spades'];
  const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

  const deck: Card[] = [];
  suits.forEach(suit => {
    ranks.forEach((rank, index) => {
      deck.push({
        suit,
        rank,
        value: index + 1,
        faceUp: false,
        id: `${suit}-${rank}`
      });
    });
  });

  return shuffleArray(deck);
};

export const canPlaceOnTableau = (card: Card, targetCard: Card | null): boolean => {
  if (!targetCard) return card.rank === 'K';

  const cardValue = getCardValue(card.rank);
  const targetValue = getCardValue(targetCard.rank);

  return targetValue - cardValue === 1 && getCardColor(card) !== getCardColor(targetCard);
};

export const canPlaceOnFoundation = (card: Card, foundationCards: Card[]): boolean => {
  if (foundationCards.length === 0) return card.rank === 'A';

  const topCard = foundationCards[foundationCards.length - 1];
  const cardValue = getCardValue(card.rank);
  const topValue = getCardValue(topCard.rank);

  return cardValue - topValue === 1 && card.suit === topCard.suit;
};

export const getCardColor = (card: Card): 'red' | 'black' => {
  return card.suit === 'hearts' || card.suit === 'diamonds' ? 'red' : 'black';
};

export const getCardValue = (rank: string): number => {
  switch (rank) {
    case 'A': return 1;
    case 'J': return 11;
    case 'Q': return 12;
    case 'K': return 13;
    default: return parseInt(rank);
  }
};

export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const calculateScore = (moves: number, time: number, baseScore: number = 1000): number => {
  const movePenalty = moves * 5;
  const timePenalty = Math.floor(time / 10);
  return Math.max(0, baseScore - movePenalty - timePenalty);
};