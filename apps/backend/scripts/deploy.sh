#!/bin/bash

# Deployment script for Sol-itaire backend
# This script handles deployment to Render and Supabase

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
RENDER_API_KEY="${RENDER_API_KEY}"
RENDER_SERVICE_ID="${RENDER_SERVICE_ID}"
SUPABASE_ACCESS_TOKEN="${SUPABASE_ACCESS_TOKEN}"
SUPABASE_PROJECT_ID="${SUPABASE_PROJECT_ID}"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required environment variables are set
check_env_vars() {
    log_info "Checking environment variables..."

    if [[ -z "$RENDER_API_KEY" ]]; then
        log_error "RENDER_API_KEY is not set"
        exit 1
    fi

    if [[ -z "$RENDER_SERVICE_ID" ]]; then
        log_error "RENDER_SERVICE_ID is not set"
        exit 1
    fi

    if [[ -z "$SUPABASE_ACCESS_TOKEN" ]]; then
        log_error "SUPABASE_ACCESS_TOKEN is not set"
        exit 1
    fi

    if [[ -z "$SUPABASE_PROJECT_ID" ]]; then
        log_error "SUPABASE_PROJECT_ID is not set"
        exit 1
    fi

    log_success "Environment variables check passed"
}

# Install dependencies
install_dependencies() {
    log_info "Installing dependencies..."
    pnpm install --frozen-lockfile
    log_success "Dependencies installed"
}

# Run tests
run_tests() {
    log_info "Running tests..."
    pnpm --filter @sol-itaire/backend test
    log_success "Tests passed"
}

# Build the application
build_app() {
    log_info "Building application..."
    pnpm --filter @sol-itaire/backend build
    log_success "Application built successfully"
}

# Deploy database migrations
deploy_database() {
    log_info "Deploying database migrations to Supabase..."

    # Install Supabase CLI if not present
    if ! command -v supabase &> /dev/null; then
        log_info "Installing Supabase CLI..."
        curl -L https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz | tar xz
        sudo mv supabase/linux/amd64/supabase /usr/local/bin/
    fi

    # Login to Supabase
    supabase login --no-browser

    # Deploy migrations
    cd apps/backend/supabase
    supabase db push --db-url "postgresql://postgres:${SUPABASE_DB_PASSWORD}@db.${SUPABASE_PROJECT_ID}.supabase.co:5432/postgres"

    cd - > /dev/null
    log_success "Database migrations deployed"
}

# Deploy to Render
deploy_to_render() {
    log_info "Deploying to Render..."

    # Trigger Render deployment
    curl -X POST \
        -H "Authorization: Bearer ${RENDER_API_KEY}" \
        -H "Content-Type: application/json" \
        -d '{}' \
        "https://api.render.com/v1/services/${RENDER_SERVICE_ID}/deploys"

    log_success "Render deployment triggered"
}

# Wait for deployment to complete
wait_for_deployment() {
    log_info "Waiting for deployment to complete..."

    for i in {1..30}; do
        sleep 10

        # Check deployment status
        DEPLOY_STATUS=$(curl -s \
            -H "Authorization: Bearer ${RENDER_API_KEY}" \
            "https://api.render.com/v1/services/${RENDER_SERVICE_ID}/deploys?limit=1" | \
            jq -r '.[0].status')

        if [[ "$DEPLOY_STATUS" == "live" ]]; then
            log_success "Deployment completed successfully"
            return 0
        elif [[ "$DEPLOY_STATUS" == "failed" ]]; then
            log_error "Deployment failed"
            return 1
        fi

        log_info "Deployment status: ${DEPLOY_STATUS} (attempt ${i}/30)"
    done

    log_error "Deployment timed out"
    return 1
}

# Run health check
run_health_check() {
    log_info "Running health check..."

    # Get Render service URL
    SERVICE_URL=$(curl -s \
        -H "Authorization: Bearer ${RENDER_API_KEY}" \
        "https://api.render.com/v1/services/${RENDER_SERVICE_ID}" | \
        jq -r '.service.url')

    if [[ -z "$SERVICE_URL" || "$SERVICE_URL" == "null" ]]; then
        log_error "Could not fetch service URL"
        return 1
    fi

    # Wait a bit for the service to start
    sleep 30

    # Check health endpoint
    for i in {1..10}; do
        HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${SERVICE_URL}/health")

        if [[ "$HTTP_STATUS" == "200" ]]; then
            log_success "Health check passed"
            return 0
        fi

        log_info "Health check attempt ${i}/10 (status: ${HTTP_STATUS})"
        sleep 10
    done

    log_error "Health check failed"
    return 1
}

# Send notification
send_notification() {
    local status=$1

    if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
        local message
        if [[ "$status" == "success" ]]; then
            message="✅ Sol-itaire backend deployed successfully to production!"
        else
            message="❌ Sol-itaire backend deployment failed!"
        fi

        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"${message}\"}" \
            "$SLACK_WEBHOOK_URL"
    fi
}

# Main deployment function
main() {
    log_info "Starting Sol-itaire backend deployment..."

    # Check environment variables
    check_env_vars

    # Install dependencies
    install_dependencies

    # Run tests
    run_tests

    # Build application
    build_app

    # Deploy database
    deploy_database

    # Deploy to Render
    deploy_to_render

    # Wait for deployment
    if wait_for_deployment; then
        # Run health check
        if run_health_check; then
            log_success "🎉 Deployment completed successfully!"
            send_notification "success"
            exit 0
        else
            log_error "❌ Health check failed"
            send_notification "failure"
            exit 1
        fi
    else
        log_error "❌ Deployment failed"
        send_notification "failure"
        exit 1
    fi
}

# Handle script arguments
case "${1:-}" in
    "database-only")
        log_info "Running database deployment only..."
        check_env_vars
        deploy_database
        ;;
    "render-only")
        log_info "Running Render deployment only..."
        check_env_vars
        deploy_to_render
        wait_for_deployment
        run_health_check
        ;;
    "health-check")
        log_info "Running health check only..."
        run_health_check
        ;;
    *)
        main
        ;;
esac