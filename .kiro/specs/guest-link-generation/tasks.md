# Guest Link Generation Implementation Plan

- [ ] 1. Set up backend infrastructure for guest link management

  - Create token generation utility with secure random token generation
  - Create guest link service with CRUD operations and validation logic
  - Create guest link controller with API endpoints for admin management
  - _Requirements: 1.3, 2.1, 2.2, 2.3, 2.4, 3.3, 3.4_

- [-] 2. Implement guest link API endpoints
- [x] 2.1 Create guest link management routes

  - Add routes to admin router for guest link CRUD operations
  - Implement POST /api/admin/channels/:channelId/guest-links endpoint
  - Implement GET /api/admin/channels/:channelId/guest-links endpoint
  - Implement PUT /api/admin/guest-links/:linkId endpoint
  - Implement DELETE /api/admin/guest-links/:linkId endpoint
  - _Requirements: 1.3, 3.3, 3.4, 3.5_

- [x] 2.2 Create guest upload validation endpoint

  - Implement GET /api/guest-links/:token/validate endpoint
  - Add token validation logic with expiration and limit checks
  - Return channel and upload configuration for valid tokens
  - _Requirements: 5.1, 5.5_

- [x] 2.3 Create guest file upload endpoint

  - Implement POST /api/guest-links/:token/upload endpoint
  - Integrate with existing file service for FTP upload
  - Update upload counters and track guest upload attribution
  - _Requirements: 5.2, 5.3, 5.4, 4.3_

- [ ]\* 2.4 Add validation and error handling

  - Implement comprehensive input validation for all endpoints
  - Add proper error responses for invalid tokens, expired links, and limits
  - Create audit logging for all guest link operations
  - _Requirements: 5.5, 4.5_

- [x] 3. Create admin UI components for guest link management
- [x] 3.1 Create guest link modal component

  - Build modal for creating new guest links with configuration options
  - Add form fields for description, expiration, max uploads, and guest folder
  - Implement form validation and submission logic
  - _Requirements: 1.2, 2.1, 2.2, 2.3, 2.4_

- [x] 3.2 Create guest link list component

  - Build component to display existing guest links for a channel
  - Show link details including usage statistics and status
  - Add action buttons for edit, deactivate, and delete operations
  - _Requirements: 3.1, 3.2, 4.1, 4.2_

- [x] 3.3 Integrate guest link management into channel details

  - Add "Generate Guest Link" button to channel management interface
  - Display guest link count and management options in channel details
  - Wire up modal and list components with proper state management
  - _Requirements: 1.1, 3.1_

- [x] 3.4 Add guest link URL display and copy functionality

  - Show generated guest link URL after creation
  - Implement copy-to-clipboard functionality for easy sharing
  - Add visual feedback for successful copy operations
  - _Requirements: 1.4_

- [x] 4. Create guest upload interface
- [x] 4.1 Create guest upload page component

  - Build simplified upload interface for guest users
  - Extract token from URL parameters and validate on page load
  - Display channel information and upload instructions
  - _Requirements: 5.1_

- [x] 4.2 Implement guest file upload functionality

  - Create file selection and upload progress components
  - Integrate with guest upload API endpoint
  - Add file type and size validation before upload
  - _Requirements: 5.2, 5.3_

- [x] 4.3 Add guest upload error handling

  - Display appropriate error messages for invalid or expired links
  - Handle upload failures and file validation errors
  - Provide clear feedback for successful uploads
  - _Requirements: 5.5_

- [ ] 5. Add guest link monitoring and analytics
- [x] 5.1 Extend channel analytics to include guest upload data

  - Add guest upload statistics to channel reporting
  - Track upload counts and usage patterns for guest links
  - Display guest upload metrics in admin dashboard
  - _Requirements: 4.4_

- [x] 5.2 Implement background cleanup for expired links

  - Create scheduled job to deactivate expired guest links
  - Add automatic cleanup of unused or old guest links
  - Log cleanup activities for audit purposes
  - _Requirements: 2.5_

- [ ]\* 5.3 Add comprehensive audit logging

  - Log all guest link creation, modification, and deletion events
  - Track guest upload activities with link attribution
  - Include IP addresses and timestamps for security monitoring
  - _Requirements: 4.5_

- [ ] 6. Update existing components to support guest links
- [x] 6.1 Extend file service for guest upload handling

  - Modify file service to handle guest upload attribution
  - Ensure guest uploads are properly marked and linked
  - Update FTP path handling for guest folder organization
  - _Requirements: 5.4_

- [x] 6.2 Update channel service to include guest link counts

  - Modify channel queries to include guest link statistics
  - Update channel details API to return guest link information
  - Ensure proper counting of active vs inactive guest links
  - _Requirements: 3.1, 4.1_

- [ ]\* 6.3 Add security enhancements
  - Implement rate limiting on guest upload endpoints
  - Add CSRF protection for guest upload forms
  - Enhance file validation and sanitization for guest uploads
  - _Requirements: Security considerations from design_
