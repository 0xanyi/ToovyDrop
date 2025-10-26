# Setting Up Login Background with Bunny CDN

## Overview

This guide shows you how to upload a background image to Bunny CDN and use it in ChannelDrop's login page.

## Why CDN URLs?

For Docker/Coolify deployments:
- ✅ No persistent storage needed
- ✅ Works across multiple container instances
- ✅ Survives container restarts
- ✅ Better performance with CDN caching
- ✅ No file cleanup required

## Step-by-Step Guide

### 1. Upload to Bunny CDN

1. **Login to Bunny CDN**
   - Go to https://panel.bunny.net/
   - Sign in to your account

2. **Navigate to Storage**
   - Click on "Storage" in the left menu
   - Select your storage zone (or create one if you don't have any)

3. **Upload Your Image**
   - Click "Upload Files"
   - Select your background image
   - Recommended specs:
     - Resolution: 1920x1080 or higher
     - Format: JPEG or WebP (for smaller file size)
     - Size: < 2MB for fast loading
     - High contrast for login form readability

4. **Get the CDN URL**
   - After upload, click on the image
   - Copy the "CDN URL" (it looks like: `https://yourzone.b-cdn.net/login-bg.jpg`)

### 2. Set Background in ChannelDrop

1. **Login as Admin**
   - Navigate to your ChannelDrop instance
   - Login with admin credentials

2. **Go to Settings**
   - Click "Admin" in the navigation
   - Go to "Settings" tab
   - Scroll to "Login Page Background" section

3. **Paste the URL**
   - Paste your Bunny CDN URL into the "Background Image URL" field
   - Example: `https://yourzone.b-cdn.net/login-bg.jpg`
   - Click "Set Background" or "Update Background"

4. **Verify**
   - Open a new incognito/private window
   - Go to your login page
   - Your custom background should appear!

## Alternative CDN Providers

You can use any image hosting service with public URLs:

### Cloudflare Images
1. Upload to Cloudflare Images
2. Get the public URL
3. Use in ChannelDrop

### AWS S3 + CloudFront
1. Upload to S3 bucket (make sure it's public or use signed URLs)
2. Configure CloudFront distribution
3. Use CloudFront URL

### Imgur (Simple but not recommended for production)
1. Upload to Imgur
2. Right-click image → Copy image address
3. Use direct image URL (ends with .jpg, .png, etc.)

### Any Web Server
- Upload to your own web server
- Make sure URL is publicly accessible
- Use direct image URL

## Image Optimization Tips

### Before Uploading

1. **Resize Image**
   ```bash
   # Using ImageMagick
   magick convert input.jpg -resize 1920x1080^ -gravity center -extent 1920x1080 output.jpg
   ```

2. **Compress Image**
   - Use tools like:
     - TinyPNG (https://tinypng.com/)
     - Squoosh (https://squoosh.app/)
     - ImageOptim (Mac)
   - Aim for < 500KB file size

3. **Convert to WebP** (optional, for smaller size)
   ```bash
   # Using ImageMagick
   magick convert input.jpg -quality 85 output.webp
   ```

### Image Guidelines

- **Resolution:** 1920x1080 (Full HD) or 3840x2160 (4K)
- **Aspect Ratio:** 16:9 preferred
- **File Size:** < 1MB ideal, < 2MB maximum
- **Format:** JPEG or WebP recommended
- **Content:** Avoid busy patterns, prefer simple/gradient backgrounds
- **Contrast:** Ensure login form text remains readable

## Testing Your Background

1. **Desktop View**
   - Test on various screen sizes (1920x1080, 2560x1440, etc.)
   - Verify image covers entire background
   - Check login form readability

2. **Mobile View**
   - Test on phone (portrait and landscape)
   - Verify image doesn't look stretched
   - Confirm form remains usable

3. **Different Browsers**
   - Chrome/Edge
   - Firefox
   - Safari

4. **Loading Speed**
   - Open browser DevTools → Network tab
   - Reload login page
   - Image should load in < 1 second

## Troubleshooting

### Image Not Showing

**Problem:** Image doesn't appear on login page

**Solutions:**
1. Check URL is publicly accessible (open in incognito browser)
2. Verify URL uses HTTPS (not HTTP)
3. Check image file actually exists at URL
4. Look for CORS errors in browser console
5. Try clearing browser cache (Ctrl+Shift+R / Cmd+Shift+R)

### Image Appears Distorted

**Problem:** Image is stretched or cropped badly

**Solutions:**
1. Use recommended resolution (1920x1080)
2. Ensure aspect ratio is 16:9
3. Try `background-size: cover` if possible (already default)

### Slow Loading

**Problem:** Background takes long to load

**Solutions:**
1. Compress/optimize image (use TinyPNG, Squoosh)
2. Use WebP format instead of JPEG
3. Ensure CDN is geographically close to users
4. Verify CDN caching is enabled

### CORS Errors

**Problem:** Browser console shows CORS error

**Solutions:**
1. Configure CDN to allow CORS:
   ```
   Access-Control-Allow-Origin: *
   ```
2. For Bunny CDN:
   - Go to Pull Zone Settings
   - Enable "CORS Support"
   - Add your domain to allowed origins

### Image Not Loading in Some Browsers

**Problem:** Works in Chrome but not Safari/Firefox

**Solutions:**
1. Ensure using standard image format (JPEG/PNG/WebP)
2. Avoid newer formats like AVIF (not universally supported)
3. Use absolute HTTPS URLs

## Security Considerations

1. **Use HTTPS URLs**
   - Never use HTTP URLs (insecure)
   - Most browsers block mixed content

2. **Verify Image Source**
   - Only use trusted CDN providers
   - Avoid untrusted third-party URLs
   - Verify image content before setting

3. **Monitor CDN Costs**
   - Check bandwidth usage
   - Set up alerts for unusual traffic
   - Consider CDN budget limits

## Example URLs

### ✅ Good Examples
```
https://yourzone.b-cdn.net/backgrounds/login-bg.jpg
https://d1234567.cloudfront.net/images/login.webp
https://cdn.example.com/assets/background.png
https://storage.bunnycdn.com/zone-name/path/image.jpg
```

### ❌ Bad Examples
```
http://example.com/image.jpg  (HTTP, not HTTPS)
file:///C:/Users/images/bg.jpg  (Local file path)
/images/background.jpg  (Relative path)
https://site.com/page.html  (Not a direct image URL)
```

## Advanced: Dynamic Backgrounds

You can change backgrounds programmatically via the API:

```bash
# Set new background
curl -X POST https://your-channeldrop.com/api/settings/login-background \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://cdn.example.com/new-background.jpg"}'

# Remove background
curl -X DELETE https://your-channeldrop.com/api/settings/login-background \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

This allows for:
- Seasonal background changes
- Automated background rotation
- A/B testing different backgrounds
- Integration with your own image management system

## Cost Considerations

### Bunny CDN Pricing (as of 2024)
- Storage: ~$0.01/GB/month
- Bandwidth: ~$0.01/GB (varies by region)
- For a 1MB background image with 1000 views/day:
  - Storage: < $0.01/month
  - Bandwidth: ~$0.30/month
  - Total: ~$0.31/month

### Tips to Minimize Costs
1. Compress images aggressively
2. Use WebP format (50% smaller than JPEG)
3. Enable CDN caching (long cache times)
4. Use single image instead of rotating multiple

## Support

If you encounter issues:
1. Check this guide's troubleshooting section
2. Review browser console for errors
3. Verify CDN provider settings
4. Test URL in incognito browser
5. Contact your CDN provider support

## Summary Checklist

- [ ] Image optimized (< 1MB, 1920x1080)
- [ ] Uploaded to CDN (Bunny, Cloudflare, etc.)
- [ ] URL is HTTPS
- [ ] URL is publicly accessible
- [ ] URL copied correctly
- [ ] Logged in as admin
- [ ] Pasted URL in settings
- [ ] Clicked "Set Background"
- [ ] Tested in incognito window
- [ ] Verified on mobile devices
- [ ] Checked loading speed
- [ ] Login form is still readable
