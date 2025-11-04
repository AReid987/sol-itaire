# Sol-itaire Backend Deployment Guide

This guide will walk you through deploying the Sol-itaire backend to production using free hosting services.

## 🏗️ Architecture Overview

Our backend uses a hybrid hosting approach:

- **Render**: Node.js API server (free tier)
- **Supabase**: PostgreSQL database with real-time features (free tier)
- **GitHub Actions**: CI/CD pipeline for automated deployments

## 📋 Prerequisites

- Node.js 18+ and pnpm installed locally
- GitHub account with repository access
- Render account (free tier)
- Supabase account (free tier)
- Solana wallet for testing

## 🚀 Quick Start

### 1. Clone and Setup Repository

```bash
git clone https://github.com/your-org/sol-itaire.git
cd sol-itaire
pnpm install
```

### 2. Set Up Supabase Database

1. **Create Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Click "New Project"
   - Choose organization and project name
   - Set a strong database password
   - Select a region close to your users

2. **Get Database Credentials**
   - Go to Project Settings → Database
   - Copy the connection string
   - Note down the project URL and anon key

3. **Run Database Migrations**
   ```bash
   # Install Supabase CLI
   curl -L https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz | tar xz
   sudo mv supabase/linux/amd64/supabase /usr/local/bin/

   # Login to Supabase
   supabase login

   # Link to your project
   cd apps/backend
   supabase link --project-ref your-project-ref

   # Run migrations
   supabase db push

   # Seed data (optional, for development)
   supabase db seed
   ```

### 3. Set Up Render Backend

1. **Create Render Service**
   - Go to [render.com](https://render.com)
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Configure service settings:
     - **Name**: `sol-itaire-backend`
     - **Environment**: `Node`
     - **Build Command**: `pnpm install && pnpm --filter @sol-itaire/backend build`
     - **Start Command**: `pnpm --filter @sol-itaire/backend start`
     - **Root Directory**: `apps/backend`

2. **Set Environment Variables**
   ```env
   NODE_ENV=production
   PORT=10000
   SUPABASE_URL=your-supabase-project-url
   SUPABASE_ANON_KEY=your-supabase-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
   JWT_SECRET=your-random-jwt-secret
   JWT_EXPIRES_IN=7d
   SOLANA_NETWORK=devnet
   SOLANA_RPC_URL=https://api.devnet.solana.com
   GAME_PROGRAM_ID=Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS
   GAMING_TOKEN_MINT=TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA
   MEMECOIN_MINT=TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA
   ```

3. **Deploy the Service**
   - Click "Create Web Service"
   - Wait for the build to complete
   - Note down your service URL

### 4. Configure GitHub Actions

1. **Set Repository Secrets**
   - Go to your GitHub repository → Settings → Secrets and variables → Actions
   - Add the following secrets:
     ```
     RENDER_API_KEY=your-render-api-key
     RENDER_BACKEND_SERVICE_ID=your-backend-service-id
     SUPABASE_ACCESS_TOKEN=your-supabase-access-token
     SUPABASE_DB_URL=your-database-connection-string
     SLACK_WEBHOOK_URL=your-slack-webhook-url (optional)
     ```

2. **Verify CI/CD Pipeline**
   - The `.github/workflows/deploy.yml` file is already configured
   - Push changes to main branch to trigger deployment
   - Monitor the Actions tab for deployment status

## 🔧 Configuration

### Environment Variables

Create a `.env` file in `apps/backend/`:

```env
# Server Configuration
NODE_ENV=production
PORT=3001
API_VERSION=v1

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRES_IN=7d

# Solana Configuration
SOLANA_NETWORK=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com

# Program IDs (update with your deployed contracts)
GAME_PROGRAM_ID=your-game-program-id
GAMING_TOKEN_MINT=your-gaming-token-mint
MEMECOIN_MINT=your-memecoin-mint

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS Configuration
CORS_ORIGIN=https://your-frontend-domain.com

# Logging
LOG_LEVEL=info
LOG_FORMAT=combined

# Health Checks
HEALTH_CHECK_INTERVAL=30000
```

### Smart Contract Integration

Update the program IDs in your environment variables with your deployed Solana contracts:

```bash
# Get your program IDs after deployment
anchor deploy --provider.cluster devnet

# Update the environment variables
GAME_PROGRAM_ID=your-deployed-game-program-id
GAMING_TOKEN_MINT=your-gaming-token-mint
MEMECOIN_MINT=your-memecoin-mint
```

## 🧪 Testing

### Local Development

```bash
# Start the backend server
pnpm --filter @sol-itaire/backend dev

# Run tests
pnpm --filter @sol-itaire/backend test

# Run integration tests
pnpm test:e2e
```

### Testing API Endpoints

```bash
# Health check
curl https://your-app.onrender.com/health

# Test authentication
curl -X POST https://your-app.onrender.com/api/v1/auth/wallet \
  -H "Content-Type: application/json" \
  -d '{
    "wallet_address": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
    "signature": "your-signature",
    "message": "Sign in to Sol-itaire",
    "public_key": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"
  }'
```

## 📊 Monitoring

### Health Checks

The backend includes comprehensive health checks:

```bash
# Basic health check
curl https://your-app.onrender.com/health

# Detailed health status
curl https://your-app.onrender.com/api/v1/stats/overview
```

### Logging

- **Application logs**: Available in Render dashboard
- **Database logs**: Available in Supabase dashboard
- **Error tracking**: Configure with Sentry or similar service

### Performance Monitoring

```bash
# Monitor response times
curl -w "@curl-format.txt" -o /dev/null -s https://your-app.onrender.com/health

# Check rate limits
curl -I https://your-app.onrender.com/api/v1/users/me
```

## 🔒 Security

### Best Practices

1. **Environment Variables**: Never commit secrets to git
2. **JWT Secrets**: Use strong, randomly generated secrets
3. **Rate Limiting**: Configured to prevent abuse
4. **CORS**: Restrict to your frontend domain
5. **Input Validation**: All inputs are validated using Zod schemas
6. **SQL Injection**: Protected by Supabase RLS policies

### Security Headers

The backend includes security headers via Helmet:

```javascript
// Content Security Policy
// XSS Protection
// HTTPS enforcement
// Clickjacking protection
```

## 🔄 CI/CD Pipeline

### Automatic Deployments

The GitHub Actions workflow handles:

1. **Testing**: Runs all tests on pull requests
2. **Building**: Creates production build
3. **Database**: Applies Supabase migrations
4. **Deployment**: Deploys to Render
5. **Health Checks**: Verifies deployment success
6. **Notifications**: Sends Slack notifications

### Manual Deployment

```bash
# Using the deployment script
./apps/backend/scripts/deploy.sh

# Deploy database only
./apps/backend/scripts/deploy.sh database-only

# Deploy to Render only
./apps/backend/scripts/deploy.sh render-only

# Run health check
./apps/backend/scripts/deploy.sh health-check
```

## 🚨 Troubleshooting

### Common Issues

1. **Build Failures**
   ```bash
   # Check build logs in Render dashboard
   # Verify package.json scripts are correct
   # Ensure all dependencies are installed
   ```

2. **Database Connection Issues**
   ```bash
   # Verify Supabase credentials
   # Check database URL format
   # Test connection locally first
   ```

3. **Authentication Issues**
   ```bash
   # Verify JWT secret is set
   # Check token expiration
   # Ensure wallet signature is valid
   ```

4. **Rate Limiting**
   ```bash
   # Check rate limit headers
   # Increase limits if needed
   # Implement backoff in client
   ```

### Debug Mode

Enable debug logging:

```env
LOG_LEVEL=debug
NODE_ENV=development
```

### Performance Issues

1. **Database Queries**
   - Use Supabase query analyzer
   - Add database indexes
   - Optimize complex queries

2. **API Response Times**
   - Monitor response times
   - Implement caching
   - Use CDN for static assets

## 📈 Scaling

### Free Tier Limitations

- **Render**: 750 hours/month, sleeps after 15 minutes inactivity
- **Supabase**: 500MB database, 2GB bandwidth, 50,000 monthly active users

### Upgrading

When you need to scale:

1. **Render**: Upgrade to paid plan for more hours
2. **Supabase**: Upgrade to Pro plan for more resources
3. **Database**: Consider read replicas for heavy loads
4. **Caching**: Add Redis for session storage

## 📚 Additional Resources

- [API Documentation](./apps/backend/docs/README.md)
- [Database Schema](./apps/backend/supabase/migrations/)
- [Frontend Integration Guide](./apps/backend/docs/api-examples.md)
- [Solana Documentation](https://docs.solana.com/)
- [Render Documentation](https://render.com/docs)
- [Supabase Documentation](https://supabase.com/docs)

## 🆘 Support

If you encounter issues:

1. **Check Logs**: Render and Supabase dashboards
2. **GitHub Issues**: Create an issue in the repository
3. **Discord**: Join our community Discord
4. **Email**: Contact support@sol-itaire.com

---

## 🎉 Success!

Your Sol-itaire backend is now deployed and ready to handle users! The API provides:

- ✅ User authentication with wallet support
- ✅ Game state management
- ✅ Transaction tracking
- ✅ Leaderboard system
- ✅ Real-time statistics
- ✅ Comprehensive monitoring
- ✅ Automated deployments

The backend is scalable, secure, and ready for production use with your Solana Solitaire game!