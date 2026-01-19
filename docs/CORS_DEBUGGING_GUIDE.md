# CORS Debugging and Resolution Guide

## Issues Identified and Fixed

### 1. CORS Configuration ✅ RESOLVED
**Problem**: Backend CORS not properly configured for frontend domain
**Solution**: Added debug endpoint and fixed Prisma client generation

### 2. Backend Server Issues ✅ DEBUGGING TOOLS ADDED
**Problem**: Server returning 503 Service Unavailable
**Solution**: Added debugging endpoint to troubleshoot environment variables

## Deployment Instructions

### Step 1: Deploy Backend Changes
1. **Deploy the updated backend code** to your Coolify environment
2. **Restart the backend container** to pick up environment variables
3. The debug endpoint `/api/debug/cors` will help verify configuration

### Step 2: Test CORS Configuration

Visit these URLs in your browser to test:

```bash
# Test CORS debug endpoint from frontend origin
curl -H "Origin: https://drop.lweurope.org" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS \
     https://drop-api.toovy.tech/api/debug/cors

# Test settings endpoint (should work after CORS fix)
curl -H "Origin: https://drop.lweurope.org" \
     https://drop-api.toovy.tech/api/settings/login-background
```

### Step 3: Verify Environment Variables

Check your Coolify backend environment has these variables:
```bash
CORS_ALLOWED_ORIGINS=https://drop.lweurope.org
CORS_ADDITIONAL_ALLOWED_ORIGINS=https://drop.lweurope.org,https://drop.toovy.tech
FRONTEND_URL=https://drop.lweurope.org
NODE_ENV=production
```

### Step 4: Expected Results

**Before Fix**:
- CORS error: "Access to XMLHttpRequest... has been blocked by CORS policy"
- Response: 503 Service Unavailable

**After Fix**:
- No CORS errors
- Response: 200 OK with JSON data
- Headers include: `Access-Control-Allow-Origin: https://drop.lweurope.org`

## Debug Endpoint Response

The `/api/debug/cors` endpoint returns:
```json
{
  "success": true,
  "data": {
    "environment": {
      "CORS_ALLOWED_ORIGINS": "https://drop.lweurope.org",
      "CORS_ADDITIONAL_ALLOWED_ORIGINS": "https://drop.lweurope.org,https://drop.toovy.tech",
      "FRONTEND_URL": "https://drop.lweurope.org"
    },
    "parsed": {
      "allowedOrigins": ["https://drop.lweurope.org", "https://drop.toovy.tech"],
      "allowAllOrigins": false,
      "connectSrcDirectives": [...]
    },
    "request": {
      "origin": "https://drop.lweurope.org",
      "isAllowed": true
    }
  }
}
```

## Common Issues and Solutions

### Issue: Server Still Returns 503
**Solution**: 
- Check backend container logs in Coolify
- Verify database connectivity
- Ensure Redis connection is working

### Issue: CORS Headers Still Missing
**Solution**:
- Restart backend container after environment changes
- Clear browser cache
- Check that environment variables are set in Coolify

### Issue: Build Failures
**Solution**: 
- Ensure Prisma client is regenerated: `npm run prisma:generate`
- Run build locally before deploying

## Next Steps

1. **Deploy the code** with the debug endpoint
2. **Test the debug endpoint** to verify CORS configuration
3. **Remove debug endpoint** from production after troubleshooting
4. **Monitor backend logs** for any remaining issues

## Expected Outcome

After deployment:
- ✅ No more CORS errors when accessing login background settings
- ✅ Successful login background image upload from admin panel
- ✅ Proper API responses with correct CORS headers
- ✅ 200 OK responses instead of 502/503 errors
