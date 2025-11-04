# API Examples

This document provides practical examples of how to integrate with the Sol-itaire backend API.

## Setup

### JavaScript/Node.js

```javascript
const API_BASE_URL = 'https://sol-itaire-backend.onrender.com/api/v1';

class SolitaireAPI {
  constructor(baseURL = API_BASE_URL, authToken = null) {
    this.baseURL = baseURL;
    this.authToken = authToken;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.authToken) {
      headers.Authorization = `Bearer ${this.authToken}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'API request failed');
    }

    return data;
  }

  setAuthToken(token) {
    this.authToken = token;
  }
}
```

### React Example

```jsx
import React, { createContext, useContext, useState, useEffect } from 'react';

const APIContext = createContext();

export function APIProvider({ children }) {
  const [api, setApi] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const apiClient = new SolitaireAPI(process.env.REACT_APP_API_URL, token);
    setApi(apiClient);

    if (token) {
      loadUserProfile(apiClient);
    } else {
      setLoading(false);
    }
  }, []);

  const loadUserProfile = async (apiClient) => {
    try {
      const response = await apiClient.request('/users/me');
      setUser(response.data);
    } catch (error) {
      console.error('Failed to load user profile:', error);
      localStorage.removeItem('access_token');
      apiClient.setAuthToken(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (walletAddress, signature, message, publicKey) => {
    const response = await api.request('/auth/wallet', {
      method: 'POST',
      body: JSON.stringify({
        wallet_address: walletAddress,
        signature,
        message,
        public_key: publicKey,
      }),
    });

    const { access_token, refresh_token, user: userData } = response.data;
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);

    api.setAuthToken(access_token);
    setUser(userData);

    return response.data;
  };

  const logout = async () => {
    try {
      await api.request('/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      api.setAuthToken(null);
      setUser(null);
    }
  };

  return (
    <APIContext.Provider value={{ api, user, loading, login, logout }}>
      {children}
    </APIContext.Provider>
  );
}

export function useAPI() {
  const context = useContext(APIContext);
  if (!context) {
    throw new Error('useAPI must be used within APIProvider');
  }
  return context;
}
```

## Authentication Examples

### Wallet Authentication with Phantom

```javascript
import { Connection, clusterApiUrl, PublicKey } from '@solana/web3.js';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';

async function authenticateWithPhantom() {
  const wallet = new PhantomWalletAdapter();
  const connection = new Connection(clusterApiUrl('devnet'));

  try {
    // Connect wallet
    await wallet.connect();
    const publicKey = wallet.publicKey;

    // Generate message to sign
    const message = `Sign in to Sol-itaire at ${new Date().toISOString()}`;
    const encodedMessage = new TextEncoder().encode(message);

    // Sign message
    const signature = await wallet.signMessage(encodedMessage, 'utf8');

    // Send to backend
    const api = new SolitaireAPI();
    const response = await api.request('/auth/wallet', {
      method: 'POST',
      body: JSON.stringify({
        wallet_address: publicKey.toBase58(),
        signature: Array.from(signature),
        message,
        public_key: publicKey.toBase58(),
      }),
    });

    // Store tokens
    const { access_token, refresh_token, user } = response.data;
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);

    api.setAuthToken(access_token);

    return { user, accessToken: access_token };
  } catch (error) {
    console.error('Authentication failed:', error);
    throw error;
  }
}
```

### Token Refresh

```javascript
async function refreshToken() {
  const refreshToken = localStorage.getItem('refresh_token');

  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  const api = new SolitaireAPI();

  try {
    const response = await api.request('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    const { access_token } = response.data;
    localStorage.setItem('access_token', access_token);
    api.setAuthToken(access_token);

    return access_token;
  } catch (error) {
    // Refresh failed, user needs to login again
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    throw error;
  }
}
```

## Game Management Examples

### Create a New Game

```javascript
async function createNewGame(stakeAmount) {
  const api = new SolitaireAPI(localStorage.getItem('access_token'));

  try {
    // First, create and sign the stake transaction on Solana
    const { signature } = await createStakeTransaction(stakeAmount);

    // Create game record
    const response = await api.request('/games', {
      method: 'POST',
      body: JSON.stringify({
        stake_amount: stakeAmount,
        wallet_address: userWalletAddress,
        signature,
      }),
    });

    const game = response.data;
    initializeGameUI(game);

    return game;
  } catch (error) {
    console.error('Failed to create game:', error);
    throw error;
  }
}

// Helper function to create stake transaction
async function createStakeTransaction(amount) {
  // This would interact with your Solana smart contract
  // Implementation depends on your specific contract structure

  const connection = new Connection(clusterApiUrl('devnet'));
  const transaction = new Transaction();

  // Add instructions to stake tokens
  // ... add your contract instructions here

  // Sign and send transaction
  const signature = await connection.sendTransaction(transaction, [wallet]);
  await connection.confirmTransaction(signature);

  return { signature };
}
```

### Update Game State

```javascript
async function updateGameState(gameId, gameData) {
  const api = new SolitaireAPI(localStorage.getItem('access_token'));

  try {
    const response = await api.request(`/games/${gameId}`, {
      method: 'PUT',
      body: JSON.stringify({
        game_data: {
          deck: gameData.deck,
          tableau: gameData.tableau,
          foundation: gameData.foundation,
          stock: gameData.stock,
          waste: gameData.waste,
          moves: gameData.moves,
          current_time: gameData.currentTime,
        },
        moves_count: gameData.moves.length,
        time_elapsed: gameData.elapsedTime,
      }),
    });

    return response.data;
  } catch (error) {
    console.error('Failed to update game:', error);
    throw error;
  }
}
```

### Complete a Game

```javascript
async function completeGame(gameId, result, score) {
  const api = new SolitaireAPI(localStorage.getItem('access_token'));

  try {
    // If the user won, create reward transaction
    let finalSignature;
    if (result === 'win') {
      finalSignature = await createRewardTransaction(gameId);
    }

    const response = await api.request(`/games/${gameId}/complete`, {
      method: 'POST',
      body: JSON.stringify({
        result,
        score,
        final_signature: finalSignature,
      }),
    });

    // Update UI with completion status
    showGameCompletion(result, score);

    return response.data;
  } catch (error) {
    console.error('Failed to complete game:', error);
    throw error;
  }
}
```

## Leaderboard Examples

### Get Global Leaderboard

```javascript
async function getLeaderboard(period = 'all_time', limit = 50) {
  const api = new SolitaireAPI();

  try {
    const response = await api.request(
      `/leaderboard?period=${period}&limit=${limit}&sort_by=wins`
    );

    return response.data;
  } catch (error) {
    console.error('Failed to fetch leaderboard:', error);
    throw error;
  }
}

// Usage in React component
function LeaderboardComponent() {
  const [leaderboard, setLeaderboard] = useState(null);
  const [period, setPeriod] = useState('all_time');

  useEffect(() => {
    getLeaderboard(period).then(setLeaderboard);
  }, [period]);

  if (!leaderboard) return <div>Loading...</div>;

  return (
    <div>
      <div className="period-selector">
        {['daily', 'weekly', 'monthly', 'all_time'].map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={period === p ? 'active' : ''}
          >
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      <table className="leaderboard-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Player</th>
            <th>Wins</th>
            <th>Win Rate</th>
            <th>Earnings</th>
          </tr>
        </thead>
        <tbody>
          {leaderboard.entries.map(entry => (
            <tr key={entry.user_id}>
              <td>{entry.rank}</td>
              <td>
                <div className="player-info">
                  <img src={entry.avatar_url} alt={entry.username} />
                  <span>{entry.username}</span>
                </div>
              </td>
              <td>{entry.total_wins}</td>
              <td>{entry.win_rate.toFixed(1)}%</td>
              <td>{entry.total_earned.toFixed(2)} GAME</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

## Transaction Examples

### Get Transaction History

```javascript
async function getTransactionHistory(type = null, page = 1) {
  const api = new SolitaireAPI(localStorage.getItem('access_token'));

  try {
    const queryParams = new URLSearchParams({
      limit: 20,
      offset: (page - 1) * 20,
    });

    if (type) {
      queryParams.append('type', type);
    }

    const response = await api.request(`/transactions?${queryParams}`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch transactions:', error);
    throw error;
  }
}

// Usage example
async function displayTransactionHistory() {
  const { transactions, total } = await getTransactionHistory();

  console.log(`Showing ${transactions.length} of ${total} transactions:`);

  transactions.forEach(tx => {
    console.log(`${tx.type}: ${tx.amount} ${tx.token_type} - ${tx.status}`);
  });
}
```

### Verify Transaction

```javascript
async function verifyTransaction(transactionSignature) {
  const api = new SolitaireAPI(localStorage.getItem('access_token'));

  try {
    const response = await api.request('/transactions/verify', {
      method: 'POST',
      body: JSON.stringify({
        transaction_signature: transactionSignature,
      }),
    });

    const { verified, details } = response.data;

    if (verified) {
      console.log('Transaction verified:', details);
    } else {
      console.log('Transaction not yet confirmed');
    }

    return verified;
  } catch (error) {
    console.error('Failed to verify transaction:', error);
    throw error;
  }
}
```

## Statistics Examples

### Get User Statistics

```javascript
async function getUserStatistics(userId) {
  const api = new SolitaireAPI();

  try {
    const response = await api.request(`/users/${userId}/stats`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch user stats:', error);
    throw error;
  }
}

// Display user stats
async function displayUserStats(userId) {
  const stats = await getUserStatistics(userId);

  console.log('User Statistics:');
  console.log(`Total Games: ${stats.total_games}`);
  console.log(`Wins: ${stats.total_wins}`);
  console.log(`Win Rate: ${stats.win_rate.toFixed(1)}%`);
  console.log(`Best Score: ${stats.best_score}`);
  console.log(`Total Earned: ${stats.total_earned.toFixed(2)} GAME`);
  console.log(`Net Profit: ${stats.net_profit.toFixed(2)} GAME`);
}
```

### Get Global Statistics

```javascript
async function getGlobalStatistics() {
  const api = new SolitaireAPI();

  try {
    const response = await api.request('/stats/overview');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch global stats:', error);
    throw error;
  }
}

// Dashboard component
function StatsDashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    getGlobalStatistics().then(setStats);
  }, []);

  if (!stats) return <div>Loading stats...</div>;

  return (
    <div className="stats-dashboard">
      <div className="stat-card">
        <h3>Total Users</h3>
        <p>{stats.total_users.toLocaleString()}</p>
      </div>

      <div className="stat-card">
        <h3>Active Today</h3>
        <p>{stats.active_users_today.toLocaleString()}</p>
      </div>

      <div className="stat-card">
        <h3>Total Games</h3>
        <p>{stats.total_games.toLocaleString()}</p>
      </div>

      <div className="stat-card">
        <h3>Volume Today</h3>
        <p>{stats.volume_today.toFixed(2)} GAME</p>
      </div>

      <div className="stat-card">
        <h3>Win Rate Today</h3>
        <p>{stats.win_rate_today.toFixed(1)}%</p>
      </div>
    </div>
  );
}
```

## Error Handling Examples

### Global Error Handler

```javascript
class SolitaireAPI {
  // ... previous code ...

  async request(endpoint, options = {}) {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(this.authToken && { Authorization: `Bearer ${this.authToken}` }),
          ...options.headers,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 401 && this.authToken) {
          // Token expired, try to refresh
          try {
            await this.refreshToken();
            // Retry the original request
            return this.request(endpoint, options);
          } catch (refreshError) {
            // Refresh failed, user needs to login again
            this.handleAuthError();
            throw new Error('Authentication required');
          }
        }

        throw new APIError(data.error || 'API request failed', response.status, data);
      }

      return data;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }

      // Network or other errors
      throw new APIError('Network error occurred', 0, { originalError: error });
    }
  }

  async refreshToken() {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(`${this.baseURL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const { access_token } = data.data;
    localStorage.setItem('access_token', access_token);
    this.setAuthToken(access_token);
  }

  handleAuthError() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    this.setAuthToken(null);

    // Redirect to login or emit auth error event
    window.dispatchEvent(new CustomEvent('authError'));
  }
}

class APIError extends Error {
  constructor(message, statusCode, data = {}) {
    super(message);
    this.name = 'APIError';
    this.statusCode = statusCode;
    this.data = data;
  }
}
```

### React Error Boundary

```jsx
import React, { Component } from 'react';

class APIErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('API Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message || 'An unexpected error occurred'}</p>
          <button onClick={() => this.setState({ hasError: false, error: null })}>
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Usage
function App() {
  return (
    <APIErrorBoundary>
      <APIProvider>
        <YourAppComponents />
      </APIProvider>
    </APIErrorBoundary>
  );
}
```

These examples provide a comprehensive guide for integrating with the Sol-itaire backend API in various JavaScript environments.