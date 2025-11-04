# End-to-End Testing Scenarios

## Overview
This document provides comprehensive end-to-end testing scenarios that cover the complete user journey across the Solana Solitaire game ecosystem, from wallet connection to gameplay completion and reward distribution.

## Test Environment Configuration

### Test Network Setup
```yaml
# e2e.config.ts
export const testConfig = {
  networks: {
    local: {
      endpoint: 'http://localhost:8899',
      cluster: 'localnet',
      commitment: 'confirmed'
    },
    devnet: {
      endpoint: 'https://api.devnet.solana.com',
      cluster: 'devnet',
      commitment: 'confirmed'
    },
    testnet: {
      endpoint: 'https://api.testnet.solana.com',
      cluster: 'testnet',
      commitment: 'confirmed'
    }
  },
  wallets: {
    phantom: {
      name: 'Phantom',
      adapter: 'phantom'
    },
    solflare: {
      name: 'Solflare',
      adapter: 'solflare'
    },
    backpack: {
      name: 'Backpack',
      adapter: 'backpack'
    }
  }
};
```

### Test Data Setup
```typescript
// e2e/fixtures/testData.ts
export const testUsers = {
  player1: {
    wallet: 'player1-test-wallet',
    initialSolBalance: 5, // SOL
    initialTokenBalance: 1000, // SOL-T
    initialMemeBalance: 500 // MEME
  },
  player2: {
    wallet: 'player2-test-wallet',
    initialSolBalance: 3,
    initialTokenBalance: 500,
    initialMemeBalance: 200
  }
};

export const gameScenarios = {
  quickWin: {
    name: 'Quick Win Scenario',
    expectedMoves: 15,
    expectedScore: 500,
    expectedReward: 100 // MEME tokens
  },
  longGame: {
    name: 'Long Game Scenario',
    expectedMoves: 150,
    expectedScore: 2000,
    expectedReward: 300
  },
  losingGame: {
    name: 'Losing Game Scenario',
    expectedMoves: 100,
    expectedScore: 0,
    expectedReward: 0
  }
};
```

## Core User Journey Tests

### 1. Complete Game Flow Tests

#### Test Suite: New User Journey
```typescript
// e2e/tests/new-user-journey.spec.ts
import { test, expect } from '@playwright/test';

test.describe('New User Complete Journey', () => {
  test('new user creates wallet and completes first game', async ({ page }) => {
    // Step 1: Landing Page
    await page.goto('/');
    await expect(page.locator('[data-testid="hero-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="play-button"]')).toBeVisible();

    // Step 2: Wallet Connection
    await page.click('[data-testid="play-button"]');
    await expect(page.locator('[data-testid="wallet-modal"]')).toBeVisible();

    // Select Phantom wallet
    await page.click('[data-testid="wallet-phantom"]');

    // Simulate wallet approval (in real test, this would handle actual wallet)
    await page.evaluate(() => {
      window.walletApprove = true;
    });

    // Step 3: Initial Token Setup
    await expect(page.locator('[data-testid="token-setup"]')).toBeVisible();
    await expect(page.locator('[data-testid="welcome-bonus"]')).toContainText('100 SOL-T');

    await page.click('[data-testid="claim-bonus"]');
    await expect(page.locator('[data-testid="tokens-claimed"]')).toBeVisible();

    // Step 4: First Game Setup
    await page.click('[data-testid="start-new-game"]');

    // Verify game initialization
    await expect(page.locator('[data-testid="stake-input"]')).toBeVisible();
    await page.fill('[data-testid="stake-input"]', '10');
    await page.click('[data-testid="confirm-stake"]');

    // Step 5: Gameplay
    await expect(page.locator('[data-testid="game-board"]')).toBeVisible();
    await expect(page.locator('[data-testid="tableau-pile-0"]')).toBeVisible();
    await expect(page.locator('[data-testid="foundation-0"]')).toBeVisible();

    // Step 6: Make moves to win
    await completeWinningGame(page);

    // Step 7: Game Completion
    await expect(page.locator('[data-testid="win-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="reward-amount"]')).toContainText('MEME');

    // Claim rewards
    await page.click('[data-testid="claim-rewards"]');
    await expect(page.locator('[data-testid="rewards-claimed"]')).toBeVisible();

    // Step 8: Post-Game Flow
    await expect(page.locator('[data-testid="game-stats"]')).toBeVisible();
    await expect(page.locator('[data-testid="leaderboard"]')).toBeVisible();
  });

  test('handles wallet connection errors gracefully', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="play-button"]');

    // Simulate wallet rejection
    await page.evaluate(() => {
      window.walletReject = true;
    });

    await page.click('[data-testid="wallet-phantom"]');

    await expect(page.locator('[data-testid="connection-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="retry-connection"]')).toBeVisible();

    // Should allow retry
    await page.click('[data-testid="retry-connection"]');
    await expect(page.locator('[data-testid="wallet-modal"]')).toBeVisible();
  });
});
```

#### Test Suite: Returning User Journey
```typescript
// e2e/tests/returning-user-journey.spec.ts
test.describe('Returning User Journey', () => {
  test('returning user can resume interrupted game', async ({ page }) => {
    // Setup: Simulate existing user with active game
    await mockExistingUser(page, testUsers.player1);
    await setupActiveGame(page);

    // Navigate to app
    await page.goto('/');

    // Should detect existing session
    await expect(page.locator('[data-testid="welcome-back"]')).toBeVisible();
    await expect(page.locator('[data-testid="resume-game"]')).toBeVisible();

    // Resume game
    await page.click('[data-testid="resume-game"]');

    // Verify game state is restored
    await expect(page.locator('[data-testid="game-board"]')).toBeVisible();
    await expect(page.locator('[data-testid="moves-count"]')).not.toContainText('0');
    await expect(page.locator('[data-testid="score"]')).not.toContainText('0');

    // Continue playing
    await makeSomeMoves(page);

    // Complete game
    await completeGame(page);

    // Verify completion flow
    await expect(page.locator('[data-testid="win-modal"]')).toBeVisible();
  });

  test('user can start new game while having active game', async ({ page }) => {
    await mockExistingUser(page, testUsers.player1);
    await setupActiveGame(page);

    await page.goto('/');
    await page.click('[data-testid="start-new-game"]');

    // Should show warning about abandoning current game
    await expect(page.locator('[data-testid="abandon-warning"]')).toBeVisible();

    // Confirm abandoning
    await page.click('[data-testid="confirm-abandon"]');

    // Should start new game setup
    await expect(page.locator('[data-testid="stake-input"]')).toBeVisible();
  });
});
```

### 2. Multi-User Concurrent Gameplay Tests

#### Test Suite: Concurrent Players
```typescript
// e2e/tests/concurrent-gameplay.spec.ts
test.describe('Concurrent Multi-Player Scenarios', () => {
  test('multiple players can play simultaneously', async ({ browser }) => {
    // Create two browser contexts for two players
    const player1Context = await browser.newContext();
    const player2Context = await browser.newContext();

    const player1Page = await player1Context.newPage();
    const player2Page = await player2Context.newPage();

    // Setup both players
    await setupPlayer(player1Page, testUsers.player1);
    await setupPlayer(player2Page, testUsers.player2);

    // Both start games simultaneously
    await Promise.all([
      player1Page.click('[data-testid="start-new-game"]'),
      player2Page.click('[data-testid="start-new-game"]')
    ]);

    // Confirm stakes
    await Promise.all([
      player1Page.fill('[data-testid="stake-input"]', '50'),
      player1Page.click('[data-testid="confirm-stake"]'),
      player2Page.fill('[data-testid="stake-input"]', '50'),
      player2Page.click('[data-testid="confirm-stake"]')
    ]);

    // Both should be able to play independently
    await expect(player1Page.locator('[data-testid="game-board"]')).toBeVisible();
    await expect(player2Page.locator('[data-testid="game-board"]')).toBeVisible();

    // Make moves concurrently
    await Promise.all([
      makeRandomMove(player1Page),
      makeRandomMove(player2Page)
    ]);

    // Verify both games are progressing independently
    const player1Moves = await player1Page.locator('[data-testid="moves-count"]').textContent();
    const player2Moves = await player2Page.locator('[data-testid="moves-count"]').textContent();

    expect(player1Moves).toBe('1');
    expect(player2Moves).toBe('1');

    await player1Context.close();
    await player2Context.close();
  });

  test('leaderboard updates correctly with multiple players', async ({ browser }) => {
    const players = [];
    const contexts = [];

    // Create 5 players
    for (let i = 0; i < 5; i++) {
      const context = await browser.newContext();
      const page = await context.newPage();

      await setupPlayer(page, {
        wallet: `player-${i}-wallet`,
        initialSolBalance: 2,
        initialTokenBalance: 200,
        initialMemeBalance: 100
      });

      players.push(page);
      contexts.push(context);
    }

    // All players complete games with different scores
    const promises = players.map(async (page, index) => {
      await page.click('[data-testid="start-new-game"]');
      await page.fill('[data-testid="stake-input"]', '10');
      await page.click('[data-testid="confirm-stake"]');

      // Complete game with varying performance
      await completeGameWithScore(page, 1000 + (index * 200));

      return {
        player: index,
        score: 1000 + (index * 200)
      };
    });

    const results = await Promise.all(promises);

    // Check leaderboard shows correct rankings
    const topPlayerPage = players[0]; // Should be winner
    await topPlayerPage.goto('/leaderboard');

    await expect(topPlayerPage.locator('[data-testid="leaderboard-entry-0"]')).toContainText('player-4-wallet');
    await expect(topPlayerPage.locator('[data-testid="leaderboard-entry-0"]')).toContainText('1800');

    // Cleanup
    contexts.forEach(context => context.close());
  });
});
```

### 3. Network and Failure Scenario Tests

#### Test Suite: Network Reliability
```typescript
// e2e/tests/network-scenarios.spec.ts
test.describe('Network Reliability Tests', () => {
  test('handles intermittent connection loss', async ({ page }) => {
    await setupPlayer(page, testUsers.player1);
    await startGame(page);

    // Simulate network failure during move
    await page.route('**/api/**', route => route.abort());

    // Try to make a move
    const card = page.locator('[data-testid="card-5-hearts"]');
    const foundation = page.locator('[data-testid="foundation-0"]');

    await card.dragTo(foundation);

    // Should show offline state
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="retry-indicator"]')).toBeVisible();

    // Restore network
    await page.unroute('**/api/**');

    // Should automatically retry and complete the move
    await expect(page.locator('[data-testid="move-success"]')).toBeVisible({ timeout: 10000 });
  });

  test('handles Solana network congestion', async ({ page }) => {
    await setupPlayer(page, testUsers.player1);
    await startGame(page);

    // Simulate slow network response
    await page.route('**/api/**', route => {
      setTimeout(() => route.fulfill(), 5000); // 5 second delay
    });

    const startTime = Date.now();

    // Make move
    await makeAMove(page);

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    // Should show loading state during slow response
    await expect(page.locator('[data-testid="transaction-loading"]')).toBeVisible();

    // Should eventually complete
    await expect(page.locator('[data-testid="move-success"]')).toBeVisible();

    // Verify reasonable timeout handling
    expect(responseTime).toBeGreaterThan(4000);
    expect(responseTime).toBeLessThan(15000);
  });

  test('handles transaction failure with proper recovery', async ({ page }) => {
    await setupPlayer(page, testUsers.player1);
    await startGame(page);

    // Simulate transaction failure
    await page.route('**/api/transaction', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Transaction failed' })
      });
    });

    await makeAMove(page);

    // Should show error message
    await expect(page.locator('[data-testid="transaction-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Transaction failed');

    // Should offer retry option
    await expect(page.locator('[data-testid="retry-transaction"]')).toBeVisible();

    // Fix network and retry
    await page.unroute('**/api/transaction');
    await page.click('[data-testid="retry-transaction"]');

    // Should succeed on retry
    await expect(page.locator('[data-testid="move-success"]')).toBeVisible();
  });
});
```

### 4. Cross-Platform Compatibility Tests

#### Test Suite: Device Compatibility
```typescript
// e2e/tests/cross-platform.spec.ts
import { devices, test, expect } from '@playwright/test';

const deviceConfigs = [
  { ...devices['Desktop Chrome'], name: 'Desktop Chrome' },
  { ...devices['Desktop Firefox'], name: 'Desktop Firefox' },
  { ...devices['Desktop Safari'], name: 'Desktop Safari' },
  { ...devices['iPhone 12'], name: 'iPhone 12' },
  { ...devices['iPhone 12 Pro Max'], name: 'iPhone 12 Pro Max' },
  { ...devices['Pixel 5'], name: 'Pixel 5' },
  { ...devices['iPad Pro'], name: 'iPad Pro' }
];

deviceConfigs.forEach(config => {
  test.describe(`${config.name} - Full User Journey`, () => {
    test.use({ ...config });

    test('completes game flow on ' + config.name, async ({ page }) => {
      await page.goto('/');

      // Adjust for mobile if needed
      if (config.isMobile) {
        await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
      }

      // Complete full user journey
      await completeFullUserJourney(page);

      // Verify successful completion
      await expect(page.locator('[data-testid="win-modal"]')).toBeVisible();
    });

    test('handles responsive design correctly on ' + config.name, async ({ page }) => {
      await page.goto('/');
      await setupPlayer(page, testUsers.player1);
      await startGame(page);

      // Test responsive elements
      const gameBoard = page.locator('[data-testid="game-board"]');
      await expect(gameBoard).toBeVisible();

      if (config.isMobile) {
        // Test mobile-specific interactions
        await testMobileGestures(page);

        // Verify mobile UI elements
        await expect(page.locator('[data-testid="mobile-controls"]')).toBeVisible();
        await expect(page.locator('[data-testid="card-touch-target"]')).toBeVisible();
      } else {
        // Test desktop interactions
        await testDesktopInteractions(page);

        // Verify desktop UI elements
        await expect(page.locator('[data-testid="keyboard-shortcuts"]')).toBeVisible();
      }
    });
  });
});

async function testMobileGestures(page: Page) {
  // Test swipe gestures for card movement
  const card = page.locator('[data-testid="card-5-hearts"]');
  const foundation = page.locator('[data-testid="foundation-0"]');

  // Swipe from card to foundation
  await card.touchstart();
  await page.touchmove(100, 100);
  await foundation.touchend();

  await expect(page.locator('[data-testid="move-success"]')).toBeVisible();
}

async function testDesktopInteractions(page: Page) {
  // Test keyboard shortcuts
  await page.keyboard.press('z'); // Undo
  await page.keyboard.press('y'); // Redo
  await page.keyboard.press('h'); // Hint

  await expect(page.locator('[data-testid="hint-display"]')).toBeVisible();
}
```

### 5. Performance and Load Tests

#### Test Suite: Performance Under Load
```typescript
// e2e/tests/performance-load.spec.ts
test.describe('Performance Under Load', () => {
  test('handles 100 concurrent users', async ({ browser }) => {
    const users = [];
    const contexts = [];

    // Create 100 concurrent users
    for (let i = 0; i < 100; i++) {
      const context = await browser.newContext();
      const page = await context.newPage();

      users.push(page);
      contexts.push(context);
    }

    const startTime = Date.now();

    // All users start games simultaneously
    const promises = users.map(async (page, index) => {
      await setupPlayer(page, {
        wallet: `load-test-user-${index}`,
        initialSolBalance: 1,
        initialTokenBalance: 100,
        initialMemeBalance: 50
      });

      await page.click('[data-testid="start-new-game"]');
      await page.fill('[data-testid="stake-input"]', '5');
      await page.click('[data-testid="confirm-stake"]');

      // Make a few moves
      await makeRandomMove(page);
      await makeRandomMove(page);
      await makeRandomMove(page);

      return { user: index, success: true };
    });

    const results = await Promise.all(promises);
    const endTime = Date.now();
    const totalTime = endTime - startTime;

    // Verify all users succeeded
    expect(results.filter(r => r.success)).toHaveLength(100);

    // Performance should be reasonable (< 30 seconds for all)
    expect(totalTime).toBeLessThan(30000);

    // Cleanup
    contexts.forEach(context => context.close());
  });

  test('maintains performance with complex game states', async ({ page }) => {
    await setupPlayer(page, testUsers.player1);

    // Create a complex game state with many cards in play
    await startComplexGame(page);

    // Measure performance during moves
    const moveTimes = [];

    for (let i = 0; i < 20; i++) {
      const startTime = performance.now();
      await makeRandomMove(page);
      const endTime = performance.now();

      moveTimes.push(endTime - startTime);
    }

    // Calculate average move time
    const avgMoveTime = moveTimes.reduce((a, b) => a + b) / moveTimes.length;

    // Average move time should be under 2 seconds
    expect(avgMoveTime).toBeLessThan(2000);

    // No individual move should take more than 5 seconds
    expect(Math.max(...moveTimes)).toBeLessThan(5000);
  });
});
```

### 6. Security and Validation Tests

#### Test Suite: Security Validation
```typescript
// e2e/tests/security-validation.spec.ts
test.describe('Security Validation Tests', () => {
  test('prevents unauthorized game access', async ({ page }) => {
    // Try to access game without wallet connection
    await page.goto('/game/invalid-game-id');

    // Should redirect to home/wallet connection
    await expect(page).toHaveURL('/');
    await expect(page.locator('[data-testid="connect-wallet"]')).toBeVisible();
  });

  test('validates all blockchain transactions', async ({ page }) => {
    await setupPlayer(page, testUsers.player1);
    await startGame(page);

    // Monitor network requests
    const transactions = [];

    page.on('request', request => {
      if (request.url().includes('/api/transaction')) {
        transactions.push({
          url: request.url(),
          method: request.method(),
          postData: request.postData()
        });
      }
    });

    // Make various moves and operations
    await makeAMove(page);
    await page.click('[data-testid="undo-move"]');
    await makeAMove(page);

    // Verify all transactions are properly signed and valid
    expect(transactions.length).toBeGreaterThan(0);

    transactions.forEach(tx => {
      expect(tx.postData).toContain('signature');
      expect(tx.postData).toContain('publicKey');
    });
  });

  test('handles malicious input attempts', async ({ page }) => {
    await setupPlayer(page, testUsers.player1);
    await startGame(page);

    // Try to inject malicious code through move data
    await page.evaluate(() => {
      const maliciousMove = {
        from: '<script>alert("xss")</script>',
        to: 'foundation-0',
        card: '../../../etc/passwd'
      };

      // Try to submit malicious move
      window.submitMove(maliciousMove);
    });

    // Should reject malicious input
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid move data');

    // Game state should remain unchanged
    await expect(page.locator('[data-testid="moves-count"]')).toContainText('0');
  });
});
```

## Test Execution Framework

### Test Runner Configuration
```typescript
// e2e/runner/testRunner.ts
import { chromium, FullConfig } from '@playwright/test';

class E2ETestRunner {
  private config: FullConfig;

  constructor(config: FullConfig) {
    this.config = config;
  }

  async runAllTests() {
    console.log('🚀 Starting E2E Test Suite...');

    const testSuites = [
      'new-user-journey.spec.ts',
      'returning-user-journey.spec.ts',
      'concurrent-gameplay.spec.ts',
      'network-scenarios.spec.ts',
      'cross-platform.spec.ts',
      'performance-load.spec.ts',
      'security-validation.spec.ts'
    ];

    const results = [];

    for (const suite of testSuites) {
      console.log(`📋 Running ${suite}...`);

      try {
        const result = await this.runTestSuite(suite);
        results.push({ suite, status: 'passed', result });
        console.log(`✅ ${suite} passed`);
      } catch (error) {
        results.push({ suite, status: 'failed', error });
        console.log(`❌ ${suite} failed:`, error);
      }
    }

    this.generateReport(results);
    return results;
  }

  private async runTestSuite(suiteName: string) {
    // Implementation for running individual test suite
    // Returns test results
  }

  private generateReport(results: any[]) {
    const passed = results.filter(r => r.status === 'passed').length;
    const failed = results.filter(r => r.status === 'failed').length;

    console.log(`
📊 E2E Test Results Summary:
✅ Passed: ${passed}
❌ Failed: ${failed}
📈 Success Rate: ${((passed / results.length) * 100).toFixed(1)}%
    `);

    // Generate HTML report
    this.generateHtmlReport(results);
  }

  private generateHtmlReport(results: any[]) {
    // Generate detailed HTML report with screenshots and logs
  }
}
```

## Test Execution Plan

### Phase 1: Core Functionality (Days 1-3)
- New user journey tests
- Basic gameplay validation
- Wallet connection flows

### Phase 2: Advanced Scenarios (Days 4-5)
- Multi-user concurrent gameplay
- Network failure scenarios
- Performance under load

### Phase 3: Cross-Platform Testing (Days 6-7)
- Device compatibility tests
- Browser compatibility matrix
- Responsive design validation

### Phase 4: Security & Reliability (Days 8-10)
- Security validation tests
- Error handling scenarios
- Data integrity checks

## Success Criteria

### Functional Requirements
- ✅ Complete user journey works end-to-end
- ✅ All wallet types supported
- ✅ Game state persists across sessions
- ✅ Multi-user concurrent gameplay functional
- ✅ Cross-platform compatibility verified

### Performance Requirements
- ✅ 100 concurrent users supported
- ✅ Game initialization < 5 seconds
- ✅ Move execution < 2 seconds
- ✅ Transaction confirmation < 10 seconds

### Reliability Requirements
- ✅ 99% test pass rate
- ✅ Graceful handling of network failures
- ✅ No data corruption scenarios
- ✅ Complete error recovery testing

This comprehensive end-to-end testing strategy ensures that the entire Solana Solitaire game ecosystem works flawlessly across all scenarios, platforms, and user conditions.