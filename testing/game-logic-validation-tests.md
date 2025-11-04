# Game Logic Validation Test Plans

## Overview
This document provides comprehensive test plans for validating the Solitaire game logic, ensuring that all game rules, win conditions, and state management work correctly both on the frontend and blockchain layers.

## Game Logic Architecture

### Game State Structure
```typescript
interface GameState {
  player: string;           // Player's wallet address
  board: BoardState;        // Current board configuration
  moves: number;           // Number of moves made
  score: number;           // Current score
  status: GameStatus;      // Active, Won, Lost, Abandoned
  startTime: number;       // Game start timestamp
  lastMoveTime: number;    // Last move timestamp
  tokenStaked: number;     // SOL-T tokens staked
  potentialReward: number; // Potential MEME reward
}

interface BoardState {
  tableau: Pile[];         // 7 tableau piles
  foundation: Pile[];      // 4 foundation piles (A-K each suit)
  stock: Pile;             // Stock pile
  waste: Pile;             // Waste pile
}

interface Card {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  rank: number;            // 1-13 (A-K)
  faceUp: boolean;
  id: string;              // Unique card identifier
}
```

## Test Categories

### 1. Game Initialization Tests

#### Test Suite: GameSetup
```typescript
describe('Game Initialization', () => {
  test('should create game with valid initial state', async () => {
    const gameState = await initializeGame(playerWallet);

    expect(gameState.board.tableau).toHaveLength(7);
    expect(gameState.board.foundation).toHaveLength(4);
    expect(gameState.board.stock).not.toBeNull();
    expect(gameState.status).toBe('Active');
    expect(gameState.moves).toBe(0);
    expect(gameState.score).toBe(0);
  });

  test('should properly deal initial cards to tableau', async () => {
    const gameState = await initializeGame(playerWallet);

    // Verify tableau setup: 1st pile has 1 card, 2nd has 2, etc.
    for (let i = 0; i < 7; i++) {
      expect(gameState.board.tableau[i].cards).toHaveLength(i + 1);
      // Only last card should be face up
      gameState.board.tableau[i].cards.forEach((card, index) => {
        expect(card.faceUp).toBe(index === i);
      });
    }
  });

  test('should stake correct token amount on game start', async () => {
    const stakeAmount = 100; // SOL-T tokens
    const gameState = await initializeGame(playerWallet, stakeAmount);

    expect(gameState.tokenStaked).toBe(stakeAmount);
    // Verify token was actually transferred to game contract
  });
});
```

### 2. Card Movement Validation Tests

#### Test Suite: CardMovement
```typescript
describe('Card Movement Validation', () => {
  let gameState: GameState;

  beforeEach(async () => {
    gameState = await initializeGame(playerWallet);
  });

  test('should allow valid tableau to tableau moves', async () => {
    // Set up a scenario where a valid move is possible
    const fromPile = 0; // First tableau pile
    const toPile = 1;   // Second tableau pile

    // Get top card from source pile
    const sourceCard = gameState.board.tableau[fromPile].cards.slice(-1)[0];

    // Ensure destination is valid (red on black or black on red, descending rank)
    const destCard = gameState.board.tableau[toPile].cards.slice(-1)[0];

    // Make move if valid
    if (isValidTableauMove(sourceCard, destCard)) {
      const newGameState = await moveCard(
        gameState,
        'tableau', fromPile,
        'tableau', toPile
      );

      expect(newGameState.moves).toBe(gameState.moves + 1);
      expect(newGameState.board.tableau[fromPile].cards).toHaveLength(
        gameState.board.tableau[fromPile].cards.length - 1
      );
    }
  });

  test('should reject invalid tableau moves', async () => {
    // Try to place a red 6 on another red 7 (invalid - same color)
    const invalidMove = () => moveCard(gameState, 'tableau', 0, 'tableau', 1);

    await expect(invalidMove()).rejects.toThrow('Invalid move: Cannot place same color');
  });

  test('should allow valid foundation moves', async () => {
    // Move Ace to empty foundation
    const aceCard = findCard(gameState, { rank: 1, suit: 'hearts' });
    const foundationIndex = 0; // Hearts foundation

    const newGameState = await moveCard(
      gameState,
      'tableau', findCardPile(gameState, aceCard),
      'foundation', foundationIndex
    );

    expect(newGameState.board.foundation[foundationIndex].cards).toHaveLength(1);
    expect(newGameState.score).toBeGreaterThan(gameState.score); // Foundation moves score points
  });

  test('should reject invalid foundation moves', async () => {
    // Try to place 2 of hearts on empty foundation (only Aces allowed)
    const twoHearts = findCard(gameState, { rank: 2, suit: 'hearts' });
    const foundationIndex = 0;

    const invalidMove = () => moveCard(
      gameState,
      'tableau', findCardPile(gameState, twoHearts),
      'foundation', foundationIndex
    );

    await expect(invalidMove()).rejects.toThrow('Invalid move: Only Aces on empty foundation');
  });

  test('should handle stock to waste moves correctly', async () => {
    const initialStockSize = gameState.board.stock.cards.length;

    // Draw from stock
    const newGameState = await drawFromStock(gameState);

    expect(newGameState.board.stock.cards).toHaveLength(initialStockSize - 1);
    expect(newGameState.board.waste.cards).toHaveLength(1);
    expect(newGameState.board.waste.cards[0].faceUp).toBe(true);
  });

  test('should handle empty stock reshuffle', async () => {
    // Empty the stock first
    let gameState = await emptyStock(gameState);

    // Try to draw from empty stock (should reshuffle waste into stock)
    const reshuffledState = await drawFromStock(gameState);

    expect(reshuffledState.board.stock.cards.length).toBeGreaterThan(0);
    expect(reshuffledState.board.waste.cards).toHaveLength(0);
  });
});
```

### 3. Game Rule Enforcement Tests

#### Test Suite: RuleValidation
```typescript
describe('Game Rule Enforcement', () => {
  test('should enforce alternating colors in tableau', () => {
    const redCard = { suit: 'hearts', rank: 7 };
    const blackCard = { suit: 'spades', rank: 8 };
    const anotherRedCard = { suit: 'diamonds', rank: 6 };

    expect(isValidTableauMove(redCard, blackCard)).toBe(true);   // Red on black
    expect(isValidTableauMove(blackCard, redCard)).toBe(true);   // Black on red
    expect(isValidTableauMove(redCard, anotherRedCard)).toBe(false); // Red on red
  });

  test('should enforce descending ranks in tableau', () => {
    const higherCard = { suit: 'hearts', rank: 8 };
    const lowerCard = { suit: 'spades', rank: 7 };
    const sameRankCard = { suit: 'clubs', rank: 8 };

    expect(isValidTableauMove(lowerCard, higherCard)).toBe(true);   // 7 on 8
    expect(isValidTableauMove(higherCard, lowerCard)).toBe(false);  // 8 on 7
    expect(isValidTableauMove(sameRankCard, higherCard)).toBe(false); // 8 on 8
  });

  test('should enforce same suit and ascending ranks in foundation', () => {
    const aceOfHearts = { suit: 'hearts', rank: 1 };
    const twoOfHearts = { suit: 'hearts', rank: 2 };
    const twoOfSpades = { suit: 'spades', rank: 2 };
    const emptyFoundation = null;

    expect(isValidFoundationMove(aceOfHearts, emptyFoundation)).toBe(true);  // Ace on empty
    expect(isValidFoundationMove(twoOfHearts, aceOfHearts)).toBe(true);       // Same suit, ascending
    expect(isValidFoundationMove(twoOfSpades, aceOfHearts)).toBe(false);      // Wrong suit
  });

  test('should prevent moving face-down cards', () => {
    const faceDownCard = { suit: 'hearts', rank: 5, faceUp: false };
    const destinationCard = { suit: 'spades', rank: 6 };

    expect(canMoveCard(faceDownCard)).toBe(false);
  });

  test('should validate complete tableau pile moves', () => {
    // Test moving entire tableau pile when it's properly ordered
    const tableauPile = [
      { suit: 'hearts', rank: 5, faceUp: true },
      { suit: 'spades', rank: 4, faceUp: true },
      { suit: 'diamonds', rank: 3, faceUp: true }
    ];

    expect(canMovePile(tableauPile)).toBe(true);

    // Test invalid pile (wrong order)
    const invalidPile = [
      { suit: 'hearts', rank: 5, faceUp: true },
      { suit: 'diamonds', rank: 3, faceUp: true } // Missing 4 of clubs
    ];

    expect(canMovePile(invalidPile)).toBe(false);
  });
});
```

### 4. Win Condition Tests

#### Test Suite: WinConditions
```typescript
describe('Win Condition Validation', () => {
  test('should detect winning game correctly', async () => {
    let gameState = await initializeGame(playerWallet);

    // Simulate a winning game by moving all cards to foundations
    gameState = await simulateWinningGame(gameState);

    expect(gameState.status).toBe('Won');
    expect(gameState.board.foundation.every(foundation =>
      foundation.cards.length === 13
    )).toBe(true);
  });

  test('should calculate correct winning rewards', async () => {
    const stakeAmount = 100;
    let gameState = await initializeGame(playerWallet, stakeAmount);
    gameState = await simulateWinningGame(gameState);

    const expectedReward = calculateWinningReward(stakeAmount, gameState.moves, gameState.score);
    expect(gameState.potentialReward).toBe(expectedReward);
  });

  test('should handle game timeout correctly', async () => {
    let gameState = await initializeGame(playerWallet);

    // Simulate game timeout (e.g., 24 hours of inactivity)
    gameState = await simulateGameTimeout(gameState);

    expect(gameState.status).toBe('Abandoned');
    expect(gameState.tokenStaked).toBe(0); // Tokens should be returned
  });

  test('should detect dead-end scenarios', async () => {
    let gameState = await initializeGame(playerWallet);

    // Set up a scenario with no valid moves
    gameState = await setupDeadEndScenario(gameState);

    expect(hasValidMoves(gameState)).toBe(false);
    expect(gameState.status).toBe('Lost');
  });
});
```

### 5. State Synchronization Tests

#### Test Suite: StateSync
```typescript
describe('Blockchain State Synchronization', () => {
  test('should sync frontend state with blockchain after each move', async () => {
    let frontendState = await initializeGame(playerWallet);

    // Make a move on the blockchain
    const blockchainState = await makeBlockchainMove(frontendState, moveDetails);

    // Sync frontend with blockchain
    frontendState = await syncWithBlockchain(frontendState.gameId);

    expect(frontendState).toEqual(blockchainState);
  });

  test('should handle network disconnections gracefully', async () => {
    let gameState = await initializeGame(playerWallet);

    // Simulate network disconnection during move
    await simulateNetworkDisconnection();

    // Attempt to make move (should queue locally)
    const queuedMove = await queueMoveLocally(gameState, moveDetails);

    // Reconnect and sync
    await reconnectNetwork();
    const syncedState = await syncQueuedMoves(gameState.gameId);

    expect(syncedState.moves).toBe(gameState.moves + 1);
  });

  test('should prevent state corruption during concurrent moves', async () => {
    const gameState = await initializeGame(playerWallet);

    // Simulate two concurrent moves on the same game
    const move1Promise = makeConcurrentMove(gameState, move1Details);
    const move2Promise = makeConcurrentMove(gameState, move2Details);

    const [result1, result2] = await Promise.allSettled([move1Promise, move2Promise]);

    // One should succeed, one should fail with appropriate error
    expect(
      (result1.status === 'fulfilled' && result2.status === 'rejected') ||
      (result1.status === 'rejected' && result2.status === 'fulfilled')
    ).toBe(true);
  });
});
```

### 6. Edge Case Tests

#### Test Suite: EdgeCases
```typescript
describe('Edge Case Handling', () => {
  test('should handle game initialization failures gracefully', async () => {
    // Simulate insufficient token balance
    const insufficientBalance = 1000000; // More than player has

    await expect(initializeGame(playerWallet, insufficientBalance))
      .rejects.toThrow('Insufficient token balance');
  });

  test('should handle corrupted game state recovery', async () => {
    const corruptedState = createCorruptedGameState();

    const recoveredState = await recoverGameState(corruptedState.gameId);

    expect(recoveredState).not.toBeNull();
    expect(validateGameState(recoveredState)).toBe(true);
  });

  test('should handle move validation timeouts', async () => {
    const gameState = await initializeGame(playerWallet);

    // Simulate slow validation
    await simulateSlowValidation();

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Validation timeout')), 5000)
    );

    await expect(Promise.race([
      makeMove(gameState, moveDetails),
      timeoutPromise
    ])).rejects.toThrow('Validation timeout');
  });

  test('should handle invalid game IDs gracefully', async () => {
    const invalidGameId = 'invalid-game-id';

    await expect(getGameState(invalidGameId))
      .rejects.toThrow('Game not found');
  });

  test('should handle maximum move limits', async () => {
    let gameState = await initializeGame(playerWallet);

    // Make many moves up to the limit
    for (let i = 0; i < MAX_MOVES_PER_GAME; i++) {
      gameState = await makeRandomMove(gameState);
    }

    // Next move should be rejected
    await expect(makeRandomMove(gameState))
      .rejects.toThrow('Maximum move limit reached');
  });
});
```

### 7. Performance Tests

#### Test Suite: Performance
```typescript
describe('Game Logic Performance', () => {
  test('should validate moves within acceptable time limits', async () => {
    const gameState = await initializeGame(playerWallet);
    const moveDetails = generateRandomMove(gameState);

    const startTime = performance.now();
    await validateMove(gameState, moveDetails);
    const endTime = performance.now();

    expect(endTime - startTime).toBeLessThan(100); // Should validate in < 100ms
  });

  test('should handle large number of concurrent games', async () => {
    const games = [];
    const playerWallets = generateTestWallets(100);

    // Create 100 concurrent games
    const gamePromises = playerWallets.map(wallet =>
      initializeGame(wallet)
    );

    const startTime = performance.now();
    const createdGames = await Promise.all(gamePromises);
    const endTime = performance.now();

    expect(createdGames).toHaveLength(100);
    expect(endTime - startTime).toBeLessThan(10000); // Should create 100 games in < 10s
  });

  test('should maintain performance with complex board states', async () => {
    let gameState = await initializeGame(playerWallet);

    // Create a complex board state with many cards in play
    gameState = await createComplexBoardState(gameState);

    const startTime = performance.now();
    await findValidMoves(gameState);
    const endTime = performance.now();

    expect(endTime - startTime).toBeLessThan(50); // Should find moves in < 50ms
  });
});
```

## Test Data Generation

### Test Utilities
```typescript
// test-utils/gameLogicUtils.ts
export class GameLogicTestUtils {
  static createTestGameState(overrides?: Partial<GameState>): GameState {
    return {
      player: 'test-wallet-address',
      board: this.createTestBoard(),
      moves: 0,
      score: 0,
      status: 'Active',
      startTime: Date.now(),
      lastMoveTime: Date.now(),
      tokenStaked: 100,
      potentialReward: 0,
      ...overrides
    };
  }

  static createTestBoard(): BoardState {
    return {
      tableau: this.createTestTableau(),
      foundation: this.createTestFoundations(),
      stock: this.createTestStock(),
      waste: this.createTestWaste()
    };
  }

  static generateRandomMove(gameState: GameState): MoveDetails {
    const validMoves = findAllValidMoves(gameState);
    return validMoves[Math.floor(Math.random() * validMoves.length)];
  }

  static simulateWinningGame(gameState: GameState): Promise<GameState> {
    // Logic to automatically complete a game
    // Useful for testing win conditions
  }

  static setupDeadEndScenario(gameState: GameState): Promise<GameState> {
    // Logic to create a scenario with no valid moves
    // Useful for testing game over conditions
  }
}
```

## Integration with Blockchain Tests

### Hybrid Test Scenarios
```typescript
describe('Frontend-Blockchain Integration', () => {
  test('should maintain game state consistency across layers', async () => {
    // Initialize game on blockchain
    const blockchainGame = await initializeGameOnChain(playerWallet);

    // Load game in frontend
    const frontendGame = await loadGameInFrontend(blockchainGame.gameId);

    // Make moves in frontend
    const frontendMove = await makeFrontendMove(frontendGame, moveDetails);

    // Verify blockchain state matches
    const blockchainState = await getGameFromChain(blockchainGame.gameId);

    expect(frontendMove.board).toEqual(blockchainState.board);
    expect(frontendMove.score).toEqual(blockchainState.score);
  });

  test('should handle transaction failures gracefully', async () => {
    const gameState = await initializeGame(playerWallet);

    // Simulate transaction failure
    await simulateTransactionFailure();

    const moveResult = await makeMoveWithRetry(gameState, moveDetails);

    expect(moveResult.success).toBe(false);
    expect(moveResult.error).toContain('Transaction failed');
    expect(moveResult.gameState).toEqual(gameState); // State unchanged
  });
});
```

## Test Execution Plan

### Phase 1: Core Logic Validation (Days 1-3)
- Game initialization tests
- Basic move validation
- Rule enforcement tests

### Phase 2: Advanced Scenarios (Days 4-5)
- Win condition testing
- State synchronization
- Edge case handling

### Phase 3: Performance & Integration (Days 6-7)
- Performance benchmarking
- Blockchain integration tests
- Load testing

### Phase 4: Security & Reliability (Days 8-10)
- Security validation tests
- Network failure scenarios
- Data integrity checks

## Success Metrics

### Functional Requirements
- ✅ All game rules enforced correctly
- ✅ Win conditions detected accurately
- ✅ State consistency maintained
- ✅ Edge cases handled gracefully

### Performance Requirements
- ✅ Move validation < 100ms
- ✅ Game initialization < 500ms
- ✅ State synchronization < 200ms
- ✅ Support for 1000+ concurrent games

### Reliability Requirements
- ✅ 99.9% test pass rate
- ✅ Zero data corruption scenarios
- ✅ Graceful failure handling
- ✅ Complete error coverage

This comprehensive game logic validation test plan ensures that the Solitaire game mechanics work correctly, securely, and performantly across all components of the ecosystem.