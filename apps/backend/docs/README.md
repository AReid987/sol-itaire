# Sol-itaire Backend API Documentation

Welcome to the Sol-itaire backend API documentation. This API provides endpoints for user authentication, game management, leaderboards, transactions, and analytics for the Solana-based Solitaire game.

## Table of Contents

- [Base URL](#base-url)
- [Authentication](#authentication)
- [API Endpoints](#api-endpoints)
  - [Authentication](#authentication-endpoints)
  - [Users](#user-endpoints)
  - [Games](#game-endpoints)
  - [Leaderboard](#leaderboard-endpoints)
  - [Transactions](#transaction-endpoints)
  - [Statistics](#statistics-endpoints)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Webhooks](#webhooks)
- [SDKs and Libraries](#sdks-and-libraries)

## Base URL

```
Development: http://localhost:3001/api/v1
Production: https://sol-itaire-backend.onrender.com/api/v1
```

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. There are two main ways to authenticate:

### 1. Wallet-based Authentication

Users can authenticate using their Solana wallet by signing a message.

```javascript
// 1. Generate a random message
const message = "Sign in to Sol-itaire at " + new Date().toISOString();

// 2. Sign the message with the user's wallet
const signature = await signMessage(message, wallet);

// 3. Send to server for authentication
const response = await fetch('/api/v1/auth/wallet', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    wallet_address: wallet.publicKey.toBase58(),
    signature: signature,
    message: message,
    public_key: wallet.publicKey.toBase58()
  })
});

const { data } = await response.json();
// Store the access_token for future requests
localStorage.setItem('access_token', data.access_token);
```

### 2. Using Access Token

Include the JWT token in the Authorization header for authenticated requests:

```javascript
const headers = {
  'Authorization': `Bearer ${access_token}`,
  'Content-Type': 'application/json'
};
```

## API Endpoints

### Authentication Endpoints

#### Authenticate with Wallet

```http
POST /auth/wallet
```

**Request Body:**
```json
{
  "wallet_address": "string",
  "signature": "string",
  "message": "string",
  "public_key": "string"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "access_token": "string",
    "refresh_token": "string",
    "expires_in": 604800,
    "token_type": "Bearer",
    "user": {
      "id": "uuid",
      "wallet_address": "string",
      "username": "string",
      "email": "string|null",
      "avatar_url": "string|null",
      "created_at": "datetime",
      "last_login": "datetime",
      "is_active": true,
      "preferences": {}
    }
  },
  "timestamp": "datetime"
}
```

#### Set Username

```http
POST /auth/username
```

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "username": "string"
}
```

#### Refresh Token

```http
POST /auth/refresh
```

**Request Body:**
```json
{
  "refresh_token": "string"
}
```

#### Logout

```http
POST /auth/logout
```

**Headers:** `Authorization: Bearer <token>`

---

### User Endpoints

#### Get Current User Profile

```http
GET /users/me
```

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "wallet_address": "string",
    "username": "string",
    "email": "string|null",
    "avatar_url": "string|null",
    "created_at": "datetime",
    "updated_at": "datetime",
    "last_login": "datetime",
    "is_active": true,
    "preferences": {
      "theme": "light|dark|auto",
      "notifications": true,
      "sound_effects": true,
      "auto_stake": false,
      "default_stake_amount": 10
    }
  }
}
```

#### Update User Profile

```http
PUT /users/me
```

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "username": "string",
  "email": "string|null",
  "avatar_url": "string|null",
  "preferences": {
    "theme": "light|dark|auto",
    "notifications": true,
    "sound_effects": true,
    "auto_stake": false,
    "default_stake_amount": 10
  }
}
```

#### Get User by ID

```http
GET /users/{id}
```

**Response:** Public user information (username, avatar_url, created_at, last_login)

#### Get User Statistics

```http
GET /users/{id}/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total_games": 10,
    "total_wins": 7,
    "total_losses": 2,
    "win_rate": 77.78,
    "average_score": 850.5,
    "best_score": 1200,
    "average_time": 180,
    "best_time": 120,
    "total_staked": 250.0,
    "total_earned": 500.0,
    "net_profit": 250.0,
    "current_streak": 3,
    "best_streak": 5,
    "last_played": "datetime"
  }
}
```

#### Search Users

```http
GET /users?search={query}&page={page}&limit={limit}
```

**Query Parameters:**
- `search` (optional): Search query for usernames
- `page` (default: 1): Page number
- `limit` (default: 20): Results per page (max 100)

---

### Game Endpoints

#### Create New Game

```http
POST /games
```

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "stake_amount": 25.0,
  "wallet_address": "string",
  "signature": "string"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "wallet_address": "string",
    "stake_amount": 25.0,
    "status": "active",
    "moves_count": 0,
    "time_elapsed": 0,
    "started_at": "datetime",
    "game_data": {
      "deck": [],
      "tableau": [],
      "foundation": [],
      "stock": {},
      "waste": {},
      "moves": [],
      "current_time": 0
    },
    "transaction_signature": "string",
    "rewards_claimed": false
  }
}
```

#### Get Game by ID

```http
GET /games/{id}
```

**Headers:** `Authorization: Bearer <token>`

#### Update Game State

```http
PUT /games/{id}
```

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "game_data": {
    "moves": [...],
    "current_time": 150
  },
  "moves_count": 15,
  "time_elapsed": 150
}
```

#### Complete Game

```http
POST /games/{id}/complete
```

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "result": "win|lose",
  "score": 850,
  "final_signature": "string"
}
```

#### Get User Games

```http
GET /games?status={status}&result={result}&limit={limit}&offset={offset}
```

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `status` (optional): Filter by game status
- `result` (optional): Filter by game result
- `limit` (default: 20): Results per page
- `offset` (default: 0): Number of results to skip

---

### Leaderboard Endpoints

#### Get Global Leaderboard

```http
GET /leaderboard?period={period}&limit={limit}&offset={offset}&sort_by={sort_by}
```

**Query Parameters:**
- `period` (default: "all_time"): "daily" | "weekly" | "monthly" | "all_time"
- `limit` (default: 50): Results per page (max 100)
- `offset` (default: 0): Number of results to skip
- `sort_by` (default: "wins"): "wins" | "win_rate" | "earnings" | "games"

**Response:**
```json
{
  "success": true,
  "data": {
    "entries": [
      {
        "rank": 1,
        "user_id": "uuid",
        "username": "string",
        "wallet_address": "string",
        "total_wins": 50,
        "total_games": 60,
        "win_rate": 83.33,
        "total_earned": 2500.0,
        "avatar_url": "string",
        "last_active": "datetime"
      }
    ],
    "stats": {
      "total_players": 1000,
      "active_players_today": 150,
      "total_games_today": 500,
      "total_volume_today": 12500.0,
      "top_earners": [...],
      "most_wins": [...],
      "highest_win_rate": [...]
    }
  }
}
```

#### Get User's Leaderboard Position

```http
GET /leaderboard/user/{userId}?period={period}&sort_by={sort_by}
```

---

### Transaction Endpoints

#### Get User Transactions

```http
GET /transactions?type={type}&status={status}&token_type={token_type}&limit={limit}&offset={offset}
```

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `type` (optional): "stake" | "reward" | "deposit" | "withdrawal"
- `status` (optional): "pending" | "confirmed" | "failed"
- `token_type` (optional): "GAME" | "MEMECOIN"

#### Get Transaction by ID

```http
GET /transactions/{id}
```

**Headers:** `Authorization: Bearer <token>`

#### Get Public Transactions

```http
GET /transactions/public/{walletAddress}?limit={limit}
```

**Response:** Public transaction information (limited details)

#### Get Transaction Statistics

```http
GET /transactions/stats
```

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "total_staked": 1000.0,
    "total_earned": 2000.0,
    "net_profit": 1000.0,
    "transaction_count": 50,
    "pending_count": 2,
    "recent_transactions": [...]
  }
}
```

#### Verify Transaction

```http
POST /transactions/verify
```

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "transaction_signature": "string"
}
```

---

### Statistics Endpoints

#### Get Global Overview

```http
GET /stats/overview
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total_users": 5000,
    "active_users_today": 500,
    "total_games": 50000,
    "games_today": 1000,
    "total_volume": 100000.0,
    "volume_today": 5000.0,
    "total_wins": 30000,
    "win_rate_today": 65.5,
    "top_games_today": [...]
  }
}
```

#### Get Game Statistics

```http
GET /stats/games?period={period}&limit={limit}
```

**Query Parameters:**
- `period` (default: "day"): "hour" | "day" | "week" | "month" | "all_time"
- `limit` (default: 100): Number of data points

#### Get Transaction Statistics

```http
GET /stats/transactions?period={period}&limit={limit}
```

## Error Handling

The API uses standard HTTP status codes and returns consistent error responses:

```json
{
  "success": false,
  "error": "Error message",
  "timestamp": "datetime"
}
```

### Common Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `429` - Too Many Requests
- `500` - Internal Server Error

### Error Response Format

```json
{
  "success": false,
  "error": "Invalid wallet address",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **Default Limit**: 100 requests per 15 minutes per IP
- **Authenticated Users**: Higher limits based on user tier
- **Rate Limit Headers**:
  - `X-RateLimit-Limit`: Request limit per window
  - `X-RateLimit-Remaining`: Remaining requests in current window
  - `X-RateLimit-Reset`: Time when rate limit window resets

## Webhooks

The API supports webhooks for real-time notifications:

### Configure Webhooks

Webhooks can be configured in your user preferences or via the API:

```json
{
  "webhooks": [
    {
      "url": "https://your-app.com/webhooks",
      "events": ["game.completed", "transaction.confirmed"],
      "secret": "your-webhook-secret"
    }
  ]
}
```

### Webhook Events

- `game.completed`: Fired when a game is completed
- `transaction.confirmed`: Fired when a transaction is confirmed
- `user.level_up`: Fired when a user reaches a new level

### Webhook Signature

Webhook requests include a `X-Solitaire-Signature` header for verification:

```javascript
const crypto = require('crypto');
const signature = crypto
  .createHmac('sha256', webhookSecret)
  .update(JSON.stringify(requestBody))
  .digest('hex');
```

## SDKs and Libraries

### JavaScript/TypeScript

```bash
npm install @sol-itaire/api-client
```

```javascript
import { SolitaireAPI } from '@sol-itaire/api-client';

const api = new SolitaireAPI({
  baseURL: 'https://sol-itaire-backend.onrender.com/api/v1',
  authToken: 'your-jwt-token'
});

// Create a game
const game = await api.games.create({
  stakeAmount: 25,
  walletAddress: 'your-wallet-address',
  signature: 'transaction-signature'
});
```

### React

```bash
npm install @sol-itaire/react
```

```jsx
import { useSolitaireAPI, useAuth } from '@sol-itaire/react';

function GameComponent() {
  const { user } = useAuth();
  const { createGame, updateGame, completeGame } = useSolitaireAPI();

  const handleCreateGame = async () => {
    const game = await createGame({
      stakeAmount: 25,
      walletAddress: user.walletAddress,
      signature: await signStakeTransaction(25)
    });
  };

  return <button onClick={handleCreateGame}>New Game</button>;
}
```

## Support

For API support and questions:

- **Documentation**: https://docs.sol-itaire.com
- **GitHub Issues**: https://github.com/your-org/sol-itaire/issues
- **Discord**: https://discord.gg/sol-itaire
- **Email**: api-support@sol-itaire.com

## Changelog

### v1.0.0
- Initial API release
- User authentication with wallet support
- Game management endpoints
- Leaderboard system
- Transaction tracking
- Basic analytics

---

*Last updated: January 2024*