import { Request, Response } from 'express';
import { ChannelService } from '../services/channelService';
import { prisma } from '../app';
import { ApiResponse } from '../types';
import CacheService from '../services/cacheService';

// Initialize service after prisma is available
let channelService: ChannelService;

function getChannelService() {
  if (!channelService) {
    console.log('Initializing ChannelService with prisma:', !!prisma);
    channelService = new ChannelService(prisma);
  }
  return channelService;
}

/**
 * Create a new channel (Admin only)
 */
export const createChannel = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, ftpPath } = req.body;

    if (!name || name.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Channel name is required'
        }
      } as ApiResponse);
      return;
    }

    const result = await getChannelService().createChannel({
      name: name.trim(),
      description: description?.trim(),
      ftpPath: ftpPath?.trim()
    });

    if (result.success) {
      res.status(201).json(result);
    } else {
      const statusCode = result.error?.code === 'VALIDATION_ERROR' ? 400 : 500;
      res.status(statusCode).json(result);
    }
  } catch (error) {
    console.error('Create channel error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    } as ApiResponse);
  }
};

/**
 * Get all channels (Admin only)
 */
export const getAllChannels = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('getAllChannels called with query params:', req.query);

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string || '';
    const isActive = req.query.isActive === 'false' ? false : true; // Default to true if not specified
    const sortBy = (req.query.sortBy as string) || 'createdAt';
    const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';

    const validPage = Math.max(1, page);
    const validLimit = Math.min(100, Math.max(1, limit));

    // Log the parameters being used
    console.log(`getAllChannels: page=${validPage}, limit=${validLimit}, search=${search}, isActive=${isActive}, sortBy=${sortBy}, sortOrder=${sortOrder}`);

    // Build where clause for filtering
    const where: any = {
      isActive
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Build order by clause
    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    const result = await getChannelService().getAllChannels(validPage, validLimit, where, orderBy);

    if (result.success && result.data) {
      // Transform userChannels count to users count for frontend compatibility
      const transformedChannels = result.data.channels.map((channel: any) => ({
        ...channel,
        _count: {
          ...channel._count,
          users: channel._count.userChannels
        }
      }));

      console.log(`getAllChannels: returning ${transformedChannels.length} channels`);
      res.status(200).json({
        ...result,
        data: {
          ...result.data,
          channels: transformedChannels
        }
      });
    } else {
      console.error('getAllChannels: service returned error:', result.error);
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Get all channels error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    } as ApiResponse);
  }
};

/**
 * Get channel by ID
 */
export const getChannelById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = (req as { user?: { id: string } }).user?.id;

    const result = await getChannelService().getChannelById(id, userId);

    if (result.success && result.data) {
      // Transform userChannels count to users count for frontend compatibility
      const transformedChannel = {
        ...result.data.channel,
        _count: {
          ...result.data.channel._count,
          users: result.data.channel._count.userChannels
        }
      };

      res.status(200).json({
        ...result,
        data: transformedChannel
      });
    } else {
      const statusCode = result.error?.code === 'NOT_FOUND' ? 404 : 
                        result.error?.code === 'AUTHORIZATION_ERROR' ? 403 : 500;
      res.status(statusCode).json(result);
    }
  } catch (error) {
    console.error('Get channel by ID error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    } as ApiResponse);
  }
};

/**
 * Get channels accessible to the current user
 */
export const getUserChannels = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as { user?: { id: string } }).user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'Authentication required'
        }
      } as ApiResponse);
      return;
    }

    const result = await getChannelService().getUserChannels(userId);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Get user channels error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    } as ApiResponse);
  }
};

/**
 * Update channel (Admin only)
 */
export const updateChannel = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, description, ftpPath } = req.body;

    // Validate that at least one field is provided
    if (!name && !description && !ftpPath) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'At least one field must be provided for update'
        }
      } as ApiResponse);
      return;
    }

    const updateData: { name?: string; description?: string; ftpPath?: string } = {};
    if (name !== undefined) {
      if (name.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Channel name cannot be empty'
          }
        } as ApiResponse);
        return;
      }
      updateData.name = name.trim();
    }
    if (description !== undefined) {
      updateData.description = description?.trim();
    }
    if (ftpPath !== undefined) {
      updateData.ftpPath = ftpPath?.trim();
    }

    const result = await getChannelService().updateChannel(id, updateData);

    if (result.success) {
      res.status(200).json(result);
    } else {
      const statusCode = result.error?.code === 'NOT_FOUND' ? 404 : 
                        result.error?.code === 'VALIDATION_ERROR' ? 400 : 500;
      res.status(statusCode).json(result);
    }
  } catch (error) {
    console.error('Update channel error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    } as ApiResponse);
  }
};

/**
 * Delete channel (Admin only)
 */
export const deleteChannel = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await getChannelService().deleteChannel(id);

    if (result.success) {
      res.status(200).json(result);
    } else {
      const statusCode = result.error?.code === 'NOT_FOUND' ? 404 : 500;
      res.status(statusCode).json(result);
    }
  } catch (error) {
    console.error('Delete channel error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    } as ApiResponse);
  }
};

/**
 * Assign user to channel (Admin only)
 */
export const assignUserToChannel = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, channelId } = req.body;
    const assignedBy = (req as { user?: { id: string } }).user?.id;

    if (!userId || !channelId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'User ID and Channel ID are required'
        }
      } as ApiResponse);
      return;
    }

    if (!assignedBy) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'Authentication required'
        }
      } as ApiResponse);
      return;
    }

    const result = await getChannelService().assignUserToChannel(userId, channelId, assignedBy);

    if (result.success) {
      res.status(201).json(result);
    } else {
      const statusCode = result.error?.code === 'NOT_FOUND' ? 404 : 
                        result.error?.code === 'VALIDATION_ERROR' ? 400 : 500;
      res.status(statusCode).json(result);
    }
  } catch (error) {
    console.error('Assign user to channel error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    } as ApiResponse);
  }
};

/**
 * Remove user from channel (Admin only)
 */
export const removeUserFromChannel = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, channelId } = req.body;

    if (!userId || !channelId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'User ID and Channel ID are required'
        }
      } as ApiResponse);
      return;
    }

    const result = await getChannelService().removeUserFromChannel(userId, channelId);

    if (result.success) {
      res.status(200).json(result);
    } else {
      const statusCode = result.error?.code === 'NOT_FOUND' ? 404 : 500;
      res.status(statusCode).json(result);
    }
  } catch (error) {
    console.error('Remove user from channel error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    } as ApiResponse);
  }
};

/**
 * Get users assigned to a channel
 */
export const getChannelUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { channelId } = req.params;
    const currentUserId = (req as { user?: { id: string } }).user?.id;
    const currentUserRole = (req as { user?: { role: string } }).user?.role;

    // Verify channel exists and user has access
    const channelResult = await channelService.getChannelById(channelId, currentUserId);
    if (!channelResult.success) {
      const statusCode = channelResult.error?.code === 'NOT_FOUND' ? 404 : 
                        channelResult.error?.code === 'AUTHORIZATION_ERROR' ? 403 : 500;
      res.status(statusCode).json(channelResult);
      return;
    }

    // Only admins can view channel users
    if (currentUserRole !== 'ADMIN') {
      res.status(403).json({
        success: false,
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: 'Admin access required'
        }
      } as ApiResponse);
      return;
    }

    const result = await getChannelService().getChannelUsers(channelId);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Get channel users error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    } as ApiResponse);
  }
};

/**
 * Get available users for channel assignment
 */
export const getAvailableUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { channelId } = req.params;

    const result = await getChannelService().getAvailableUsers(channelId);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Get available users error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    } as ApiResponse);
  }
};

/**
 * Get channels with pagination and filtering for admin
 */
export const getAdminChannels = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      page = '1',
      limit = '20',
      search = '',
      isActive = 'true',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    // Build where clause
    const where: any = {
      isActive: isActive === 'true'
    };

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { slug: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    // Build order by clause
    const orderBy: any = {};
    orderBy[sortBy as string] = sortOrder;

    const result = await getChannelService().getAllChannels(pageNum, limitNum, where, orderBy);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Get admin channels error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    } as ApiResponse);
  }
};

/**
 * Update channel's user assignments (Admin only)
 */
export const updateChannelUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { channelId } = req.params;
    const { userIds } = req.body;
    const assignedBy = (req as { user?: { id: string } }).user?.id;

    if (!Array.isArray(userIds)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'userIds must be an array'
        }
      } as ApiResponse);
      return;
    }

    if (!assignedBy) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'Authentication required'
        }
      } as ApiResponse);
      return;
    }

    // Get current assignments
    const currentAssignmentsResult = await getChannelService().getChannelUsers(channelId);
    if (!currentAssignmentsResult.success) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Channel not found'
        }
      } as ApiResponse);
      return;
    }

    const currentUserIds = currentAssignmentsResult.data?.assignedUsers.map((user: any) => user.id) || [];

    // Calculate additions and removals
    const toAdd = userIds.filter((id: string) => !currentUserIds.includes(id));
    const toRemove = currentUserIds.filter((id: string) => !userIds.includes(id));

    // Remove old assignments
    for (const userId of toRemove) {
      await getChannelService().removeUserFromChannel(userId, channelId);
    }

    // Add new assignments
    for (const userId of toAdd) {
      await getChannelService().assignUserToChannel(userId, channelId, assignedBy);
    }

    // Invalidate cache for all affected users and the channel
    const allAffectedUsers = [...toRemove, ...toAdd];
    await Promise.all([
      ...allAffectedUsers.map(userId => CacheService.invalidateUserCaches(userId)),
      CacheService.invalidateChannelCaches(channelId),
      // Also invalidate system stats cache
      CacheService.invalidatePattern('system:stats')
    ]);

    // Get updated assignments
    const updatedAssignments = await getChannelService().getChannelUsers(channelId);

    const response = {
      success: true,
      data: {
        message: 'User assignments updated successfully',
        assignedUsers: updatedAssignments.data?.assignedUsers || []
      }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Update channel users error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    } as ApiResponse);
  }
};
