# Database Migration Required - Fix Missing System Settings Table

## Issue Identified ✅
Backend is running perfectly, but the `system_settings` table is missing from the production database.

## Root Cause
Database migrations haven't been applied to the production database, so the `SystemSetting` model table doesn't exist.

## Solution: Run Database Migrations

### Option 1: Apply Migrations via Coolify (Recommended)
1. **Access your Coolify project**
2. **Find your backend container/shell**
3. **Run the migration command:**
   ```bash
   npm run prisma:migrate
   ```

### Option 2: Manual Migration via Prisma
```bash
# Connect to your backend container and run:
npx prisma db push

# Or directly:
npm run prisma:push
```

### Option 3: Create Table Manually (Quick Fix)
If migrations fail, you can create the table directly:
```sql
CREATE TABLE "public"."system_settings" (
  "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
  "key" varchar(100) NOT NULL UNIQUE,
  "value" text,
  "updated_at" timestamp(3) NOT NULL,
  "updated_by" uuid,
  CONSTRAINT "system_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Create index
CREATE INDEX IF NOT EXISTS "system_settings_key_idx" ON "public"."system_settings"("key");
```

## Verification Steps

### After Running Migrations:
1. **Check that table exists:**
   ```sql
   SELECT * FROM system_settings;
   ```

2. **Test the login background endpoint:**
   ```bash
   curl https://drop-api.toovy.tech/api/settings/login-background
   ```

3. **Should return:**
   ```json
   {
     "success": true,
     "data": null
   }
   ```

## Expected Outcome

**Before Fix:**
```
500 Internal Server Error
Table 'system_settings' does not exist
```

**After Fix:**
```
200 OK
{
  "success": true,
  "data": null
}
```

## Quick Test Command

Test if the migration worked:
```bash
curl -H "Origin: https://drop.lweurope.org" \
     https://drop-api.toovy.tech/api/settings/login-background
```

Should return `200 OK` instead of `500 Internal Server Error`.

## Why This Happened

1. The `SystemSetting` model was added to the schema
2. But the migration to create the table in production wasn't run
3. When the app tries to query `system_settings`, it fails

This is a common issue when deploying new features that modify the database schema.

## Next Steps

1. **Run migrations** in your Coolify backend container
2. **Test the login background endpoint**
3. **Verify the table was created**
4. **Try uploading a login background image**

Once the migrations are applied, the CORS fix + backend connectivity will work perfectly!
