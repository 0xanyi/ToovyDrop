#!/bin/bash

# ToovyDrop Production Deployment Script
set -e

echo "🚀 Starting ToovyDrop Production Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    print_error ".env.production file not found!"
    print_warning "Please create .env.production with your production configuration"
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running!"
    exit 1
fi

print_status "Running tests..."
cd backend
if npm test; then
    print_status "✅ All tests passed!"
else
    print_error "❌ Tests failed! Please fix before deploying."
    exit 1
fi
cd ..

print_status "Building backend..."
cd backend
npm run build
if [ $? -eq 0 ]; then
    print_status "✅ Backend built successfully!"
else
    print_error "❌ Backend build failed!"
    exit 1
fi
cd ..

print_status "Building frontend..."
cd frontend
npm run build
if [ $? -eq 0 ]; then
    print_status "✅ Frontend built successfully!"
else
    print_error "❌ Frontend build failed!"
    exit 1
fi
cd ..

print_status "Building Docker images..."
if docker-compose -f docker-compose.yml build; then
    print_status "✅ Docker images built successfully!"
else
    print_error "❌ Docker build failed!"
    exit 1
fi

print_status "Starting production services..."
docker-compose -f docker-compose.yml up -d

# Wait for services to be ready
print_status "Waiting for services to start..."
sleep 30

# Check health endpoint
print_status "Checking application health..."
if curl -f http://localhost/api/health > /dev/null 2>&1; then
    print_status "✅ Application is healthy!"
else
    print_warning "⚠️  Health check failed - check logs"
    docker-compose -f docker-compose.yml logs --tail=50
fi

print_status "🎉 Deployment completed!"
print_warning "Next steps:"
echo "1. Verify all services are running: docker-compose ps"
echo "2. Check logs: docker-compose logs -f"
echo "3. Create admin user: docker-compose exec backend npm run create-admin"
echo "4. Test file upload functionality"
echo "5. Configure your domain and SSL in Coolify"