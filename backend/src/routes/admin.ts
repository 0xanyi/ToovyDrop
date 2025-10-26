import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  getDashboardStats,
  getSystemHealth,
  getAuditLogs,
  getAnalytics,
  getAdminFiles,
  getAdminFileById,
  bulkFileOperation,
  getStorageStats,
  getSystemConfig,
  updateSystemConfig,
  getGuestLinkCleanupStats,
  triggerGuestLinkCleanup
} from '../controllers/adminController';
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deactivateUser,
  reactivateUser,
  getUserChannels,
  updateUserChannels
} from '../controllers/userController';
import {
  createGuestLink,
  getChannelGuestLinks,
  updateGuestLink,
  deleteGuestLink
} from '../controllers/guestLinkController';

const router = Router();

// All admin routes require authentication and ADMIN role
router.use(authenticate);
router.use(authorize(['ADMIN']));

/**
 * GET /api/admin/dashboard/stats
 * Get admin dashboard statistics
 */
router.get('/dashboard/stats', getDashboardStats);

/**
 * GET /api/admin/system/health
 * Get system health information
 */
router.get('/system/health', getSystemHealth);

/**
 * GET /api/admin/config
 * Get system configuration
 */
router.get('/config', getSystemConfig);

/**
 * PUT /api/admin/config
 * Update system configuration
 */
router.put('/config', updateSystemConfig);

/**
 * GET /api/admin/audit-logs
 * Get audit logs with pagination and filtering
 * Query params: page, limit, action, resourceType
 */
router.get('/audit-logs', getAuditLogs);

/**
 * GET /api/admin/analytics
 * Get comprehensive analytics data
 * Query params: dateRange (7d, 30d, 90d, 1y)
 */
router.get('/analytics', getAnalytics);

// User Management Routes

/**
 * GET /api/admin/users
 * Get list of users with pagination and filtering
 * Query params: page, limit, search, role, sortBy, sortOrder, isActive
 */
router.get('/users', getUsers);

/**
 * GET /api/admin/users/:id
 * Get user by ID
 */
router.get('/users/:id', getUserById);

/**
 * POST /api/admin/users
 * Create a new user
 */
router.post('/users', createUser);

/**
 * PUT /api/admin/users/:id
 * Update user
 */
router.put('/users/:id', updateUser);

/**
 * DELETE /api/admin/users/:id
 * Deactivate user (soft delete)
 */
router.delete('/users/:id', deactivateUser);

/**
 * POST /api/admin/users/:id/reactivate
 * Reactivate user
 */
router.post('/users/:id/reactivate', reactivateUser);

/**
 * GET /api/admin/users/:id/channels
 * Get user's channel assignments
 */
router.get('/users/:id/channels', getUserChannels);

/**
 * PUT /api/admin/users/:id/channels
 * Update user's channel assignments
 */
router.put('/users/:id/channels', updateUserChannels);

// File Management Routes

/**
 * GET /api/admin/files
 * Get admin file list with advanced filtering
 * Query params: page, limit, search, channelId, mimeType, sortBy, sortOrder, dateFrom, dateTo, isActive
 */
router.get('/files', getAdminFiles);

/**
 * GET /api/admin/files/storage-stats
 * Get system storage statistics
 */
router.get('/files/storage-stats', getStorageStats);

/**
 * POST /api/admin/files/bulk-operation
 * Perform bulk operations on files
 * Body: { operation: 'delete' | 'move' | 'updateMetadata', fileIds: string[], payload?: any }
 */
router.post('/files/bulk-operation', bulkFileOperation);

/**
 * GET /api/admin/files/:id
 * Get file by ID for admin
 */
router.get('/files/:id', getAdminFileById);

// Guest Link Management Routes

/**
 * POST /api/admin/channels/:channelId/guest-links
 * Create a new guest upload link for a channel
 */
router.post('/channels/:channelId/guest-links', createGuestLink);

/**
 * GET /api/admin/channels/:channelId/guest-links
 * Get all guest links for a channel
 */
router.get('/channels/:channelId/guest-links', getChannelGuestLinks);

/**
 * PUT /api/admin/guest-links/:linkId
 * Update a guest link
 */
router.put('/guest-links/:linkId', updateGuestLink);

/**
 * DELETE /api/admin/guest-links/:linkId
 * Delete a guest link
 */
router.delete('/guest-links/:linkId', deleteGuestLink);

// Guest Link Cleanup Routes

/**
 * GET /api/admin/guest-links/cleanup/stats
 * Get guest link cleanup statistics
 */
router.get('/guest-links/cleanup/stats', getGuestLinkCleanupStats);

/**
 * POST /api/admin/guest-links/cleanup/trigger
 * Manually trigger guest link cleanup
 */
router.post('/guest-links/cleanup/trigger', triggerGuestLinkCleanup);

export default router;