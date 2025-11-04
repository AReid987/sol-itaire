# Sol-itaire Complete Deployment Guide

This guide provides comprehensive instructions for deploying the complete Sol-itaire application including frontend (Vercel), backend (Render), database (Supabase), and smart contracts (Solana).

## 🏗️ Architecture Overview

Sol-itaire uses a modern web3 architecture with the following components:

- **Frontend**: Next.js application deployed to Vercel
- **Backend**: Node.js API deployed to Render (free tier)
- **Database**: Supabase PostgreSQL (free tier)
- **Smart Contracts**: Solana programs deployed to devnet/mainnet
- **Storage**: Decentralized storage on Solana blockchain

## 📋 Prerequisites

- **Node.js 18+** installed
- **pnpm** package manager installed
- **Solana CLI** installed
- **Anchor Framework** installed
- **GitHub repository** with the codebase
- **Vercel Account** (free tier)
- **Render Account** (free tier)
- **Supabase Account** (free tier)

## 🚀 Quick Deployment

### 1. Install Vercel CLI

```bash
npm install -g vercel
```

### 2. Login to Vercel

```bash
vercel login
```

### 3. Deploy to Preview

```bash
cd apps/web
vercel --preview
```

### 4. Deploy to Production

```bash
vercel --prod
```

## ⚙️ Environment Configuration

### Development Environment

Copy the environment template and configure for development:

```bash
cd apps/web
cp .env.local.example .env.local
```

Edit `.env.local` with your development settings:

```env
# Solana Network Configuration
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=Sol-itaire
NEXT_PUBLIC_APP_DESCRIPTION=A Solana-powered card game

# Web3 Configuration
NEXT_PUBLIC_WALLET_AUTO_CONNECT=true
NEXT_PUBLIC_WALLET_TIMEOUT=10000

# Development Settings
NEXT_PUBLIC_DEBUG_MODE=true
NEXT_PUBLIC_ENABLE_ANALYTICS=false
NEXT_PUBLIC_ENABLE_ERROR_REPORTING=false
```

### Production Environment

In the Vercel dashboard, configure these environment variables:

#### Required Variables

```env
# Solana Network Configuration
NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta
NEXT_PUBLIC_SOLANA_RPC_URL=https://your-production-rpc.com

# Application Configuration
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
NEXT_PUBLIC_APP_NAME=Sol-itaire
NEXT_PUBLIC_APP_DESCRIPTION=A Solana-powered card game

# Web3 Configuration
NEXT_PUBLIC_WALLET_AUTO_CONNECT=true
NEXT_PUBLIC_WALLET_TIMEOUT=10000

# Production Settings
NEXT_PUBLIC_DEBUG_MODE=false
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_ERROR_REPORTING=true

# Security
NEXT_PUBLIC_MAX_RETRIES=3
NEXT_PUBLIC_TRANSACTION_TIMEOUT=30000
```

#### Optional but Recommended

```env
# Analytics Services
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=your-ga-id
NEXT_PUBLIC_MIXPANEL_TOKEN=your-mixpanel-token

# Error Reporting
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn

# Contract Addresses (after deployment)
NEXT_PUBLIC_GAME_PROGRAM_ID=your-game-program-id
NEXT_PUBLIC_TOKEN_MINT=your-token-mint-address

# Social Links
NEXT_PUBLIC_TWITTER_HANDLE=solitaire_game
NEXT_PUBLIC_DISCORD_INVITE=https://discord.gg/solitaire
```

## 🔧 Vercel Configuration

The project includes a pre-configured `vercel.json` file with:

- **Monorepo Support**: Automatically detects the Next.js app in `apps/web/`
- **Security Headers**: X-Content-Type-Options, X-Frame-Options, CSP, etc.
- **Caching Configuration**: Optimized caching for static assets and API routes
- **Build Optimization**: Production-ready build settings

### Custom Domain Configuration

1. Go to your Vercel project dashboard
2. Navigate to "Domains" tab
3. Add your custom domain
4. Update `NEXT_PUBLIC_APP_URL` environment variable

## 🌐 Solana RPC Configuration

### Development (Devnet)

```env
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
```

### Production (Mainnet-beta)

For production, use a dedicated RPC provider for better performance and reliability:

#### Options:

1. **QuickNode**
   ```env
   NEXT_PUBLIC_SOLANA_RPC_URL=https://your-name.quicknode.co/your-token
   ```

2. **Alchemy**
   ```env
   NEXT_PUBLIC_SOLANA_RPC_URL=https://solana-mainnet.g.alchemy.com/v2/your-api-key
   ```

3. **Helius**
   ```env
   NEXT_PUBLIC_SOLANA_RPC_URL=https://rpc.helius.xyz/?api-key=your-api-key
   ```

4. **Triton**
   ```env
   NEXT_PUBLIC_SOLANA_RPC_URL=https://mainnet.triton.one
   ```

#### WebSocket RPC (Optional)

```env
NEXT_PUBLIC_SOLANA_WS_RPC_URL=wss://your-websocket-endpoint.com
```

## 📦 Build and Deployment Scripts

### Available Scripts

```bash
# Development
npm run dev

# Build for production
npm run build
npm run build:production

# Local production server
npm run start
npm run start:production

# Code quality
npm run lint
npm run lint:fix
npm run type-check

# Bundle analysis
npm run build:analyze
npm run build-stats

# Vercel deployment
npm run deploy:preview
npm run deploy:prod

# Maintenance
npm run clean
npm run check-deps
npm run security-audit
```

### Pre-commit and Build Hooks

The configuration includes automatic build hooks:

- `prebuild`: Shows build start message
- `postbuild`: Confirms successful build completion

## 🔒 Security Configuration

### Headers and CSP

The Vercel configuration includes security headers:

- **X-Content-Type-Options**: `nosniff`
- **X-Frame-Options**: `DENY`
- **X-XSS-Protection**: `1; mode=block`
- **Referrer-Policy**: `strict-origin-when-cross-origin`
- **Permissions-Policy**: Camera, microphone, geolocation disabled

### Web3 Security

- **Origin Validation**: Only allows connections from authorized origins
- **Transaction Limits**: Configurable transaction timeouts and retry limits
- **Error Handling**: Comprehensive error handling for wallet operations
- **Input Validation**: Address and amount validation utilities

## 📊 Performance Optimization

### Next.js Optimizations

- **Image Optimization**: WebP/AVIF formats, caching headers
- **Bundle Splitting**: Separate chunks for Solana libraries
- **Code Splitting**: Lazy loading for non-critical components
- **Tree Shaking**: Unused code elimination

### Web3 Optimizations

- **Connection Pooling**: Efficient RPC connection management
- **Transaction Caching**: Reduced redundant network calls
- **Fallback Handling**: Graceful degradation for network issues
- **Retry Logic**: Exponential backoff for failed requests

## 🔍 Monitoring and Analytics

### Error Reporting

Configure Sentry for production error tracking:

```env
NEXT_PUBLIC_ENABLE_ERROR_REPORTING=true
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
```

### Analytics

Set up Google Analytics or Mixpanel:

```env
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=your-ga-id
NEXT_PUBLIC_MIXPANEL_TOKEN=your-mixpanel-token
```

## 🐛 Troubleshooting

### Common Issues

#### 1. Build Failures

```bash
# Clean build
npm run clean
npm install
npm run build

# Check TypeScript errors
npm run type-check

# Lint code
npm run lint
```

#### 2. Wallet Connection Issues

- Check RPC endpoint configuration
- Verify network settings (devnet/mainnet)
- Check browser console for wallet adapter errors
- Ensure wallet extension is installed and unlocked

#### 3. Environment Variable Issues

- Verify all `NEXT_PUBLIC_` variables are set
- Check Vercel dashboard environment variables
- Ensure no sensitive data in client-side variables

#### 4. Performance Issues

- Run bundle analysis:
  ```bash
  npm run build:analyze
  ```
- Check Vercel Analytics for performance metrics
- Monitor RPC endpoint response times

### Debug Mode

Enable debug mode in development:

```env
NEXT_PUBLIC_DEBUG_MODE=true
```

This enables:
- Detailed console logging
- Performance metrics
- Error stack traces
- Web3 connection status

## 🚀 Production Deployment Checklist

### Pre-deployment

- [ ] Environment variables configured in Vercel dashboard
- [ ] Production RPC endpoint selected and tested
- [ ] Custom domain configured (if applicable)
- [ ] Analytics and error reporting services set up
- [ ] Contract addresses updated (if applicable)
- [ ] Security review completed
- [ ] Performance testing conducted

### Post-deployment

- [ ] Verify wallet connections work on mainnet
- [ ] Test transaction signing and confirmation
- [ ] Check analytics integration
- [ ] Monitor error reporting dashboard
- [ ] Test on multiple browsers and devices
- [ ] Verify SEO and social media metadata

## 📚 Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- [Solana Web3.js Documentation](https://solana-labs.github.io/solana-web3.js/)
- [Solana Wallet Adapter](https://github.com/solana-labs/wallet-adapter)

## 🆘 Support

If you encounter issues during deployment:

1. Check the Vercel deployment logs
2. Review browser console errors
3. Verify environment variable configuration
4. Test RPC endpoint connectivity
5. Consult the troubleshooting section above

For additional support, create an issue in the project repository or contact the development team.