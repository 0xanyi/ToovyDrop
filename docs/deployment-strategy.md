# Deployment & Environment Configuration Strategy

## Overview

This document outlines the deployment strategy for the FTP file management system, specifically designed for Coolify deployment without SSH access. The strategy focuses on containerization, CI/CD pipelines, and configuration management to ensure reliable deployments.

## Container Architecture

### 1. Multi-Container Setup

```
┌─────────────────────────────────────────────────────────────────┐
│                    Coolify Deployment                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────┐ │
│  │   Frontend  │  │   Backend   │  │ PostgreSQL  │  │  Redis  │ │
│  │   (Nginx)   │  │  (Node.js)  │  │  Database   │  │  Cache  │ │
│  │             │  │             │  │             │  │         │ │
│  │ Port: 80    │  │ Port: 3000  │  │ Port: 5432  │  │ Port:   │ │
│  │ Port: 443   │  │             │  │             │  │ 6379    │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────┘ │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                   Persistent Storage                        │ │
│  │                                                             │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │ │
│  │  │   Database  │  │   Uploads   │  │     Logs    │         │ │
│  │  │   Data      │  │   Temp      │  │             │         │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘         │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Docker Configuration

#### Frontend Dockerfile
```dockerfile
# Frontend Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built application
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose ports
EXPOSE 80 443

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
```

#### Backend Dockerfile
```dockerfile
# Backend Dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Create necessary directories
RUN mkdir -p /app/uploads /app/logs
RUN chown -R nodejs:nodejs /app

USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js || exit 1

CMD ["node", "dist/index.js"]
```

#### Nginx Configuration
```nginx
# nginx.conf
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;
    
    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';
    
    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log warn;
    
    # Basic settings
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 5G;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript 
               application/javascript application/xml+rss 
               application/json application/xml;
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=upload:10m rate=1r/s;
    
    upstream backend {
        server backend:3000;
    }
    
    server {
        listen 80;
        server_name _;
        
        # Security headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        add_header Referrer-Policy "strict-origin-when-cross-origin";
        
        # Frontend static files
        location / {
            root /usr/share/nginx/html;
            index index.html index.htm;
            try_files $uri $uri/ /index.html;
        }
        
        # API endpoints
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
            proxy_read_timeout 300s;
            proxy_connect_timeout 75s;
        }
        
        # File upload endpoints
        location /api/channels/*/files/upload {
            limit_req zone=upload burst=5 nodelay;
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
            proxy_read_timeout 600s;
            proxy_connect_timeout 75s;
            proxy_request_buffering off;
        }
        
        # WebSocket for upload progress
        location /upload-progress {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

## Docker Compose Configuration

```yaml
# docker-compose.yml
version: '3.8'

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - backend
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    restart: unless-stopped
    networks:
      - app-network

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
      - REDIS_URL=redis://redis:6379
      - JWT_ACCESS_SECRET=${JWT_ACCESS_SECRET}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
      - FTP_HOST=${FTP_HOST}
      - FTP_USER=${FTP_USER}
      - FTP_PASSWORD=${FTP_PASSWORD}
      - FTP_PORT=${FTP_PORT:-21}
      - FTP_SECURE=${FTP_SECURE:-false}
    depends_on:
      - postgres
      - redis
    volumes:
      - uploads:/app/uploads
      - logs:/app/logs
    restart: unless-stopped
    networks:
      - app-network
    healthcheck:
      test: ["CMD", "node", "healthcheck.js"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=${POSTGRES_DB}
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    restart: unless-stopped
    networks:
      - app-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 30s
      timeout: 10s
      retries: 3

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    restart: unless-stopped
    networks:
      - app-network
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  postgres_data:
  redis_data:
  uploads:
  logs:

networks:
  app-network:
    driver: bridge
```

## Environment Configuration

### 1. Production Environment Variables

```bash
# .env.production
# Application
NODE_ENV=production
APP_NAME=FTP Manager
APP_VERSION=1.0.0

# Database
POSTGRES_DB=ftp_manager
POSTGRES_USER=ftp_user
POSTGRES_PASSWORD=secure_password_here
DATABASE_URL=postgresql://ftp_user:secure_password_here@postgres:5432/ftp_manager

# Redis
REDIS_PASSWORD=redis_password_here
REDIS_URL=redis://:redis_password_here@redis:6379

# JWT
JWT_ACCESS_SECRET=very_secure_access_secret_at_least_32_characters
JWT_REFRESH_SECRET=very_secure_refresh_secret_at_least_32_characters
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# FTP Configuration
FTP_HOST=ftp.example.com
FTP_PORT=21
FTP_USER=ftp_user
FTP_PASSWORD=ftp_password
FTP_SECURE=false
FTP_REJECT_UNAUTHORIZED=true
FTP_CONN_TIMEOUT=10000
FTP_PASV_TIMEOUT=10000
FTP_ALIVE_TIMEOUT=60000
FTP_MAX_CONNECTIONS=5
FTP_OPERATION_CONCURRENCY=3

# File Upload
MAX_FILE_SIZE=5368709120  # 5GB in bytes
CHUNK_SIZE=5242880  # 5MB in bytes
UPLOAD_DIR=/app/uploads
TEMP_DIR=/app/uploads/temp

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_MAX_REQUESTS=5
UPLOAD_RATE_LIMIT_MAX_UPLOADS=10
UPLOAD_RATE_LIMIT_MAX_CONCURRENT=3

# Logging
LOG_LEVEL=info
LOG_FILE=/app/logs/app.log
LOG_MAX_SIZE=10m
LOG_MAX_FILES=5

# Security
BCRYPT_ROUNDS=12
SESSION_TIMEOUT=86400000  # 24 hours
CORS_ALLOWED_ORIGINS=https://yourdomain.com
CORS_ADDITIONAL_ALLOWED_ORIGINS=
CSP_ADDITIONAL_CONNECT_SRC=https://api.yourdomain.com,wss://api.yourdomain.com
TRUST_PROXY=true

# Monitoring
HEALTH_CHECK_INTERVAL=30000
METRICS_ENABLED=true
```

### 2. Environment-Specific Configurations

```javascript
// config/environment.js
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
const envFile = `.env.${process.env.NODE_ENV || 'development'}`;
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

const config = {
  development: {
    database: {
      url: process.env.DATABASE_URL || 'postgresql://localhost/ftp_manager_dev',
      ssl: false
    },
    redis: {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      password: process.env.REDIS_PASSWORD
    },
    ftp: {
      host: process.env.FTP_HOST || 'localhost',
      port: parseInt(process.env.FTP_PORT) || 21,
      user: process.env.FTP_USER || 'ftpuser',
      password: process.env.FTP_PASSWORD || 'ftppass',
      secure: process.env.FTP_SECURE === 'true'
    },
    upload: {
      maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 100 * 1024 * 1024, // 100MB
      chunkSize: parseInt(process.env.CHUNK_SIZE) || 1024 * 1024, // 1MB
      tempDir: process.env.TEMP_DIR || './temp'
    },
    logging: {
      level: process.env.LOG_LEVEL || 'debug',
      file: process.env.LOG_FILE || './logs/app.log'
    }
  },
  
  production: {
    database: {
      url: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false
    },
    redis: {
      url: process.env.REDIS_URL,
      password: process.env.REDIS_PASSWORD
    },
    ftp: {
      host: process.env.FTP_HOST,
      port: parseInt(process.env.FTP_PORT) || 21,
      user: process.env.FTP_USER,
      password: process.env.FTP_PASSWORD,
      secure: process.env.FTP_SECURE === 'true',
      secureOptions: {
        rejectUnauthorized: process.env.FTP_REJECT_UNAUTHORIZED !== 'false'
      }
    },
    upload: {
      maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 * 1024, // 5GB
      chunkSize: parseInt(process.env.CHUNK_SIZE) || 5 * 1024 * 1024, // 5MB
      tempDir: process.env.TEMP_DIR || '/app/uploads/temp'
    },
    logging: {
      level: process.env.LOG_LEVEL || 'info',
      file: process.env.LOG_FILE || '/app/logs/app.log'
    }
  }
};

module.exports = config[process.env.NODE_ENV || 'development'];
```

## CI/CD Pipeline

### 1. GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy to Coolify

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
      
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies (backend)
      run: |
        cd backend
        npm ci
    
    - name: Install dependencies (frontend)
      run: |
        cd frontend
        npm ci
    
    - name: Run backend tests
      run: |
        cd backend
        npm test
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
        REDIS_URL: redis://localhost:6379
        JWT_ACCESS_SECRET: test_secret
        JWT_REFRESH_SECRET: test_secret
    
    - name: Run frontend tests
      run: |
        cd frontend
        npm test -- --coverage --watchAll=false
    
    - name: Build frontend
      run: |
        cd frontend
        npm run build
    
    - name: Build backend
      run: |
        cd backend
        npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Deploy to Coolify
      run: |
        # Trigger Coolify deployment webhook
        curl -X POST "${{ secrets.COOLIFY_WEBHOOK_URL }}" \
          -H "Content-Type: application/json" \
          -d '{"branch": "main", "commit": "${{ github.sha }}"}'
```

### 2. Database Migration Strategy

```javascript
// scripts/migrate.js
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

class DatabaseMigrator {
  constructor(databaseUrl) {
    this.pool = new Pool({ connectionString: databaseUrl });
  }
  
  async migrate() {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Create migrations table if it doesn't exist
      await client.query(`
        CREATE TABLE IF NOT EXISTS migrations (
          id SERIAL PRIMARY KEY,
          filename VARCHAR(255) NOT NULL UNIQUE,
          executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Get executed migrations
      const result = await client.query('SELECT filename FROM migrations');
      const executedMigrations = result.rows.map(row => row.filename);
      
      // Get all migration files
      const migrationsDir = path.join(__dirname, '../migrations');
      const migrationFiles = fs.readdirSync(migrationsDir)
        .filter(file => file.endsWith('.sql'))
        .sort();
      
      // Execute pending migrations
      for (const file of migrationFiles) {
        if (!executedMigrations.includes(file)) {
          console.log(`Executing migration: ${file}`);
          
          const migrationSQL = fs.readFileSync(
            path.join(migrationsDir, file),
            'utf8'
          );
          
          await client.query(migrationSQL);
          await client.query(
            'INSERT INTO migrations (filename) VALUES ($1)',
            [file]
          );
          
          console.log(`Migration ${file} executed successfully`);
        }
      }
      
      await client.query('COMMIT');
      console.log('All migrations executed successfully');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Migration failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  async close() {
    await this.pool.end();
  }
}

// Run migrations if called directly
if (require.main === module) {
  const migrator = new DatabaseMigrator(process.env.DATABASE_URL);
  
  migrator.migrate()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = DatabaseMigrator;
```

## Health Checks & Monitoring

### 1. Application Health Check

```javascript
// healthcheck.js
const http = require('http');

const options = {
  hostname: 'localhost',
  port: process.env.PORT || 3000,
  path: '/api/health',
  method: 'GET',
  timeout: 2000
};

const req = http.request(options, (res) => {
  if (res.statusCode === 200) {
    process.exit(0);
  } else {
    process.exit(1);
  }
});

req.on('error', () => {
  process.exit(1);
});

req.on('timeout', () => {
  req.destroy();
  process.exit(1);
});

req.end();
```

### 2. API Health Endpoint

```javascript
// routes/health.js
const express = require('express');
const router = express.Router();

router.get('/health', async (req, res) => {
  try {
    // Check database connection
    await req.db.query('SELECT 1');
    
    // Check Redis connection
    await req.redis.ping();
    
    // Check FTP connection
    await req.ftpService.checkConnection();
    
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'healthy',
        redis: 'healthy',
        ftp: 'healthy'
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

module.exports = router;
```

## Backup & Recovery Strategy

### 1. Database Backup Script

```bash
#!/bin/bash
# scripts/backup-db.sh

set -e

# Configuration
DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-ftp_manager}"
DB_USER="${DB_USER:-ftp_user}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Generate backup filename
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.sql"

# Create backup
echo "Creating database backup..."
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" > "$BACKUP_FILE"

# Compress backup
echo "Compressing backup..."
gzip "$BACKUP_FILE"

# Remove old backups
echo "Removing old backups..."
find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: ${BACKUP_FILE}.gz"
```

### 2. Application Data Backup

```bash
#!/bin/bash
# scripts/backup-app-data.sh

set -e

# Configuration
UPLOAD_DIR="${UPLOAD_DIR:-/app/uploads}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Generate backup filename
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/uploads_backup_$TIMESTAMP.tar.gz"

# Create backup
echo "Creating application data backup..."
tar -czf "$BACKUP_FILE" -C "$(dirname "$UPLOAD_DIR")" "$(basename "$UPLOAD_DIR")"

# Remove old backups
echo "Removing old backups..."
find "$BACKUP_DIR" -name "uploads_backup_*.tar.gz" -mtime +$RETENTION_DAYS -delete

echo "Application data backup completed: $BACKUP_FILE"
```

## Coolify Deployment Configuration

### 1. Coolify Compose File

```yaml
# coolify-compose.yml
version: '3.8'

services:
  ftp-manager:
    image: your-registry/ftp-manager:latest
    ports:
      - "80:80"
      - "443:443"
    environment:
      - NODE_ENV=production
    volumes:
      - ftp_manager_uploads:/app/uploads
      - ftp_manager_logs:/app/logs
      - ftp_manager_postgres_data:/var/lib/postgresql/data
      - ftp_manager_redis_data:/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

volumes:
  ftp_manager_uploads:
  ftp_manager_logs:
  ftp_manager_postgres_data:
  ftp_manager_redis_data:
```

### 2. Deployment Script

```bash
#!/bin/bash
# scripts/deploy.sh

set -e

echo "Starting deployment..."

# Pull latest images
echo "Pulling latest images..."
docker-compose -f coolify-compose.yml pull

# Stop existing services
echo "Stopping existing services..."
docker-compose -f coolify-compose.yml down

# Run database migrations
echo "Running database migrations..."
docker-compose -f coolify-compose.yml run --rm ftp-manager npm run migrate

# Start new services
echo "Starting new services..."
docker-compose -f coolify-compose.yml up -d

# Wait for services to be healthy
echo "Waiting for services to be healthy..."
sleep 30

# Check health
echo "Checking service health..."
if curl -f http://localhost/api/health; then
  echo "Deployment successful!"
else
  echo "Deployment failed - services not healthy"
  exit 1
fi

echo "Deployment completed successfully!"
```

This deployment strategy provides a comprehensive approach to deploying the FTP file management system on Coolify with proper containerization, environment management, CI/CD pipelines, and monitoring capabilities.
