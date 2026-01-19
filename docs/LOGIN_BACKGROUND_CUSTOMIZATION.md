# Login Background Customization

## Overview

This feature allows administrators to configure a custom background image URL for the login page, enabling different stations to customize their login page branding using external image hosting (CDN, S3, etc.).

## Features

### Backend

1. **Database Storage**
   - System settings are stored in the `system_settings` table
   - Each setting is a key-value pair with metadata
   - Login background image URL is stored under the key `login_background_image`

2. **API Endpoints**

   - `POST /api/settings/login-background` (Admin only)
     - Configure a new login background image URL
     - Accepts: Valid HTTP/HTTPS URL (max 2048 characters)
     - Supports any image hosting service (CDN, S3, GitHub, etc.)
     - Returns: Success message

   - `GET /api/settings/login-background` (Public)
     - Get current login background URL
     - Returns: URL string or null if not set

   - `DELETE /api/settings/login-background` (Admin only)
     - Remove custom background and revert to default
     - Returns: Success message

3. **URL Validation**
   - Validates HTTP/HTTPS URLs only
   - Maximum URL length: 2048 characters
   - Admin-only configuration operations
   - Public read access for display
   - Audit logging for all operations

4. **Recommended Image Hosting**
   - **CDN Services**: CloudFlare, AWS CloudFront, Azure CDN
   - **Storage Services**: AWS S3, Google Cloud Storage, Azure Blob
   - **GitHub Pages**: Host images in repository
   - **Image Services**: Cloudinary, Imgur, Unsplash

### Frontend

2. **Admin Settings Interface** (`/admin/settings`)
   - Located in the System Configuration tab
   - URL input field for background image
   - Live preview of current background
   - Test URL validation button
   - Remove/Reset button
   - URL validation and error feedback
   - Support for any HTTP/HTTPS image URL

3. **Login Page** (`/login`)
   - Automatically fetches custom background URL on load
   - Displays custom image with dark overlay for readability
   - Falls back to default gradient if no custom URL or URL fails to load
   - Responsive and covers entire viewport
   - Handles URL loading errors gracefully

## Usage

### For Administrators

1. **Configuring a Background URL**
   - Navigate to Admin Settings
   - Scroll to "Login Page Background" section
   - Enter a valid HTTP/HTTPS image URL
   - Click "Test URL" to validate the image
   - Save configuration
   - Login page immediately uses the new background

2. **Removing a Background**
   - Navigate to Admin Settings
   - Scroll to "Login Page Background" section
   - Click "Remove Background"
   - Confirm the action
   - Login page reverts to default gradient

### For Users

- Custom background automatically appears on login page (if configured)
- No action required
- Login form remains readable with automatic overlay
- If URL fails to load, defaults to built-in gradient

## Technical Details

### Database Schema

```sql
CREATE TABLE system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_by UUID,
  INDEX idx_key (key)
);
```

### File Upload Configuration

```typescript
// Multer configuration
const storage = multer.diskStorage({
  destination: 'uploads/system/',
  filename: `login-bg-${timestamp}-${random}.${ext}`
});

const fileFilter = {
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  maxSize: 10 * 1024 * 1024 // 10MB
};
```

### API Request Examples

**Configure Background URL**
```bash
curl -X POST http://localhost:3000/api/settings/login-background \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/background.jpg"}'
```

**Get Current Background**
```bash
curl http://localhost:3000/api/settings/login-background
```

**Remove Background**
```bash
curl -X DELETE http://localhost:3000/api/settings/login-background \
  -H "Authorization: Bearer <admin-token>"
```

## Best Practices

### URL Best Practices

1. **URL Format**: Use HTTPS URLs for security
2. **Image Services**: Use reliable image hosting services
3. **CDN Usage**: Host images on CDN for better performance
4. **Backup URLs**: Keep fallback options for important branding
5. **Test URLs**: Verify URLs are accessible before configuring

### Performance Optimization

- Use CDN URLs for faster loading
- Optimize image size (aim for < 1MB)
- Use modern image formats (WebP, AVIF)
- Consider lazy loading for better performance
- Cache images at hosting service level

### Security Considerations

- Only admins can configure background URLs
- URL validation prevents malicious redirects
- All operations are logged in audit trail
- No file uploads = no server storage concerns
- Support for any HTTPS image URL

## Troubleshooting

### Background Not Displaying

1. Check browser console for network errors
2. Verify the URL is accessible and valid
3. Ensure URL uses HTTPS for security
4. Test URL in browser directly
5. Check if image hosting service is available

### URL Configuration Fails

1. Verify URL format (must be http/https)
2. Check URL length (max 2048 characters)
3. Ensure admin permissions
4. Verify image at URL is publicly accessible
5. Check server logs for detailed errors

### Previous Background Still Showing

1. Clear browser cache
2. Hard refresh (Ctrl+Shift+R / Cmd+Shift+R)
3. Check if new URL was successfully configured
4. Wait for DNS propagation if using new domain
5. Check hosting service status

## Future Enhancements

- Multiple background support with rotation
- Background position/sizing controls
- Per-channel custom backgrounds
- Background overlay opacity controls
- Preview mode before applying
- Image cropping/editing tools
- Support for video backgrounds
- Scheduled background changes

## Related Files

### Backend
- `backend/src/controllers/settingsController.ts` - Main controller
- `backend/src/routes/settings.ts` - API routes
- `backend/prisma/schema.prisma` - Database schema
- `backend/tests/settings.test.ts` - API tests

### Frontend
- `frontend/src/components/admin/LoginBackgroundUpload.tsx` - Upload component
- `frontend/src/services/settingsService.ts` - API service
- `frontend/src/pages/LoginPage.tsx` - Login page with background
- `frontend/src/components/admin/SystemConfiguration.tsx` - Settings integration

## Support

For issues or questions about this feature, please refer to:
- Project documentation in `/docs`
- Backend README in `/backend/README.md`
- Frontend README in `/frontend/README.md`
