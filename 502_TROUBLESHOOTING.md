# 502 Bad Gateway - Backend Connectivity Issue

## Status: CORS Fixed ✅ | Server Issue ⚠️

The debug endpoint shows CORS is working perfectly:
- ✅ Environment variables correctly parsed
- ✅ Frontend domain `https://drop.lweurope.org` is allowed
- ✅ CORS headers being set properly

**The 502 error is a backend connectivity issue**, not a CORS problem.

## Root Cause Analysis

502 Bad Gateway means your reverse proxy (nginx/cloudflare/coolify) can't reach the backend container.

## Immediate Diagnostic Steps

### 1. Check Backend Container Status in Coolify
```
✅ Is the backend container running?
✅ Is it listening on port 3000?
✅ Are there any error logs?
```

### 2. Test Backend Health Directly
```bash
# Test backend container directly (bypass reverse proxy)
curl http://localhost:3000/api/health

# Or test internal service URL in Coolify
curl http://backend-container-name:3000/api/health
```

### 3. Check Container Logs in Coolify
Look for:
- **Port binding errors**: "EADDRINUSE: address already in use"
- **Database connection errors**: Cannot connect to PostgreSQL
- **Redis connection errors**: Cannot connect to Redis
- **Application crashes**: Unhandled exceptions

## Common Coolify Backend Issues & Solutions

### Issue 1: Backend Container Won't Start
**Symptoms**: Container shows as "stopped" or "error" state
**Solutions**:
- Check DATABASE_URL format (should be valid PostgreSQL connection)
- Verify Redis URL format
- Ensure all required environment variables are set

### Issue 2: Backend Starts but Crashes
**Symptoms**: Container starts then immediately stops
**Solutions**:
- Check application logs for startup errors
- Verify database migrations have run
- Ensure PostgreSQL and Redis services are available

### Issue 3: Backend Runs but Port Not Accessible
**Symptoms**: Container running but 502 errors
**Solutions**:
- Verify PORT=3000 is set correctly
- Check if container is exposing port 3000
- Verify reverse proxy routing configuration

## Quick Fix Commands

### Check Backend Health
```bash
# Access Coolify → Your Project → Services → Backend → Logs
# Look for: "Server running on port 3000"
```

### Restart Backend Container
```
Coolify Dashboard → Your Project → Services → Backend → Actions → Restart
```

### Verify Database Connection
```bash
# Check if backend can connect to database
# Look for: "Connected to database" in logs
```

## Expected Backend Startup Log
```
Connected to Redis
Connected to database  
Server running on port 3000
WebSocket server ready
Maintenance service started
Guest link cleanup service started
```

## If Database/Redis Issues

**Database Connection Error**:
- Verify DATABASE_URL format: `postgresql://user:pass@host:port/db`
- Ensure PostgreSQL service is running in Coolify

**Redis Connection Error**:
- Verify REDIS_URL format: `redis://:password@host:port`
- Ensure Redis service is running in Coolify

## Next Steps

1. **Check Coolify backend logs** for startup errors
2. **Restart backend container** if needed
3. **Verify database/Redis connectivity** 
4. **Test direct backend health endpoint**
5. **Contact support** if container keeps crashing

The CORS part is 100% fixed - this is purely a backend server connectivity issue.
