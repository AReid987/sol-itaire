#!/bin/bash

# Sol-itaire Deployment Script
# This script automates the deployment process for the entire Sol-itaire ecosystem

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NETWORK=${1:-devnet}
ENVIRONMENT=${2:-development}

echo -e "${BLUE}🎮 Sol-itaire Deployment Script${NC}"
echo -e "${BLUE}===================================${NC}"
echo -e "Network: ${GREEN}$NETWORK${NC}"
echo -e "Environment: ${GREEN}$ENVIRONMENT${NC}"
echo ""

# Function to check prerequisites
check_prerequisites() {
    echo -e "${YELLOW}Checking prerequisites...${NC}"

    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js is not installed. Please install Node.js 18+${NC}"
        exit 1
    fi

    # Check if pnpm is installed
    if ! command -v pnpm &> /dev/null; then
        echo -e "${RED}❌ pnpm is not installed. Please install pnpm${NC}"
        exit 1
    fi

    # Check if Solana CLI is installed
    if ! command -v solana &> /dev/null; then
        echo -e "${RED}❌ Solana CLI is not installed. Please install Solana CLI${NC}"
        exit 1
    fi

    # Check if Anchor is installed
    if ! command -v anchor &> /dev/null; then
        echo -e "${RED}❌ Anchor is not installed. Please install Anchor${NC}"
        exit 1
    fi

    echo -e "${GREEN}✅ All prerequisites are installed${NC}"
}

# Function to install dependencies
install_dependencies() {
    echo -e "${YELLOW}Installing dependencies...${NC}"
    pnpm install --frozen-lockfile
    echo -e "${GREEN}✅ Dependencies installed${NC}"
}

# Function to run tests
run_tests() {
    echo -e "${YELLOW}Running tests...${NC}"

    # Type checking
    echo -e "Running type check..."
    pnpm run type-check

    # Linting
    echo -e "Running linter..."
    pnpm run lint

    # Contract tests
    echo -e "Running contract tests..."
    pnpm run test:contracts

    # Backend tests
    echo -e "Running backend tests..."
    pnpm run test:backend

    # Frontend tests
    echo -e "Running frontend tests..."
    pnpm run test:frontend

    echo -e "${GREEN}✅ All tests passed${NC}"
}

# Function to build smart contracts
build_contracts() {
    echo -e "${YELLOW}Building smart contracts...${NC}"
    pnpm run build:contracts
    echo -e "${GREEN}✅ Smart contracts built${NC}"
}

# Function to deploy smart contracts
deploy_contracts() {
    echo -e "${YELLOW}Deploying smart contracts to $NETWORK...${NC}"

    # Set Solana config
    solana config set --url $NETWORK

    # Deploy contracts
    if [ "$NETWORK" = "mainnet" ]; then
        echo -e "${RED}⚠️  WARNING: Deploying to mainnet!${NC}"
        read -p "Are you sure you want to continue? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${YELLOW}Deployment cancelled${NC}"
            exit 1
        fi
    fi

    pnpm run deploy:$NETWORK

    # Extract contract addresses
    GAME_PROGRAM_ID=$(solana address -k target/deploy/solitaire-keypair.json)
    TOKEN_PROGRAM_ID=$(solana address -k target/deploy/gaming-token-keypair.json)
    MEMECOIN_PROGRAM_ID=$(solana address -k target/deploy/memecoin-keypair.json)

    echo -e "${GREEN}✅ Smart contracts deployed${NC}"
    echo -e "${BLUE}Contract Addresses:${NC}"
    echo -e "  Game Program: ${GREEN}$GAME_PROGRAM_ID${NC}"
    echo -e "  Token Program: ${GREEN}$TOKEN_PROGRAM_ID${NC}"
    echo -e "  Memecoin Program: ${GREEN}$MEMECOIN_PROGRAM_ID${NC}"
}

# Function to build frontend
build_frontend() {
    echo -e "${YELLOW}Building frontend...${NC}"

    # Set environment variables for frontend build
    export NEXT_PUBLIC_GAME_PROGRAM_ID=$GAME_PROGRAM_ID
    export NEXT_PUBLIC_TOKEN_PROGRAM_ID=$TOKEN_PROGRAM_ID
    export NEXT_PUBLIC_MEMECOIN_PROGRAM_ID=$MEMECOIN_PROGRAM_ID
    export NEXT_PUBLIC_SOLANA_NETWORK=$NETWORK

    pnpm run build:frontend

    echo -e "${GREEN}✅ Frontend built${NC}"
}

# Function to build backend
build_backend() {
    echo -e "${YELLOW}Building backend...${NC}"
    pnpm run build:backend
    echo -e "${GREEN}✅ Backend built${NC}"
}

# Function to deploy to Vercel (frontend)
deploy_frontend() {
    echo -e "${YELLOW}Deploying frontend to Vercel...${NC}"

    cd apps/web

    # Install Vercel CLI if not installed
    if ! command -v vercel &> /dev/null; then
        echo -e "Installing Vercel CLI..."
        npm install --global vercel@latest
    fi

    # Deploy to Vercel
    if [ "$ENVIRONMENT" = "production" ]; then
        vercel --prod
    else
        vercel --preview
    fi

    cd ../..

    echo -e "${GREEN}✅ Frontend deployed to Vercel${NC}"
}

# Function to deploy to Render (backend)
deploy_backend() {
    echo -e "${YELLOW}Backend deployment to Render...${NC}"
    echo -e "${BLUE}Backend is automatically deployed to Render when pushing to main branch${NC}"
    echo -e "${BLUE}Ensure your Render account is connected to this repository${NC}"
    echo -e "${GREEN}✅ Backend deployment configured${NC}"
}

# Function to run database migrations
migrate_database() {
    echo -e "${YELLOW}Running database migrations...${NC}"

    cd apps/backend

    # Run migrations
    pnpm run migrate:prod

    # Seed database if needed
    if [ "$ENVIRONMENT" = "development" ]; then
        pnpm run seed:dev
    fi

    cd ../..

    echo -e "${GREEN}✅ Database migrations completed${NC}"
}

# Function to run health checks
health_checks() {
    echo -e "${YELLOW}Running health checks...${NC}"

    # Check frontend deployment
    if [ ! -z "$FRONTEND_URL" ]; then
        echo -e "Checking frontend at $FRONTEND_URL..."
        curl -f -s "$FRONTEND_URL" > /dev/null
        echo -e "${GREEN}✅ Frontend is healthy${NC}"
    fi

    # Check backend deployment
    if [ ! -z "$BACKEND_URL" ]; then
        echo -e "Checking backend at $BACKEND_URL..."
        curl -f -s "$BACKEND_URL/api/health" > /dev/null
        echo -e "${GREEN}✅ Backend is healthy${NC}"
    fi

    echo -e "${GREEN}✅ All health checks passed${NC}"
}

# Function to create deployment summary
create_summary() {
    echo -e "${BLUE}🎉 Deployment Summary${NC}"
    echo -e "${BLUE}===================${NC}"
    echo -e "Network: ${GREEN}$NETWORK${NC}"
    echo -e "Environment: ${GREEN}$ENVIRONMENT${NC}"
    echo -e ""
    echo -e "${BLUE}Contract Addresses:${NC}"
    echo -e "  Game Program: ${GREEN}$GAME_PROGRAM_ID${NC}"
    echo -e "  Token Program: ${GREEN}$TOKEN_PROGRAM_ID${NC}"
    echo -e "  Memecoin Program: ${GREEN}$MEMECOIN_PROGRAM_ID${NC}"
    echo -e ""
    echo -e "${BLUE}Deployment URLs:${NC}"
    if [ ! -z "$FRONTEND_URL" ]; then
        echo -e "  Frontend: ${GREEN}$FRONTEND_URL${NC}"
    fi
    if [ ! -z "$BACKEND_URL" ]; then
        echo -e "  Backend: ${GREEN}$BACKEND_URL${NC}"
    fi
    echo -e ""
    echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
}

# Main deployment flow
main() {
    echo -e "${BLUE}Starting deployment process...${NC}"
    echo ""

    # Check if required environment variables are set
    if [ "$ENVIRONMENT" = "production" ]; then
        if [ -z "$SOLANA_PRIVATE_KEY" ]; then
            echo -e "${RED}❌ SOLANA_PRIVATE_KEY environment variable is required for production deployment${NC}"
            exit 1
        fi
        if [ -z "$VERCEL_TOKEN" ]; then
            echo -e "${RED}❌ VERCEL_TOKEN environment variable is required for production deployment${NC}"
            exit 1
        fi
    fi

    # Run deployment steps
    check_prerequisites
    echo ""

    install_dependencies
    echo ""

    run_tests
    echo ""

    build_contracts
    echo ""

    deploy_contracts
    echo ""

    build_frontend
    echo ""

    build_backend
    echo ""

    # Deploy services
    if [ "$ENVIRONMENT" = "production" ]; then
        deploy_frontend
        echo ""
        migrate_database
        echo ""
        health_checks
        echo ""
    fi

    create_summary
}

# Handle script interruption
trap 'echo -e "\n${RED}❌ Deployment interrupted${NC}"; exit 1' INT

# Run main function
main "$@"