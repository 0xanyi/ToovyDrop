# ChannelDrop Production Deployment Checklist

## 🚀 Pre-Deployment Requirements

### 1. Environment Configuration ✅
- [ ] Update `.env.production` with your actual values:
  - [ ] Database credentials
  - [ ] Redis password
  - [ ] JWT secrets (generate new secure ones)
  - [ ] FTP server details
  - [ ] Domain names for Coolify
  - [ ] CORS allowed origins

### 2. Security Hardening ✅
- [x] JWT authentication implemented
- [x] Rate limiting configured
- [x] CSRF protection enabled
- [x] Input validation with Joi
- [x] Security headers with Helmet
- [ ] SSL/TLS certificates (handled by Coolify)
- [ ] Update default passwords

### 3. Database Setup ✅
- [x] Prisma schema ready
- [x] Migrations configured
- [ ] Run initial migration in production
- [ ] Create admin user

### 4. FTP Server Configuration
- [ ] FTP server accessible from production environment
- [ ] FTP credentials configured
- [ ] Directory structure created
- [ ] Permissions set correctly

## 🔧 Deployment Steps

### Step 1: Fix Test Issues
```bash
cd backend
npm test
```
All tests should pass before deployment.

### Step 2: Build and Test Locally
```bash
# Build backend
cd backend
npm run build

# Build frontend
cd ../frontend
npm run build

# Test with Docker Compose
docker-compose -f docker-compose.yml up --build
```

### Step 3: Deploy to Coolify
1. Push code to your Git repository
2. Create new project in Coolify
3. Use `docker-compose.coolify.yml` configuration
4. Set environment variables in Coolify dashboard
5. Deploy and monitor logs

### Step 4: Post-Deployment Verification
- [ ] Health check endpoint responds: `/api/health`
- [ ] Database connection working
- [ ] Redis connection working
- [ ] FTP connection working
- [ ] File upload functionality
- [ ] Admin interface accessible
- [ ] SSL certificate active

## 🛠 Production Maintenance

### Regular Tasks
- [ ] Monitor application logs
- [ ] Check disk space (uploads directory)
- [ ] Verify backup processes
- [ ] Update dependencies monthly
- [ ] Review security logs

### Monitoring Endpoints
- Health: `GET /api/health`
- Performance: `GET /api/performance/metrics`
- System: `GET /api/admin/system/health`

## 🚨 Emergency Procedures

### Rollback Process
1. Revert to previous Docker image
2. Restore database backup if needed
3. Clear Redis cache
4. Restart services

### Backup Strategy
- Database: Automated daily backups
- Files: FTP server backups
- Application logs: Retained for 30 days

## 📞 Support Contacts
- System Administrator: [Your Contact]
- FTP Server Admin: [FTP Admin Contact]
- Domain/SSL Provider: [Provider Contact]