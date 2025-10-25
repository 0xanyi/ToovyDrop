# File Naming and UI Improvements

## Summary
Implemented improvements to file naming and display to enhance the user experience:

1. **Removed ID prefixes from filenames** - Files are now stored with their original names
2. **Added filename truncation with tooltips** - Long filenames are truncated in the UI with full names shown on hover
3. **Added file rename functionality** - Users can now rename files through the UI

## Changes Made

### Backend Changes

#### 1. File Service (`backend/src/services/fileService.ts`)
- **Modified `uploadToFtp()`**: Now uses original filename without ID prefix
- **Added `renameFile()`**: New method to rename files on both FTP server and database
  - Validates user permissions
  - Renames file on FTP server
  - Updates database records with new filename and FTP path

#### 2. File Controller (`backend/src/controllers/fileController.ts`)
- **Added `renameFile()` endpoint**: Handles file rename requests
  - Validates input using Joi schema
  - Checks user permissions
  - Logs rename actions to audit log
- **Added `renameFileSchema`**: Validation schema for rename requests

#### 3. File Routes (`backend/src/routes/files.ts`)
- **Added PATCH route**: `/:fileId/rename` for renaming files

### Frontend Changes

#### 1. File Service (`frontend/src/services/fileService.ts`)
- **Added `renameFile()`**: API call to rename files

#### 2. File List Component (`frontend/src/components/FileList.tsx`)
- **Added filename truncation**:
  - Grid view: Truncates to 30 characters
  - List view: Truncates to 50 characters
  - Full filename shown in tooltip on hover
- **Added rename functionality**:
  - New "Rename" option in file context menu
  - Uses modal dialog for better UX
  - Reloads file list after successful rename
- **Updated imports**: Added Edit2 icon and RenameFileModal component

#### 3. Rename Modal Component (`frontend/src/components/RenameFileModal.tsx`)
- **New component**: Modal dialog for renaming files
  - Shows current filename
  - Input field for new filename
  - Validation for empty names and duplicate names
  - Cancel and Rename buttons

## File Display Examples

### Before
```
1000000688_1761417907023_4s1jbqbayis.jpg
```

### After
```
4s1jbqbayis.jpg (truncated to "4s1jbqbayis.jpg" in list view)
very-long-filename-that-goes-on-and-on.jpg (truncated to "very-long-filename-that-goes-..." in grid view)
```

## Usage

### Renaming a File
1. Navigate to the file list
2. Click the three-dot menu on any file
3. Select "Rename"
4. Enter the new filename in the modal
5. Click "Rename" to confirm

### Viewing Full Filenames
- Hover over any truncated filename to see the full name in a tooltip

## API Endpoints

### Rename File
```
PATCH /api/files/:fileId/rename
Authorization: Bearer <token>

Request Body:
{
  "newName": "new-filename.jpg"
}

Response:
{
  "success": true,
  "message": "File renamed successfully"
}
```

## Security & Permissions
- Only users with access to the file's channel can rename files
- Admins can rename any file
- All rename actions are logged in the audit log
- Filenames are sanitized to prevent path traversal attacks

## Database Schema
No changes to the database schema were required. The existing `File` model already supports:
- `filename`: Sanitized filename stored on FTP
- `originalName`: Original filename as uploaded by user
- `ftpPath`: Full path to file on FTP server

## Notes
- Files are now stored with their original names (sanitized for safety)
- No more UUID prefixes in filenames
- Cleaner, more user-friendly file display
- Better UX with modal-based rename functionality
