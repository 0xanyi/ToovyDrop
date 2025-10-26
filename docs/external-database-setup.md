# ChannelDrop - External Database Setup Guide

This guide covers deploying ChannelDrop with external PostgreSQL and Redis services instead of containerized databases. This approach is recommended for production environments requiring high availability, managed backups, and dedicated database resources.

## Benefits of External Databases

✅ **Better Performance**: Dedicated resources for databases  
✅ **High Availability**: Built-in replication and failover  
✅ **Automated Backups**: Managed backup solutions  
✅ **Scalability**: Independent scaling of database resources  
✅ **Maintenance**: Automated updates and security patches  
✅ **Monitoring**: Advanced database monitoring tools  

## Database Setup Options

### Option 1: Coolify Managed Databases (Recommended)

Create separate database services within Coolify:

#### 1.1 Create PostgreSQL Service
```yaml
# In Coolify Dashboard -> New Service -> PostgreSQL
Name: toovydrop-postgres
Version: 15
Database: toovydrop
Username: toovydrop_user
Password: [auto-generated or custom]
```

#### 1.2 Create Redis Service  
```yaml
# In Coolify Dashboard -> New Service -> Redis
Name: toovydrop-redis
Version: 7
Password: [auto-generated or custom]
```

#### 1.3 Get Connection Details
After creation, note the connection strings:
```bash
# PostgreSQL
postgresql://toovydrop_user:password@toovydrop-postgres:5432/toovydrop

# Redis
redis://:password@toovydrop-redis:6379
```

### Option 2: Cloud Database Services

#### 2.1 PostgreSQL Options
- **AWS RDS**: Managed PostgreSQL with automated backups
- **Google Cloud SQL**: Fully managed PostgreSQL service
- **Azure Database**: PostgreSQL as a service
- **DigitalOcean Managed Databases**: Simple managed PostgreSQL
- **Supabase**: PostgreSQL with additional features

Example connection string:
```bash
postgresql://username:password@your-db-host.amazonaws.com:5432/toovydrop
```

#### 2.2 Redis Options
- **AWS ElastiCache**: Managed Redis clusters
- **Google Memorystore**: Fully managed Redis
- **Azure Cache for Redis**: Managed Redis service
- **DigitalOcean Managed Redis**: Simple managed Redis
- **Upstash**: Serverless Redis

Example connection string:
```bash
redis://username:password@your-redis-host.com:6379
```

### Option 3: Self-Hosted Databases

#### 3.1 PostgreSQL Setup (Ubuntu/Debian)
```bash
# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Create database and user
sudo -u postgres psql
CREATE DATABASE toovydrop;
CREATE USER toovydrop_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE toovydrop TO toovydrop_user;
\q

# Configure PostgreSQL for remote connections
sudo nano /etc/postgresql/15/main/postgresql.conf
# Set: listen_addresses = '*'

sudo nano /etc/postgresql/15/main/pg_hba.conf
# Add: host toovydrop toovydrop_user 0.0.0.0/0 md5

# Restart PostgreSQL
sudo systemctl restart postgresql
```

#### 3.2 Redis Setup (Ubuntu/Debian)
```bash
# Install Redis
sudo apt update
sudo apt install redis-server

# Configure Redis
sudo nano /etc/redis/redis.conf
# Set: requirepass your_secure_password
# Set: bind 0.0.0.0

# Restart Redis
sudo systemctl restart redis-server
```

## Deployment Configuration

### Step 1: Choose Docker Compose File

Use the external database configuration:
```bash
# Rename the external DB config as main config
mv docker-compose.external-db.yml docker-compose.coolify.yml
```

### Step 2: Configure Environment Variables

Set these variables in your Coolify environment:

```bash
# =============================================================================
# DATABASE CONNECTIONS
# =============================================================================

# PostgreSQL Connection
DATABASE_URL=postgresql://toovydrop_user:your_password@your-postgres-host:5432/toovydrop

# Redis Connection  
REDIS_URL=redis://:your_redis_password@your-redis-host:6379
REDIS_PASSWORD=your_redis_password

# =============================================================================
# APPLICATION CONFIGURATION
# =============================================================================

# Domain and API URLs
SERVICE_FQDN_TOOVYDROP=https://yourdomain.com
SERVICE_URL_BACKEND=https://yourdomain.com/api
SERVICE_URL_BACKEND_WS=wss://yourdomain.com

# JWT Secrets (generate with: openssl rand -base64 48)
JWT_ACCESS_SECRET=your_secure_access_secret_min_32_chars
JWT_REFRESH_SECRET=your_secure_refresh_secret_min_32_chars

# FTP Configuration
FTP_HOST=your-ftp-server.com
FTP_PORT=21
FTP_USER=your_ftp_username
FTP_PASSWORD=your_ftp_password
FTP_SECURE=true

# Security Settings
ENABLE_MALWARE_SCAN=true
LOG_LEVEL=info
```

### Step 3: Database Initialization

#### 3.1 Run Migrations
After first deployment, initialize the database:

```bash
# Access backend container
docker exec -it toovydrop-backend sh

# Run Prisma migrations
npx prisma migrate deploy

# Create admin user
npm run create-admin
```

#### 3.2 Verify Connection
Test database connectivity:

```bash
# Test PostgreSQL connection
docker exec -it toovydrop-backend sh
npx prisma db pull

# Test Redis connection
redis-cli -h your-redis-host -a your_redis_password ping
```

## Security Configuration

### Database Security Checklist

#### PostgreSQL Security
- [ ] Use strong passwords (min 16 characters)
- [ ] Enable SSL/TLS connections
- [ ] Configure firewall rules (only allow app server access)
- [ ] Regular security updates
- [ ] Enable connection logging
- [ ] Set appropriate `max_connections`

#### Redis Security
- [ ] Enable password authentication
- [ ] Disable dangerous commands (`FLUSHALL`, `CONFIG`, etc.)
- [ ] Configure firewall rules
- [ ] Use SSL/TLS if supported
- [ ] Regular security updates

### Network Security

```bash
# Example firewall rules (iptables)
# Allow app server to access PostgreSQL
iptables -A INPUT -p tcp -s APP_SERVER_IP --dport 5432 -j ACCEPT

# Allow app server to access Redis
iptables -A INPUT -p tcp -s APP_SERVER_IP --dport 6379 -j ACCEPT

# Block all other access
iptables -A INPUT -p tcp --dport 5432 -j DROP
iptables -A INPUT -p tcp --dport 6379 -j DROP
```

## Monitoring and Maintenance

### Database Monitoring

#### PostgreSQL Monitoring
```sql
-- Monitor active connections
SELECT count(*) FROM pg_stat_activity;

-- Check database size
SELECT pg_size_pretty(pg_database_size('toovydrop'));

-- Monitor slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC LIMIT 10;
```

#### Redis Monitoring
```bash
# Monitor Redis info
redis-cli -h your-redis-host -a your_password info

# Check memory usage
redis-cli -h your-redis-host -a your_password info memory

# Monitor connected clients
redis-cli -h your-redis-host -a your_password info clients
```

### Backup Strategy

#### PostgreSQL Backups
```bash
# Daily automated backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -h your-postgres-host -U toovydrop_user toovydrop > backup_$DATE.sql

# Upload to S3 or similar storage
aws s3 cp backup_$DATE.sql s3://your-backup-bucket/postgres/
```

#### Redis Backups
```bash
# Redis backup (if persistence is enabled)
redis-cli -h your-redis-host -a your_password BGSAVE

# Copy RDB file
scp user@redis-host:/var/lib/redis/dump.rdb backup_$(date +%Y%m%d).rdb
```

## Troubleshooting

### Common Connection Issues

#### PostgreSQL Connection Problems
```bash
# Test connection from app server
telnet your-postgres-host 5432

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-15-main.log

# Verify user permissions
sudo -u postgres psql -c "\du"
```

#### Redis Connection Problems
```bash
# Test connection
redis-cli -h your-redis-host -p 6379 -a your_password ping

# Check Redis logs
sudo tail -f /var/log/redis/redis-server.log

# Monitor Redis commands
redis-cli -h your-redis-host -a your_password monitor
```

### Performance Optimization

#### PostgreSQL Optimization
```sql
-- Create indexes for better performance
CREATE INDEX CONCURRENTLY idx_files_channel_id ON files(channel_id);
CREATE INDEX CONCURRENTLY idx_files_created_at ON files(created_at);
CREATE INDEX CONCURRENTLY idx_audit_logs_timestamp ON audit_logs(timestamp);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM files WHERE channel_id = 'channel_id';
```

#### Redis Optimization
```bash
# Configure Redis memory policy
redis-cli -h your-redis-host -a your_password CONFIG SET maxmemory-policy allkeys-lru

# Set appropriate max memory
redis-cli -h your-redis-host -a your_password CONFIG SET maxmemory 2gb
```

## Migration from Containerized Databases

If migrating from containerized to external databases:

### 1. Backup Existing Data
```bash
# Backup PostgreSQL
docker exec toovydrop-postgres pg_dump -U postgres toovydrop > backup.sql

# Backup Redis (if needed)
docker exec toovydrop-redis redis-cli SAVE
docker cp toovydrop-redis:/data/dump.rdb redis_backup.rdb
```

### 2. Restore to External Database
```bash
# Restore PostgreSQL
psql -h your-new-postgres-host -U toovydrop_user toovydrop < backup.sql

# Restore Redis (if needed)
redis-cli -h your-new-redis-host -a your_password --rdb redis_backup.rdb
```

### 3. Update Configuration
```bash
# Update environment variables
DATABASE_URL=postgresql://user:pass@new-host:5432/toovydrop
REDIS_URL=redis://:pass@new-redis-host:6379

# Deploy with new configuration
```

---

**External Database Setup Complete!** 🗄️

Your ChannelDrop application will now use dedicated, scalable database services for better performance and reliability.