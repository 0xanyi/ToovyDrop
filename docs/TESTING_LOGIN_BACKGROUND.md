# Testing Login Background Customization

## Manual Testing Checklist

### Backend API Tests

#### 1. Test Public Endpoint (No Auth Required)

```bash
# Get current login background (should return null initially)
curl -X GET http://localhost:3000/api/settings/login-background

# Expected Response:
# {
#   "success": true,
#   "data": null
# }
```

#### 2. Test Upload Without Authentication (Should Fail)

```bash
# Try to upload without token
curl -X POST http://localhost:3000/api/settings/login-background \
  -F "image=@/path/to/test-image.jpg"

# Expected: 401 Unauthorized
```

#### 3. Test Upload With Authentication (Admin User)

```bash
# First, login as admin to get token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "AdminPassword123!"
  }'

# Copy the accessToken from response, then:
export ADMIN_TOKEN="<paste-token-here>"

# Upload background image
curl -X POST http://localhost:3000/api/settings/login-background \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -F "image=@/path/to/test-image.jpg"

# Expected Response:
# {
#   "success": true,
#   "data": {
#     "filename": "login-bg-1234567890-987654321.jpg",
#     "message": "Login background image uploaded successfully"
#   }
# }
```

#### 4. Test Retrieving Uploaded Background

```bash
# Get background metadata
curl -X GET http://localhost:3000/api/settings/login-background

# Expected Response:
# {
#   "success": true,
#   "data": {
#     "filename": "login-bg-1234567890-987654321.jpg",
#     "url": "/api/settings/login-background/image"
#   }
# }

# Access the actual image
curl -X GET http://localhost:3000/api/settings/login-background/image \
  --output test-background.jpg

# Should download the uploaded image
```

#### 5. Test File Validation

```bash
# Test with invalid file type (.txt)
echo "test" > test.txt
curl -X POST http://localhost:3000/api/settings/login-background \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -F "image=@test.txt"

# Expected: 400 Bad Request with error about invalid file type

# Test with oversized file (>10MB)
# Create a large file
dd if=/dev/zero of=large.jpg bs=1M count=11
curl -X POST http://localhost:3000/api/settings/login-background \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -F "image=@large.jpg"

# Expected: 400 Bad Request with error about file size
```

#### 6. Test Replacing Background

```bash
# Upload a new background (should replace the old one)
curl -X POST http://localhost:3000/api/settings/login-background \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -F "image=@/path/to/another-image.jpg"

# Expected: Success response with new filename
# Old file should be automatically deleted from uploads/system/
```

#### 7. Test Delete Background

```bash
# Delete the background
curl -X DELETE http://localhost:3000/api/settings/login-background \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Expected Response:
# {
#   "success": true,
#   "data": {
#     "message": "Login background image deleted successfully"
#   }
# }

# Verify deletion
curl -X GET http://localhost:3000/api/settings/login-background

# Expected: null data
```

### Frontend UI Tests

#### 1. Admin Settings Page

1. **Access Admin Settings**
   - Login as admin user
   - Navigate to `/admin/settings`
   - Verify "Login Page Background" section is visible

2. **Upload Background**
   - Click "Upload Background" button
   - Select a valid image (JPEG, PNG, or WebP, < 10MB)
   - Verify upload progress
   - Verify preview appears after upload
   - Check for success message

3. **Validate File Requirements**
   - Try uploading invalid file type (e.g., .txt, .pdf)
   - Verify error message appears
   - Try uploading oversized file (> 10MB)
   - Verify error message appears

4. **Preview Functionality**
   - Verify current background displays correctly
   - Verify preview shows overlay effect similar to login page
   - Check responsive behavior on different screen sizes

5. **Replace Background**
   - With existing background, click "Replace Background"
   - Select new image
   - Verify old background is replaced
   - Verify preview updates

6. **Remove Background**
   - Click "Remove Background" button
   - Confirm deletion in dialog
   - Verify background removed
   - Verify preview shows default gradient
   - Check success message

#### 2. Login Page

1. **Default State (No Custom Background)**
   - Open `/login` in incognito window
   - Verify default gradient background appears
   - Verify decorative blur elements visible
   - Verify login form is readable

2. **Custom Background Display**
   - Upload background via admin settings
   - Open `/login` in incognito window
   - Verify custom background loads
   - Verify dark overlay applied for readability
   - Verify login form remains readable
   - Test on different screen sizes

3. **Fallback Behavior**
   - Delete background via admin settings
   - Refresh `/login` page
   - Verify page reverts to default gradient
   - Verify no console errors

4. **Performance**
   - Check Network tab for background image load time
   - Verify image is cached (24 hours)
   - Verify subsequent page loads use cache

### Database Verification

```sql
-- Check if SystemSetting table exists
SELECT * FROM system_settings;

-- After upload, verify entry
SELECT * FROM system_settings WHERE key = 'login_background_image';

-- Expected result (when background exists):
-- id: <uuid>
-- key: 'login_background_image'
-- value: 'login-bg-<timestamp>-<random>.<ext>'
-- updated_at: <timestamp>
-- updated_by: <admin-user-id>
```

### File System Verification

```bash
# Check uploads directory structure
ls -la backend/uploads/system/

# After upload, verify file exists
ls -la backend/uploads/system/login-bg-*

# After delete, verify file removed
# (Should only see .gitkeep file)
```

### Audit Log Verification

```bash
# Get recent audit logs
curl -X GET "http://localhost:3000/api/admin/audit-logs?limit=10" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Look for entries with actions:
# - UPLOAD_LOGIN_BACKGROUND
# - DELETE_LOGIN_BACKGROUND

# Verify metadata includes:
# - filename
# - size
# - mimetype (for uploads)
```

## Automated Test Execution

```bash
# Run backend tests
cd backend
npm test -- settings.test.ts

# Expected: All tests pass
```

## Known Issues / Expected Behavior

1. **JWT Token Expiration**
   - Admin token expires after 1 hour
   - Need to re-login if tests span long time

2. **Cache Headers**
   - Background image cached for 24 hours
   - Hard refresh (Ctrl+Shift+R) needed to see immediate changes
   - Or use cache-busting query param: `?t=${timestamp}`

3. **File Cleanup**
   - Old background automatically deleted when new one uploaded
   - Manual cleanup may be needed if operations fail mid-process

4. **Browser Caching**
   - Clear browser cache when testing multiple uploads
   - Use incognito/private mode for clean tests

## Troubleshooting

### Issue: Image Not Displaying on Login Page

**Check:**
- Browser console for errors
- Network tab for 404 or 500 errors
- Database for system_setting entry
- File system for actual image file
- File permissions on uploads directory

**Solution:**
```bash
# Fix file permissions
chmod 755 backend/uploads/system
chmod 644 backend/uploads/system/*
```

### Issue: Upload Fails With "File Too Large"

**Check:**
- File size (must be < 10MB)
- Server body size limits in app.ts

**Solution:**
- Optimize/compress image before upload
- Use image compression tools (TinyPNG, ImageOptim, etc.)

### Issue: "Access Token Required" Error

**Check:**
- Token in Authorization header
- Token not expired
- User has ADMIN role

**Solution:**
- Re-login to get fresh token
- Verify admin user credentials

## Success Criteria

✅ All backend API tests pass
✅ All frontend UI tests complete successfully
✅ Database entries created/updated/deleted correctly
✅ Files uploaded and cleaned up properly
✅ Audit logs recorded for all operations
✅ Login page displays custom background correctly
✅ Performance acceptable (< 2s load time for typical images)
✅ No console errors or warnings
✅ Proper error handling for edge cases
✅ Responsive design works on mobile/tablet/desktop
