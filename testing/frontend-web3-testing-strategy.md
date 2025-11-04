# Frontend and Web3 Testing Strategy

## Overview
This document outlines the comprehensive testing strategy for the frontend application and Web3 integration components of the Solana-based Solitaire game.

## Testing Framework Stack

### Frontend Testing
- **Unit Testing**: Jest + React Testing Library
- **Component Testing**: Storybook
- **E2E Testing**: Playwright
- **Visual Testing**: Percy/Applitools
- **Performance Testing**: Lighthouse CI
- **Accessibility Testing**: axe-core

### Web3 Testing
- **Wallet Testing**: Mock wallet adapters
- **Blockchain Testing**: Solana Program Test
- **Transaction Testing**: Solana web3.js test utilities
- **Connection Testing**: WebSocket mocking

## Testing Architecture

### 1. Unit Testing Strategy

#### React Component Tests
```typescript
// src/components/__tests__/GameBoard.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GameBoard } from '../GameBoard';
import { useWallet } from '@solana/wallet-adapter-react';
import { mockWallet } from '../../__mocks__/wallet.mock';

jest.mock('@solana/wallet-adapter-react');

describe('GameBoard Component', () => {
  beforeEach(() => {
    (useWallet as jest.Mock).mockReturnValue({
      wallet: mockWallet,
      publicKey: mockWallet.publicKey,
      connected: true,
      connecting: false,
    });
  });

  test('renders game board correctly', () => {
    render(<GameBoard gameState={mockGameState} />);

    expect(screen.getByTestId('tableau-pile-0')).toBeInTheDocument();
    expect(screen.getByTestId('foundation-0')).toBeInTheDocument();
    expect(screen.getByTestId('stock-pile')).toBeInTheDocument();
    expect(screen.getByTestId('waste-pile')).toBeInTheDocument();
  });

  test('handles card drag and drop', async () => {
    const onMove = jest.fn();
    render(
      <GameBoard
        gameState={mockGameState}
        onMove={onMove}
      />
    );

    const card = screen.getByTestId('card-ace-hearts');
    const foundation = screen.getByTestId('foundation-0');

    fireEvent.dragStart(card);
    fireEvent.dragOver(foundation);
    fireEvent.drop(foundation);

    await waitFor(() => {
      expect(onMove).toHaveBeenCalledWith({
        from: { pile: 'tableau', index: 0 },
        to: { pile: 'foundation', index: 0 },
        card: 'ace-hearts'
      });
    });
  });

  test('displays game score and moves', () => {
    render(<GameBoard gameState={mockGameState} />);

    expect(screen.getByText(`Score: ${mockGameState.score}`)).toBeInTheDocument();
    expect(screen.getByText(`Moves: ${mockGameState.moves}`)).toBeInTheDocument();
  });

  test('shows loading state during transaction', () => {
    render(
      <GameBoard
        gameState={mockGameState}
        isTransactionPending={true}
      />
    );

    expect(screen.getByTestId('transaction-loading')).toBeInTheDocument();
    expect(screen.getByText('Processing move...')).toBeInTheDocument();
  });
});
```

#### Web3 Hook Tests
```typescript
// src/hooks/__tests__/useGameContract.test.ts
import { renderHook, act } from '@testing-library/react-hooks';
import { useGameContract } from '../useGameContract';
import { Connection } from '@solana/web3.js';
import { mockConnection } from '../../__mocks__/connection.mock';

describe('useGameContract Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('initializes game contract correctly', () => {
    const { result } = renderHook(() =>
      useGameContract(mockConnection, mockWallet.publicKey)
    );

    expect(result.current.contract).toBeDefined();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  test('handles game initialization', async () => {
    const { result } = renderHook(() =>
      useGameContract(mockConnection, mockWallet.publicKey)
    );

    await act(async () => {
      await result.current.initializeGame(100); // Stake 100 tokens
    });

    expect(result.current.gameState).toBeDefined();
    expect(result.current.gameState.player).toBe(mockWallet.publicKey.toString());
    expect(result.current.gameState.tokenStaked).toBe(100);
  });

  test('handles move submission', async () => {
    const { result } = renderHook(() =>
      useGameContract(mockConnection, mockWallet.publicKey)
    );

    // Initialize game first
    await act(async () => {
      await result.current.initializeGame(100);
    });

    const moveDetails = {
      from: { pile: 'tableau', index: 0 },
      to: { pile: 'foundation', index: 0 },
      card: 'ace-hearts'
    };

    await act(async () => {
      await result.current.submitMove(moveDetails);
    });

    expect(result.current.gameState.moves).toBe(1);
  });

  test('handles transaction errors gracefully', async () => {
    const { result } = renderHook(() =>
      useGameContract(mockConnection, mockWallet.publicKey)
    );

    // Mock transaction failure
    mockConnection.sendTransaction.mockRejectedValue(
      new Error('Insufficient funds')
    );

    await act(async () => {
      await result.current.initializeGame(1000000); // Too much
    });

    expect(result.current.error).toContain('Insufficient funds');
    expect(result.current.isLoading).toBe(false);
  });
});
```

### 2. Integration Testing Strategy

#### Wallet Integration Tests
```typescript
// src/integration/__tests__/wallet-connection.test.ts
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WalletProvider } from '@solana/wallet-adapter-react';
import { GameApp } from '../../GameApp';
import { mockPhantomWallet } from '../../__mocks__/phantom-wallet.mock';

describe('Wallet Connection Integration', () => {
  test('connects to Phantom wallet successfully', async () => {
    render(
      <WalletProvider wallets={[mockPhantomWallet]}>
        <GameApp />
      </WalletProvider>
    );

    const connectButton = screen.getByText('Connect Wallet');
    fireEvent.click(connectButton);

    await waitFor(() => {
      expect(screen.getByText(mockPhantomWallet.publicKey.toString()))
        .toBeInTheDocument();
    });

    expect(screen.getByText('Start New Game')).toBeInTheDocument();
  });

  test('handles wallet disconnection', async () => {
    render(
      <WalletProvider wallets={[mockPhantomWallet]}>
        <GameApp />
      </WalletProvider>
    );

    // Connect first
    await act(async () => {
      await mockPhantomWallet.connect();
    });

    // Then disconnect
    const disconnectButton = screen.getByText('Disconnect');
    fireEvent.click(disconnectButton);

    await waitFor(() => {
      expect(screen.getByText('Connect Wallet')).toBeInTheDocument();
    });
  });

  test('handles wallet switching', async () => {
    const mockSolflare = createMockWallet('Solflare');

    render(
      <WalletProvider wallets={[mockPhantomWallet, mockSolflare]}>
        <GameApp />
      </WalletProvider>
    );

    // Connect to Phantom
    await act(async () => {
      await mockPhantomWallet.connect();
    });

    // Switch to Solflare
    const walletSelector = screen.getByTestId('wallet-selector');
    fireEvent.change(walletSelector, { target: { value: 'Solflare' } });

    await waitFor(() => {
      expect(screen.getByText(mockSolflare.publicKey.toString()))
        .toBeInTheDocument();
    });
  });
});
```

#### Transaction Integration Tests
```typescript
// src/integration/__tests__/transaction-flow.test.ts
describe('Transaction Flow Integration', () => {
  test('completes full game transaction flow', async () => {
    render(<GameApp />);

    // Connect wallet
    await connectWallet(mockPhantomWallet);

    // Start new game
    const startGameButton = screen.getByText('Start New Game');
    fireEvent.click(startGameButton);

    // Wait for game to initialize
    await waitFor(() => {
      expect(screen.getByTestId('game-board')).toBeInTheDocument();
    });

    // Make a move
    const card = screen.getByTestId('card-5-spades');
    const foundation = screen.getByTestId('foundation-2');

    fireEvent.dragStart(card);
    fireEvent.drop(foundation);

    // Wait for transaction confirmation
    await waitFor(() => {
      expect(screen.getByText('Move confirmed!')).toBeInTheDocument();
    }, { timeout: 10000 });

    // Verify score updated
    expect(screen.getByText(/Score: \d+/)).toBeInTheDocument();
  });

  test('handles transaction cancellation', async () => {
    // Mock user rejecting transaction
    mockPhantomWallet.signTransaction.mockRejectedValue(
      new Error('User rejected transaction')
    );

    render(<GameApp />);
    await connectWallet(mockPhantomWallet);

    // Start game
    fireEvent.click(screen.getByText('Start New Game'));

    // Transaction should be rejected
    await waitFor(() => {
      expect(screen.getByText('Transaction cancelled')).toBeInTheDocument();
    });

    // Game should not be initialized
    expect(screen.queryByTestId('game-board')).not.toBeInTheDocument();
  });

  test('handles network disconnection during transaction', async () => {
    render(<GameApp />);
    await connectWallet(mockPhantomWallet);

    // Start game
    fireEvent.click(screen.getByText('Start New Game'));

    // Simulate network disconnection
    mockConnection.on.mockImplementation(() => {
      throw new Error('Network disconnected');
    });

    // Make a move
    const card = screen.getByTestId('card-ace-hearts');
    const foundation = screen.getByTestId('foundation-0');

    fireEvent.dragStart(card);
    fireEvent.drop(foundation);

    await waitFor(() => {
      expect(screen.getByText('Network error. Retrying...')).toBeInTheDocument();
    });
  });
});
```

### 3. End-to-End Testing Strategy

#### Playwright E2E Tests
```typescript
// e2e/tests/gameplay.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Solitaire Gameplay E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    // Connect wallet
    await page.click('[data-testid="connect-wallet"]');
    await page.click('[data-testid="wallet-option-phantom"]');

    // Wait for connection
    await expect(page.locator('[data-testid="wallet-address"]')).toBeVisible();
  });

  test('plays complete game from start to finish', async ({ page }) => {
    // Start new game
    await page.click('[data-testid="start-new-game"]');

    // Wait for game to load
    await expect(page.locator('[data-testid="game-board"]')).toBeVisible();

    // Verify initial state
    await expect(page.locator('[data-testid="moves-count"]')).toContainText('0');
    await expect(page.locator('[data-testid="score"]')).toContainText('0');

    // Make moves to win the game
    await playWinningGame(page);

    // Verify win condition
    await expect(page.locator('[data-testid="win-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="reward-display"]')).toContainText('MEME');
  });

  test('handles invalid moves correctly', async ({ page }) => {
    await page.click('[data-testid="start-new-game"]');

    // Try to make invalid move (e.g., wrong color placement)
    const redCard = page.locator('[data-testid="card-7-hearts"]');
    const blackCard = page.locator('[data-testid="card-6-clubs"]');

    // This should be a valid move, let's test invalid instead
    const invalidDestination = page.locator('[data-testid="card-8-diamonds"]');

    await redCard.dragTo(invalidDestination);

    // Should show error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid move');
  });

  test('persists game state across page refreshes', async ({ page }) => {
    await page.click('[data-testid="start-new-game"]');

    // Make some moves
    await makeSomeMoves(page);

    // Refresh page
    await page.reload();

    // Game state should be restored
    await expect(page.locator('[data-testid="game-board"]')).toBeVisible();
    await expect(page.locator('[data-testid="moves-count"]')).not.toContainText('0');
  });

  test('handles wallet disconnection gracefully', async ({ page }) => {
    await page.click('[data-testid="start-new-game"]');

    // Make a move
    await makeAMove(page);

    // Disconnect wallet
    await page.click('[data-testid="disconnect-wallet"]');

    // Should show reconnection prompt
    await expect(page.locator('[data-testid="reconnect-prompt"]')).toBeVisible();

    // Reconnect
    await page.click('[data-testid="connect-wallet"]');
    await page.click('[data-testid="wallet-option-phantom"]');

    // Game should be restored
    await expect(page.locator('[data-testid="game-board"]')).toBeVisible();
  });
});

async function playWinningGame(page: Page) {
  // Implement logic to automatically play through a winning game
  // This would involve finding valid moves and executing them
  const moves = getWinningMoves();

  for (const move of moves) {
    const card = page.locator(`[data-testid="card-${move.card}"]`);
    const destination = page.locator(`[data-testid="${move.destination}"]`);

    await card.dragTo(destination);

    // Wait for transaction confirmation
    await page.waitForTimeout(1000);
  }
}
```

### 4. Performance Testing

#### Lighthouse CI Configuration
```yaml
# .lighthouserc.js
module.exports = {
  ci: {
    collect: {
      numberOfRuns: 3,
      startServerCommand: 'npm run start',
      url: ['http://localhost:3000'],
      startServerReadyPattern: 'Server started',
      startServerReadyTimeout: 30000,
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.8 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.8 }],
        'categories:seo': ['off'],
        'categories:pwa': ['off'],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
```

#### Performance Tests
```typescript
// src/performance/__tests__/rendering.test.ts
describe('Rendering Performance', () => {
  test('renders game board within performance budget', async () => {
    const startTime = performance.now();

    render(<GameBoard gameState={complexGameState} />);

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    expect(renderTime).toBeLessThan(100); // Should render in < 100ms
  });

  test('handles large number of animations smoothly', async () => {
    const { container } = render(<GameBoard gameState={complexGameState} />);

    // Trigger multiple card animations
    for (let i = 0; i < 10; i++) {
      fireEvent.click(container.querySelector(`[data-testid="card-${i}"]`));
    }

    // Check that animations complete within reasonable time
    const animations = container.querySelectorAll('.card-animation');

    animations.forEach(animation => {
      const duration = parseFloat(getComputedStyle(animation).animationDuration);
      expect(duration).toBeLessThan(0.5); // Each animation < 500ms
    });
  });
});
```

### 5. Accessibility Testing

#### A11y Tests
```typescript
// src/accessibility/__tests__/game-board.a11y.test.tsx
import { render, fireEvent } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { GameBoard } from '../../components/GameBoard';

expect.extend(toHaveNoViolations);

describe('GameBoard Accessibility', () => {
  test('should not have accessibility violations', async () => {
    const { container } = render(<GameBoard gameState={mockGameState} />);
    const results = await axe(container);

    expect(results).toHaveNoViolations();
  });

  test('supports keyboard navigation', () => {
    const { getByTestId } = render(<GameBoard gameState={mockGameState} />);

    const firstCard = getByTestId('card-ace-hearts');
    firstCard.focus();

    // Tab to next card
    fireEvent.keyDown(firstCard, { key: 'Tab' });

    const nextElement = document.activeElement;
    expect(nextElement).toHaveAttribute('data-testid', expect.stringMatching(/card-/));
  });

  test('provides screen reader announcements', () => {
    const { getByTestId } = render(<GameBoard gameState={mockGameState} />);

    // Make a move
    const card = getByTestId('card-5-spades');
    const foundation = getByTestId('foundation-2');

    fireEvent.dragStart(card);
    fireEvent.drop(foundation);

    // Check for screen reader announcement
    const announcement = getByTestId('sr-announcement');
    expect(announcement).toHaveTextContent('Moved 5 of Spades to foundation');
  });
});
```

### 6. Visual Testing

#### Storybook Visual Tests
```typescript
// src/components/__stories__/GameBoard.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { GameBoard } from './GameBoard';

const meta: Meta<typeof GameBoard> = {
  title: 'GameBoard',
  component: GameBoard,
  parameters: {
    layout: 'fullscreen',
    viewport: {
      defaultViewport: 'desktop',
    },
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const EmptyGame: Story = {
  args: {
    gameState: emptyGameState,
  },
};

export const GameInProgress: Story = {
  args: {
    gameState: gameInProgressState,
  },
};

export const GameWon: Story = {
  args: {
    gameState: gameWonState,
  },
};

export const MobileView: Story = {
  args: {
    gameState: gameInProgressState,
  },
  parameters: {
    viewport: {
      defaultViewport: 'iphone12',
    },
  },
};
```

### 7. Cross-Browser Testing

#### Browser Matrix Tests
```typescript
// e2e/tests/cross-browser.spec.ts
import { devices, test, expect } from '@playwright/test';

const browsers = [
  { ...devices['Desktop Chrome'], name: 'Chrome' },
  { ...devices['Desktop Firefox'], name: 'Firefox' },
  { ...devices['Desktop Safari'], name: 'Safari' },
  { ...devices['iPhone 12'], name: 'Mobile Safari' },
  { ...devices['Pixel 5'], name: 'Mobile Chrome' },
];

browsers.forEach(browser => {
  test.describe(`${browser.name} - Core Gameplay`, () => {
    test.use({ ...browser });

    test('completes basic game flow', async ({ page }) => {
      await page.goto('/');
      await completeBasicGameFlow(page);

      // Verify game completion
      await expect(page.locator('[data-testid="win-message"]')).toBeVisible();
    });

    test('handles wallet connection', async ({ page }) => {
      await page.goto('/');
      await connectWallet(page);

      await expect(page.locator('[data-testid="wallet-address"]')).toBeVisible();
    });

    test('responsive design works correctly', async ({ page }) => {
      await page.goto('/');
      await startGame(page);

      // Test responsive elements
      const gameBoard = page.locator('[data-testid="game-board"]');
      await expect(gameBoard).toBeVisible();

      // Test mobile gestures if on mobile
      if (browser.isMobile) {
        await testMobileGestures(page);
      }
    });
  });
});
```

## Test Environment Setup

### Mock Configuration
```typescript
// __mocks__/wallet.mock.ts
export const mockWallet = {
  publicKey: new PublicKey('11111111111111111111111111111111'),
  connected: true,
  connecting: false,
  disconnect: jest.fn(),
  connect: jest.fn(),
  signTransaction: jest.fn(),
  signAllTransactions: jest.fn(),
};

// __mocks__/connection.mock.ts
export const mockConnection = {
  sendTransaction: jest.fn(),
  getAccountInfo: jest.fn(),
  getBalance: jest.fn(),
  on: jest.fn(),
  removeAccountChangeListener: jest.fn(),
};
```

### Test Configuration
```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{ts,tsx}',
    '<rootDir>/src/**/*.{test,spec}.{ts,tsx}',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/__tests__/**',
    '!src/**/*.stories.tsx',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

## Continuous Integration

### GitHub Actions Workflow
```yaml
# .github/workflows/frontend-tests.yml
name: Frontend Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  unit-tests:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Run unit tests
      run: npm run test:unit

    - name: Upload coverage
      uses: codecov/codecov-action@v3

  e2e-tests:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Install Playwright
      run: npx playwright install --with-deps

    - name: Run E2E tests
      run: npm run test:e2e

    - name: Upload test results
      uses: actions/upload-artifact@v3
      if: always()
      with:
        name: playwright-report
        path: playwright-report/

  accessibility-tests:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Run accessibility tests
      run: npm run test:a11y

  visual-tests:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Build Storybook
      run: npm run build-storybook

    - name: Run visual tests
      run: npm run test:visual
```

## Success Metrics

### Quality Gates
- ✅ 95%+ unit test coverage
- ✅ 100% accessibility compliance (WCAG 2.1 AA)
- ✅ 80+ Lighthouse performance score
- ✅ All critical user journeys passing
- ✅ Zero visual regression failures
- ✅ Cross-browser compatibility verified

### Performance Targets
- ✅ Initial load < 3 seconds
- ✅ Move validation < 100ms
- ✅ Transaction confirmation < 10 seconds
- ✅ Animation frame rate > 30fps

This comprehensive frontend and Web3 testing strategy ensures that the user interface is robust, accessible, performant, and provides a seamless Web3 gaming experience across all platforms and devices.