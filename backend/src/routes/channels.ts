import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  createChannel,
  getAllChannels,
  getChannelById,
  getUserChannels,
  updateChannel,
  deleteChannel,
  assignUserToChannel,
  removeUserFromChannel,
  getChannelUsers,
  getAvailableUsers,
  getAdminChannels,
  updateChannelUsers,
} from '../controllers/channelController';
import {
  createChannelSchema,
  updateChannelSchema,
  assignUserToChannelSchema,
  removeUserFromChannelSchema,
  idParamsSchema,
  channelIdParamsSchema,
  paginationQuerySchema,
} from '../utils/validation';
import { validateRequest, validateParams, validateQuery } from '../middleware/validateRequest';

const router = Router();

// Admin only routes (specific routes first)
router.get('/admin', authenticate, authorize(['ADMIN']), getAdminChannels);
router.get('/user', authenticate, getUserChannels);

// User-Channel assignment routes (Admin only)
router.post(
  '/assign',
  authenticate,
  authorize(['ADMIN']),
  validateRequest(assignUserToChannelSchema),
  assignUserToChannel
);

router.post(
  '/remove',
  authenticate,
  authorize(['ADMIN']),
  validateRequest(removeUserFromChannelSchema),
  removeUserFromChannel
);

// Channel-specific user management routes
router.get('/:channelId/users', authenticate, authorize(['ADMIN']), validateParams(channelIdParamsSchema), getChannelUsers);
router.put('/:channelId/users', authenticate, authorize(['ADMIN']), validateParams(channelIdParamsSchema), updateChannelUsers);
router.get('/:channelId/available-users', authenticate, authorize(['ADMIN']), validateParams(channelIdParamsSchema), getAvailableUsers);

// General channel routes
router.post('/', authenticate, authorize(['ADMIN']), validateRequest(createChannelSchema), createChannel);
router.get('/', authenticate, authorize(['ADMIN']), validateQuery(paginationQuerySchema), getAllChannels);
router.get('/:id', authenticate, validateParams(idParamsSchema), getChannelById);
router.put('/:id', authenticate, authorize(['ADMIN']), validateParams(idParamsSchema), validateRequest(updateChannelSchema), updateChannel);
router.delete('/:id', authenticate, authorize(['ADMIN']), validateParams(idParamsSchema), deleteChannel);

export default router;