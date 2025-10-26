#!/bin/bash

# =============================================================================
# CHANNELDROP - COOLIFY DEPLOYMENT CHECKLIST SCRIPT
# =============================================================================
# This script helps verify your deployment readiness for Coolify
# Run this script before deploying to ensure all requirements are met
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

check_file() {
    if [ -f "$1" ]; then
        log_success "Found: $1"
        return 0
    else
        log_error "Missing: $1"
        return 1
    fi
}

check_env_var() {
    if [ -n "$2" ]; then
        log_success "$1 is set"
        return 0
    else
        log_warning "$1 is not set"
        return 1
    fi
}

# =============================================================================
# DEPLOYMENT READINESS CHECK
# =============================================================================

echo "🚀 ChannelDrop Coolify Deployment Readiness Check"
echo "=============================================="
echo

# Check required files
log_info "Checking required deployment files..."
FILES_OK=true

check_file "docker-compose.coolify.yml" || FILES_OK=false
check_file ".env.coolify" || FILES_OK=false
check_file "backend/Dockerfile.production" || FILES_OK=false
check_file "frontend/Dockerfile.production" || FILES_OK=false
check_file "docs/coolify-deployment-guide.md" || FILES_OK=false
check_file "docs/external-database-setup.md" || FILES_OK=false

echo

# Check environment variables (if .env file exists)
if [ -f ".env" ]; then
    log_info "Checking environment variables..."
    source .env
    
    ENV_OK=true
    check_env_var "DATABASE_URL" "$DATABASE_URL" || ENV_OK=false
    check_env_var "REDIS_URL" "$REDIS_URL" || ENV_OK=false
    check_env_var "JWT_ACCESS_SECRET" "$JWT_ACCESS_SECRET" || ENV_OK=false
    check_env_var "JWT_REFRESH_SECRET" "$JWT_REFRESH_SECRET" || ENV_OK=false
    check_env_var "FTP_HOST" "$FTP_HOST" || ENV_OK=false
    
    echo
else
    log_warning "No .env file found - remember to configure environment variables in Coolify"
    ENV_OK=false
fi

# Check JWT secret strength
if [ -n "$JWT_ACCESS_SECRET" ] && [ ${#JWT_ACCESS_SECRET} -lt 32 ]; then
    log_error "JWT_ACCESS_SECRET is too short (minimum 32 characters)"
    ENV_OK=false
fi

if [ -n "$JWT_REFRESH_SECRET" ] && [ ${#JWT_REFRESH_SECRET} -lt 32 ]; then
    log_error "JWT_REFRESH_SECRET is too short (minimum 32 characters)"
    ENV_OK=false
fi

# Check Docker and Git
log_info "Checking development tools..."
TOOLS_OK=true

if command -v docker &> /dev/null; then
    log_success "Docker is available"
else
    log_error "Docker is not installed or not in PATH"
    TOOLS_OK=false
fi

if command -v git &> /dev/null; then
    log_success "Git is available"
else
    log_error "Git is not installed or not in PATH"
    TOOLS_OK=false
fi

# Check Git status
if [ -d ".git" ]; then
    if [ -z "$(git status --porcelain)" ]; then
        log_success "Git repository is clean"
    else
        log_warning "Git repository has uncommitted changes"
        log_info "Run 'git add . && git commit -m \"feat: prepare for deployment\"'"
    fi
else
    log_warning "Not a Git repository"
fi

echo

# =============================================================================
# DEPLOYMENT RECOMMENDATIONS
# =============================================================================

log_info "Deployment Recommendations:"
echo

if [ "$FILES_OK" = true ]; then
    log_success "✅ All required files are present"
else
    log_error "❌ Some required files are missing"
    echo "   Run the deployment setup script to generate missing files"
fi

if [ "$ENV_OK" = true ]; then
    log_success "✅ Environment configuration looks good"
else
    log_warning "⚠️  Review environment configuration"
    echo "   1. Copy variables from .env.coolify to your Coolify environment"
    echo "   2. Generate secure JWT secrets: openssl rand -base64 48"
    echo "   3. Configure your database connection strings"
fi

if [ "$TOOLS_OK" = true ]; then
    log_success "✅ Development tools are ready"
else
    log_error "❌ Install missing development tools"
fi

echo

# =============================================================================
# NEXT STEPS
# =============================================================================

log_info "Next Steps for Deployment:"
echo "1. 🗄️  Set up external databases (see docs/external-database-setup.md)"
echo "2. 🌐 Configure your domain and DNS"
echo "3. 🔑 Generate and set secure JWT secrets"
echo "4. 📝 Copy environment variables to Coolify"
echo "5. 🚀 Create new project in Coolify dashboard"
echo "6. 📋 Follow the deployment guide (docs/coolify-deployment-guide.md)"
echo

# Generate secure secrets helper
log_info "Generate secure secrets:"
echo "JWT_ACCESS_SECRET=$(openssl rand -base64 48 2>/dev/null || echo 'Install OpenSSL to generate secure secrets')"
echo "JWT_REFRESH_SECRET=$(openssl rand -base64 48 2>/dev/null || echo 'Install OpenSSL to generate secure secrets')"
echo

# Final summary
if [ "$FILES_OK" = true ] && [ "$TOOLS_OK" = true ]; then
    log_success "🎉 Your ChannelDrop application is ready for Coolify deployment!"
    echo "   Follow the deployment guide to complete the setup."
else
    log_warning "⚠️  Please address the issues above before deploying."
fi

echo
echo "📚 Documentation:"
echo "   • Deployment Guide: docs/coolify-deployment-guide.md"
echo "   • Database Setup: docs/external-database-setup.md"
echo "   • Project Overview: AGENTS.md"
echo

exit 0