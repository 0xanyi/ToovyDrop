# Auto Migration Setup for Future Deployments

## ✅ Completed: Auto Migration Configuration

### Changes Made

**Backend package.json updated with new scripts:**

```json
{
  "scripts": {
    "start": "npm run prisma:push && node dist/server.js",
    "start:dev": "npm run prisma:push && npm run dev", 
    "prod:start": "npm run build && npm run start",
    "prisma:deploy": "prisma migrate deploy"
  }
}
```

### How Auto Migration Works

1. **`npm start`** - Automatically runs `prisma:push` before starting the server
2. **`npm run start:dev`** - Automatically runs `prisma:push` before starting development server
3. **`npm run prod:start`** - Builds then runs migrations then starts server

### Deployment Commands for Different Environments

**Development:**
```bash
npm run start:dev
```

**Production:**
```bash
npm run prod:start
```

**Standard Start (with auto migration):**
```bash
npm start
```

### For Coolify Deployment

In your Coolify environment, ensure the backend service uses:
```bash
npm run prod:start
```

This will:
1. ✅ Build TypeScript to JavaScript
2. ✅ Run database migrations (`prisma push`)
3. ✅ Start the server

### Benefits

- **No manual migration steps** required during deployment
- **Database schema stays in sync** with code changes
- **Safer deployments** - migrations run automatically
- **Consistent environment setup** across all deployments

### Rollback Strategy

If migrations cause issues:
1. **Database Backup** - Always backup before deployment
2. **Manual Rollback** - Use `prisma migrate reset` if needed
3. **Previous Version** - Deploy previous working version

### Monitoring

Watch backend logs for:
```
✅ Database schema updated successfully
✅ Connected to database
Server running on port 3000
```

This setup ensures your database schema automatically stays current with your application code!
