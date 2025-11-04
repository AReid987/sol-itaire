# Sol-itaire Backend API

## Overview

This is the backend API service for the Sol-itaire gaming application. It provides RESTful endpoints for game data, token information, and Solana network integration.

## Features

- **Health Check**: Service monitoring
- **Game Statistics**: Game data and analytics
- **Token Information**: Gaming token and memecoin details
- **Network Information**: Solana network configuration
- **Faucet Integration**: Devnet SOL requests
- **CORS Support**: Frontend integration

## Quick Start

### Installation

```bash
npm install
```

### Environment Setup

```bash
cp .env.example .env
# Edit .env with your configuration
```

### Development

```bash
npm run dev
```

### Production

```bash
npm start
```

## API Endpoints

### Health Check
```
GET /health
```

### Game Statistics
```
GET /api/games/stats
```

### Token Information
```
GET /api/tokens
```

### Network Information
```
GET /api/network
```

### Faucet Request
```
POST /api/faucet/request
Content-Type: application/json

{
  "address": "wallet-address",
  "network": "devnet"
}
```

## Deployment

### Render (Recommended)

1. Connect your GitHub repository to Render
2. Create a new Web Service
3. Set the build command: `npm install`
4. Set the start command: `npm start`
5. Add environment variables from `.env.example`

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 3001 |
| NODE_ENV | Environment | production |
| SOLANA_NETWORK | Solana network | devnet |
| SOLANA_RPC_URL | Solana RPC endpoint | https://api.devnet.solana.com |
| GAMING_TOKEN_ADDRESS | Gaming token address | 2M4qUmbTiSRtRmfRcnZFWQyNXqkeQ4c9TzCdC7d6svPD |
| MEMECOIN_ADDRESS | Memecoin address | 6ygxtUVufLvihkSm4xv3Ny42ocRmwbMHaJ23kiovFKiH |
| FRONTEND_URL | Frontend URL for CORS | * |

## Architecture

```
├── src/
│   └── index.js         # Main server file
├── .env.example         # Environment variables template
├── package.json         # Dependencies and scripts
└── README.md           # This file
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License