# ChannelDrop - Coolify Deployment Guide

This guide provides step-by-step instructions for deploying ChannelDrop to Coolify using individual Docker applications for better management and diagnostics.

## Prerequisites

- [ ] Coolify instance running and accessible
- [ ] Domain names configured and pointing to your Coolify server
- [ ] Git repository accessible from Coolify
- [ ] FTP server details (external)
- [ ] SSL certificates configured (automatic with Coolify + Let's Encrypt)

## Deployment Architecture

ChannelDrop is deployed as **separate applications** in Coolify for easier management:
- **Frontend Application**: React + Vite (Nginx) - `frontend/Dockerfile.production`
- **Backend Application**: Node.js + Express API - `backend/Dockerfile.production`

Plus external database services:
- **PostgreSQL**: Primary database (external service or Coolify managed)
- **Dragonfly**: Cache and session store (Coolify managed service - Redis alternative)

> **📋 Database Services**: This guide covers deployment with individual Docker applications and external databases.
> PostgreSQL can be external or Coolify-managed. Dragonfly (Redis alternative) is deployed as a Coolify service.
> For detailed external database setup, see `docs/external-database-setup.md`

## Step 1: Prepare Your Repository

### 1.1 Ensure Deployment Files Are Present

Verify these files exist in your repository:
```
├── backend/Dockerfile.production   ✅ (Backend application)
├── frontend/Dockerfile.production  ✅ (Frontend application)  
├── docs/external-database-setup.md ✅ (Database setup guide)
└── README.md                       ✅ (Project documentation)
```

### 1.2 Commit and Push Changes

```bash
git add .
git commit -m "feat: prepare individual Docker deployments for Coolify"
git push origin main
```

## Step 2: Create New Project in Coolify

### 2.1 Access Coolify Dashboard
1. Navigate to your Coolify instance
2. Login with your credentials
3. Click **"New Project"**

### 2.2 Project Configuration
```
Project Name: toovydrop
Description: Web-based file transfer platform with individual services
```

## Step 3: Deploy Database Services First

### 3.1 Add Dragonfly Service
1. In your project, click **"New Resource"**
2. Select **"Service"** → **"Dragonfly"**
3. Configure:
   ```
   Service Name: toovydrop-dragonfly
   Password: [Generate secure password]
   Port: 6379 (default)
   ```
4. Click **"Deploy"**
5. Note the internal connection details for later use

### 3.2 PostgreSQL Database
**Option A: Coolify Managed**
1. Click **"New Resource"** → **"Service"** → **"PostgreSQL"**
2. Configure:
   ```
   Service Name: toovydrop-postgres
   Database: toovydrop
   Username: toovydrop
   Password: [Generate secure password]
   ```

**Option B: External Database**
- Use your existing PostgreSQL instance
- Ensure it's accessible from Coolify server

## Step 4: Deploy Backend Application

### 4.1 Create Backend Application
1. Click **"New Resource"** → **"Application"**
2. Select **"Docker Image"** → **"From Git Repository"**

### 4.2 Backend Configuration
```
Application Name: toovydrop-backend
Repository URL: https://github.com/yourusername/ftp-manager
Branch: main
Build Pack: Dockerfile
Dockerfile Location: ./backend/Dockerfile.production
Base Directory: backend/
```

### 4.3 Backend Environment Variables

**Database Configuration:**
```bash
DATABASE_URL=postgresql://username:password@host:5432/toovydrop
# Use internal Coolify URLs if using managed services:
# DATABASE_URL=postgresql://toovydrop:password@toovydrop-postgres:5432/toovydrop
```

**Dragonfly Configuration:**
```bash
REDIS_URL=redis://:password@toovydrop-dragonfly:6379/0
REDIS_PASSWORD=your_dragonfly_password
```

**JWT Secrets (Generate securely):**
```bash
# Generate with: openssl rand -base64 48
JWT_ACCESS_SECRET=your_secure_access_secret_min_32_chars
JWT_REFRESH_SECRET=your_secure_refresh_secret_min_32_chars
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
```

**FTP Server Details:**
```bash
FTP_HOST=your-ftp-server.com
FTP_PORT=21
FTP_USER=your_ftp_username
FTP_PASSWORD=your_ftp_password
FTP_SECURE=true
FTP_REJECT_UNAUTHORIZED=true
```

**Application Settings:**
```bash
PORT=3000
NODE_ENV=production
MAX_FILE_SIZE=5368709120
CHUNK_SIZE=5242880
ENABLE_MALWARE_SCAN=true
CORS_ALLOWED_ORIGINS=https://yourdomain.com
CSP_ADDITIONAL_CONNECT_SRC=https://api.yourdomain.com,wss://api.yourdomain.com
LOG_LEVEL=info
LOG_FILE=/app/logs/app.log
```

> **Tip:** For multiple frontend domains (e.g., admin portals), provide a
> comma-separated list in `CORS_ALLOWED_ORIGINS` and mirror the API/WebSocket
> endpoints in `CSP_ADDITIONAL_CONNECT_SRC`.

### 4.4 Backend Domain Configuration
1. Go to **"Domains"** tab in backend application
2. Add your API domain: `api.yourdomain.com`
3. Enable **"Generate SSL Certificate"** (Let's Encrypt)

## Step 5: Deploy Frontend Application

### 5.1 Create Frontend Application
1. Click **"New Resource"** → **"Application"**
2. Select **"Docker Image"** → **"From Git Repository"**

### 5.2 Frontend Configuration
```
Application Name: toovydrop-frontend
Repository URL: https://github.com/yourusername/ftp-manager
Branch: main
Build Pack: Dockerfile
Dockerfile Location: ./frontend/Dockerfile.production
Base Directory: frontend/
```

### 5.3 Frontend Environment Variables (Build-time)

**API Configuration (Required for build):**
```bash
VITE_API_URL=https://api.yourdomain.com
VITE_WS_URL=wss://api.yourdomain.com
```

> **Important**: These must be set as **"Available at Buildtime"** in Coolify since Vite needs them during the build process.

### 5.4 Frontend Domain Configuration
1. Go to **"Domains"** tab in frontend application
2. Add your frontend domain: `yourdomain.com`
3. Enable **"Generate SSL Certificate"** (Let's Encrypt)

### 5.5 Frontend Network Configuration
1. Go to **"Network"** tab
2. Set **"Ports Exposes"** to: `80`
3. Save configuration

## Step 6: DNS Configuration

Configure your domain's DNS records:
```
A    yourdomain.com        YOUR_SERVER_IP
A    api.yourdomain.com    YOUR_SERVER_IP
```

## Step 7: Deploy Applications

### 7.1 Deploy Backend First
1. In backend application, click **"Deploy"**
2. Monitor build and deployment logs
3. Wait for healthy status (2-3 minutes)
4. Check logs for successful database migration

### 7.2 Deploy Frontend
1. In frontend application, click **"Deploy"**
2. Monitor build process (Vite build with environment variables)
3. Wait for healthy status (1-2 minutes)

### 7.3 Service Health Check
Verify all services are running:
- ✅ **toovydrop-dragonfly** (Dragonfly cache)
- ✅ **toovydrop-postgres** (PostgreSQL database - if managed)
- ✅ **toovydrop-backend** (Node.js API)
- ✅ **toovydrop-frontend** (Nginx + React)

## Step 8: Post-Deployment Configuration

### 8.1 Database Migrations (Automatic)
Database migrations now run automatically during backend deployment. The backend container will:
1. Run `npx prisma migrate deploy` on startup
2. Apply any pending migrations safely
3. Start the application server

> **Note**: If you need to run migrations manually, you can still access the backend container:
> ```bash
> # Via Coolify terminal
> docker exec -it toovydrop-backend sh
> npx prisma migrate deploy
> ```

### 8.2 Create Admin User
```bash
# In backend container terminal
node dist/scripts/createAdmin.js
```

### 8.3 Verify Application
1. Navigate to `https://yourdomain.com`
2. Test login with admin credentials:
   - Email: `admin@example.com`
   - Password: `AdminPassword123!`

## Step 9: Application Management

### 9.1 Individual Service Management
Each service can be managed independently:

**Backend Application:**
- View logs, metrics, and performance
- Restart, rebuild, or redeploy independently
- Monitor API health and database connections
- Scale resources as needed

**Frontend Application:**
- Monitor nginx performance
- Update frontend without affecting backend
- Independent SSL certificate management
- CDN-ready static asset serving

**Database Services:**
- Monitor Dragonfly cache hit rates
- PostgreSQL query performance
- Independent backup and scaling

### 9.2 Volume Mounts
Coolify automatically creates persistent volumes for backend:
- `backend_uploads`: File uploads storage
- `backend_logs`: Application logs storage

Database storage is managed by respective database services.

## Step 10: Monitoring and Maintenance

### 10.1 Health Monitoring
Coolify automatically monitors each application:
- Individual service health checks
- Resource usage per application
- SSL certificate expiry for each domain
- Application-specific metrics

### 10.2 Log Access
Access logs for each service independently:
- **Backend logs**: API requests, database operations, file uploads
- **Frontend logs**: Nginx access logs, static file serving
- **Dragonfly logs**: Cache operations and performance
- **PostgreSQL logs**: Database queries and performance (if managed)

### 10.3 Backup Strategy
Configure backups per service:
- **Database**: PostgreSQL dumps (automated in Coolify)
- **Files**: Backend upload directory snapshots
- **Configuration**: Environment variables export per application
- **Dragonfly**: Cache data (optional, as it's regenerated)

## Troubleshooting

### Common Issues

**1. Frontend Bad Gateway (502)**
```bash
# Check frontend port configuration
# Ensure "Ports Exposes" is set to 80 in frontend network settings
```

**2. Backend API Connection Issues**
```bash
# Check backend health
curl -I https://api.yourdomain.com/api/health
# Check backend logs in Coolify dashboard
```

**3. Dragonfly Connection Errors**
```bash
# Verify Dragonfly service is running
# Check REDIS_URL format in backend environment variables
# Format: redis://:password@toovydrop-dragonfly:6379/0
```

**4. Database Connection Errors**
```bash
# Check PostgreSQL service health (if managed)
# Verify DATABASE_URL format in backend environment
# Test connection from backend container
```

**5. File Upload Issues**
```bash
# Check backend upload directory permissions
docker exec -it toovydrop-backend sh
ls -la /app/uploads
```

**6. Build-time Environment Variables**
```bash
# Ensure frontend VITE_ variables are set as "Available at Buildtime"
# Check frontend build logs for environment variable errors
```

### Performance Optimization

**1. Resource Limits per Application**
Set appropriate limits in Coolify for each service:
```
Frontend: 512MB RAM, 0.5 CPU
Backend: 1GB RAM, 1 CPU  
PostgreSQL: 1GB RAM, 1 CPU (if managed)
Dragonfly: 256MB RAM, 0.25 CPU
```

**2. Dragonfly Optimization**
```bash
# Monitor cache hit rates in Dragonfly logs
# Adjust memory limits based on usage patterns
# Dragonfly auto-scales better than Redis for high concurrency
```

## Security Checklist

- [ ] SSL certificates active for both domains (`yourdomain.com` and `api.yourdomain.com`)
- [ ] Strong JWT secrets (min 32 characters) generated securely
- [ ] Database passwords are secure (managed by Coolify or external service)
- [ ] Dragonfly password is secure and properly configured
- [ ] FTP credentials are secure and properly encrypted
- [ ] Rate limiting enabled in backend application
- [ ] CSRF protection active
- [ ] File upload validation working
- [ ] Malware scanning enabled (if configured)
- [ ] Proper network isolation between services

## Production Readiness

### Final Verification Steps
1. [ ] Frontend application loads correctly at `https://yourdomain.com`
2. [ ] Backend API responds at `https://api.yourdomain.com/api/health`
3. [ ] User registration/login works end-to-end
4. [ ] File upload functions properly with real-time progress
5. [ ] Channel management works through admin interface
6. [ ] Admin panel accessible and functional
7. [ ] Dragonfly cache is working (check backend logs)
8. [ ] Database migrations applied successfully
9. [ ] SSL certificates valid for both domains
10. [ ] Backup strategy implemented for all services
11. [ ] Monitoring alerts configured in Coolify

## Deployment Management

### Updating Applications

**Backend Updates:**
```bash
1. Push changes to Git repository
2. Coolify auto-deploys backend (if enabled)
3. Automatic database migrations run on startup
4. Monitor deployment in backend application logs
```

**Frontend Updates:**
```bash
1. Push changes to Git repository
2. Coolify auto-deploys frontend (if enabled)
3. Vite builds with environment variables
4. New static files served immediately
```

**Database Updates:**
- Migrations run automatically with backend deployment
- For manual operations, use backend container terminal
- Coolify managed PostgreSQL can be upgraded via dashboard

**Cache Updates:**
- Dragonfly requires no manual intervention
- Cache data regenerates automatically
- Memory usage monitored in Coolify

### Scaling Individual Services

**Backend Scaling:**
- Increase CPU/RAM in Coolify backend application settings
- Monitor API response times and database connections
- Consider horizontal scaling for high traffic

**Frontend Scaling:**
- Nginx handles high concurrent connections efficiently
- Consider CDN integration for global distribution
- Static assets can be served from multiple locations

**Database Scaling:**
- PostgreSQL can be scaled vertically in Coolify
- Consider read replicas for heavy read workloads
- Monitor query performance and connection pools

**Cache Scaling:**
- Dragonfly auto-scales better than Redis
- Increase memory allocation based on usage patterns
- Monitor cache hit rates and eviction policies

## Support and Updates

### Getting Help
- **Coolify Documentation**: https://coolify.io/docs
- **ChannelDrop Issues**: GitHub repository issues
- **Dragonfly Documentation**: https://www.dragonflydb.io/docs
- **Community Support**: Coolify Discord/Forums

### Why Individual Applications?

**Advantages of this deployment approach:**

1. **Better Isolation**: Each service runs independently
2. **Easier Debugging**: Isolated logs and metrics per service
3. **Independent Scaling**: Scale frontend/backend separately
4. **Simplified Management**: Deploy and manage services individually
5. **Faster Deployments**: Only affected service rebuilds
6. **Better Resource Control**: Fine-tune resources per application
7. **Reduced Complexity**: No docker-compose dependency issues

**Dragonfly vs Redis Benefits:**

1. **Higher Performance**: Multi-threaded architecture
2. **Lower Memory Usage**: More efficient data structures
3. **Drop-in Replacement**: Full Redis protocol compatibility
4. **Better Scaling**: Handles high concurrency naturally
5. **Simpler Operations**: No cluster setup required

---

**Individual Application Deployment Complete!** 🚀

Your ChannelDrop platform is now running with:
- ✅ **Frontend**: `https://yourdomain.com` (Independent Nginx application)
- ✅ **Backend**: `https://api.yourdomain.com` (Independent Node.js application)  
- ✅ **Database**: PostgreSQL (Managed or external)
- ✅ **Cache**: Dragonfly (High-performance Redis alternative)
- ✅ **SSL**: Automatic certificates for both domains
- ✅ **Monitoring**: Individual application metrics and logs
- ✅ **Scaling**: Independent resource management per service

This architecture provides maximum flexibility, easier troubleshooting, and better performance optimization capabilities.
