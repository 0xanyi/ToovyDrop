# Login Background Customization

## Overview

This feature allows administrators to upload and manage a custom background image for the login page, enabling different stations to customize their login page branding.

## Features

### Backend

1. **Database Storage**
   - System settings are stored in the `system_settings` table
   - Each setting is a key-value pair with metadata
   - Login background image path is stored under the key `login_background_image`

2. **API Endpoints**

   - `POST /api/settings/login-background` (Admin only)
     - Upload a new login background image
     - Accepts: JPEG, PNG, WebP (max 10MB)
     - Returns: Filename and success message

   - `GET /api/settings/login-background` (Public)
     - Get current login background metadata
     - Returns: Filename and URL or null if not set

   - `GET /api/settings/login-background/image` (Public)
     - Serve the actual background image file
     - Returns: Image file with proper cache headers

   - `DELETE /api/settings/login-background` (Admin only)
     - Remove custom background and revert to default
     - Returns: Success message

3. **File Storage**
   - Images stored in `backend/uploads/system/`
   - Files named as `login-bg-{timestamp}-{random}.{ext}`
   - Old background automatically deleted when replaced

4. **Security & Validation**
   - File type validation (JPEG, PNG, WebP only)
   - File size limit (10MB)
   - Admin-only upload/delete operations
   - Public read access for display
   - Audit logging for all operations

### Frontend

1. **Admin Settings Interface** (`/admin/settings`)
   - Located in the System Configuration tab
   - Image upload component with drag-and-drop support
   - Live preview of current background
   - Replace/Remove buttons
   - Upload guidelines and file requirements
   - Success/error feedback

2. **Login Page** (`/login`)
   - Automatically fetches custom background on load
   - Displays custom image with dark overlay for readability
   - Falls back to default gradient if no custom image
   - Responsive and covers entire viewport

## Usage

### For Administrators

1. **Uploading a Background**
   - Navigate to Admin Settings
   - Scroll to "Login Page Background" section
   - Click "Upload Background" or "Replace Background"
   - Select an image (JPEG, PNG, or WebP, max 10MB)
   - Image is automatically uploaded and previewed
   - Login page immediately uses the new background

2. **Removing a Background**
   - Navigate to Admin Settings
   - Scroll to "Login Page Background" section
   - Click "Remove Background"
   - Confirm the action
   - Login page reverts to default gradient

### For Users

- Custom background automatically appears on login page
- No action required
- Login form remains readable with automatic overlay

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

**Upload Background**
```bash
curl -X POST http://localhost:3000/api/settings/login-background \
  -H "Authorization: Bearer <admin-token>" \
  -F "image=@/path/to/image.jpg"
```

**Get Background**
```bash
curl http://localhost:3000/api/settings/login-background
```

**Delete Background**
```bash
curl -X DELETE http://localhost:3000/api/settings/login-background \
  -H "Authorization: Bearer <admin-token>"
```

## Best Practices

### Image Selection

1. **Resolution**: Use high-resolution images (1920x1080 or higher)
2. **Contrast**: Choose images with good contrast to ensure login form readability
3. **File Size**: Optimize images before uploading (aim for < 5MB)
4. **Aspect Ratio**: Use landscape orientation (16:9 recommended)
5. **Content**: Avoid busy or distracting backgrounds

### Performance Considerations

- Images are cached for 24 hours
- Consider image optimization tools before upload
- Use WebP format for better compression
- Monitor file size to ensure fast loading

### Security Considerations

- Only admins can upload/delete backgrounds
- File type validation prevents malicious uploads
- Uploaded files are stored outside web root
- All operations are logged in audit trail

## Troubleshooting

### Image Not Displaying

1. Check browser console for errors
2. Verify image was uploaded successfully
3. Clear browser cache
4. Check file permissions in uploads directory

### Upload Fails

1. Verify file type (JPEG, PNG, or WebP only)
2. Check file size (must be < 10MB)
3. Ensure admin permissions
4. Check server logs for detailed error

### Previous Background Still Showing

1. Clear browser cache
2. Hard refresh (Ctrl+Shift+R / Cmd+Shift+R)
3. Check if new image was successfully uploaded

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
