import { PrismaClient } from '@prisma/client';
import { ApiResponse, ErrorCode } from '../types';
import { generateSlug } from '../utils/helpers';
import CacheService from './cacheService';
import * as ftp from 'basic-ftp';
import logger from '../utils/logger';

export class ChannelService {
  constructor(private prisma: PrismaClient) {
    console.log('ChannelService constructor called');
    console.log('Prisma client received:', !!prisma);
    console.log('Prisma channel model:', !!prisma?.channel);
  }

  /**
   * Create FTP directory for a channel
   */
  private async createFtpDirectory(ftpPath: string): Promise<void> {
    const client = new ftp.Client();
    client.ftp.verbose = process.env.NODE_ENV === 'development';

    try {
      await client.access({
        host: process.env.FTP_HOST!,
        user: process.env.FTP_USER!,
        password: process.env.FTP_PASSWORD!,
        port: parseInt(process.env.FTP_PORT || '21'),
        secure: process.env.FTP_SECURE === 'true',
      });

      logger.info(`Creating FTP directory: ${ftpPath}`);
      await client.ensureDir(ftpPath);
      logger.info(`Successfully created FTP directory: ${ftpPath}`);
    } catch (error) {
      logger.error(`Failed to create FTP directory ${ftpPath}:`, error);
      throw new Error(`Failed to create FTP directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      client.close();
    }
  }

  /**
   * Create a new channel
   */
  async createChannel(data: {
    name: string;
    description?: string;
    ftpPath?: string;
  }): Promise<ApiResponse<{ channel: import('@prisma/client').Channel }>> {
    try {
      // Validate channel name uniqueness
      const existingChannel = await this.prisma.channel.findFirst({
        where: {
          OR: [
            { name: data.name },
            { slug: generateSlug(data.name) }
          ]
        }
      });

      if (existingChannel) {
        return {
          success: false,
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: 'Channel with this name already exists'
          }
        };
      }

      const slug = generateSlug(data.name);
      const ftpPath = data.ftpPath || `/uploads/${slug}`;

      // Create FTP directory first
      try {
        await this.createFtpDirectory(ftpPath);
      } catch (error) {
        logger.error('Failed to create FTP directory for channel:', error);
        return {
          success: false,
          error: {
            code: ErrorCode.INTERNAL_ERROR,
            message: 'Failed to create FTP directory for channel',
            details: error instanceof Error ? error.message : 'Unknown error'
          }
        };
      }

      const channel = await this.prisma.channel.create({
        data: {
          name: data.name,
          slug,
          description: data.description,
          ftpPath
        }
      });

      return {
        success: true,
        data: { channel }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Failed to create channel',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Get all channels (admin only)
   */
  async getAllChannels(
    page: number = 1,
    limit: number = 20,
    where?: Record<string, unknown>,
    orderBy?: Record<string, unknown>
  ): Promise<ApiResponse<{ channels: import('@prisma/client').Channel[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>> {
    try {
      console.log('ChannelService.getAllChannels called with:', { page, limit, where, orderBy });

      const skip = (page - 1) * limit;
      const defaultWhere = { isActive: true };
      const finalWhere = where || defaultWhere;
      const finalOrderBy = orderBy || { createdAt: 'desc' };

      console.log('ChannelService.getAllChannels: final query params:', { skip, finalWhere, finalOrderBy });

      const [channels, total] = await Promise.all([
        this.prisma.channel.findMany({
          where: finalWhere,
          orderBy: finalOrderBy,
          include: {
            _count: {
              select: {
                files: true,
                guestUploadLinks: true,
                userChannels: true
              }
            },
            guestUploadLinks: {
              select: {
                id: true,
                isActive: true,
                uploadCount: true,
                maxUploads: true,
                expiresAt: true
              }
            }
          },
          skip,
          take: limit
        }),
        this.prisma.channel.count({
          where: finalWhere
        })
      ]);

      console.log(`ChannelService.getAllChannels: found ${channels.length} channels, total count: ${total}`);

      // Process channels to add guest link statistics
      const channelsWithStats = channels.map(channel => {
        const guestLinkStats = this.calculateGuestLinkStats(channel.guestUploadLinks);
        
        return {
          ...channel,
          guestLinkStats,
          // Remove the raw guestUploadLinks array from the response
          guestUploadLinks: undefined
        };
      });

      const totalPages = Math.ceil(total / limit);

      return {
        success: true,
        data: {
          channels: channelsWithStats,
          pagination: {
            page,
            limit,
            total,
            totalPages
          }
        }
      };
    } catch (error) {
      console.error('ChannelService.getAllChannels error:', error);
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Failed to retrieve channels',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Get channel by ID
   */
  async getChannelById(id: string, userId?: string): Promise<ApiResponse<{ channel: import('@prisma/client').Channel & { files: import('@prisma/client').File[]; _count: { files: number; guestUploadLinks: number; userChannels: number } } }>> {
    try {
      const channel = await this.prisma.channel.findFirst({
        where: {
          id,
          isActive: true
        },
        include: {
          files: {
            where: { isActive: true },
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: {
              uploader: {
                select: { id: true, email: true }
              }
            }
          },
          _count: {
            select: {
              files: true,
              guestUploadLinks: true,
              userChannels: true
            }
          },
          guestUploadLinks: {
            select: {
              id: true,
              token: true,
              description: true,
              isActive: true,
              uploadCount: true,
              maxUploads: true,
              expiresAt: true,
              guestFolder: true,
              createdAt: true,
              updatedAt: true,
              creator: {
                select: {
                  id: true,
                  email: true
                }
              }
            },
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      if (!channel) {
        return {
          success: false,
          error: {
            code: ErrorCode.NOT_FOUND,
            message: 'Channel not found'
          }
        };
      }

      // If userId is provided, check if user has access to this channel
      if (userId) {
        const hasAccess = await this.checkChannelAccess(userId, channel.id);
        if (!hasAccess) {
          return {
            success: false,
            error: {
              code: ErrorCode.AUTHORIZATION_ERROR,
              message: 'Access denied to this channel'
            }
          };
        }
      }

      // Add guest link statistics
      const guestLinkStats = this.calculateGuestLinkStats(channel.guestUploadLinks);
      
      const channelWithStats = {
        ...channel,
        guestLinkStats
      };

      return {
        success: true,
        data: { channel: channelWithStats }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Failed to retrieve channel',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Get channels accessible to a user
   */
  async getUserChannels(userId: string): Promise<ApiResponse<{ channels: unknown[] }>> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return {
          success: false,
          error: {
            code: ErrorCode.NOT_FOUND,
            message: 'User not found'
          }
        };
      }

      // Get user channel assignments with caching
      const channels = await CacheService.getUserChannels(userId, this.prisma);

      return {
        success: true,
        data: { channels }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Failed to retrieve user channels',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Update channel
   */
  async updateChannel(
    id: string,
    data: {
      name?: string;
      description?: string;
      ftpPath?: string;
    }
  ): Promise<ApiResponse<{ channel: import('@prisma/client').Channel }>> {
    try {
      const existingChannel = await this.prisma.channel.findUnique({
        where: { id }
      });

      if (!existingChannel) {
        return {
          success: false,
          error: {
            code: ErrorCode.NOT_FOUND,
            message: 'Channel not found'
          }
        };
      }

      // Check if name is being updated and validate uniqueness
      if (data.name && data.name !== existingChannel.name) {
        const nameConflict = await this.prisma.channel.findFirst({
          where: {
            OR: [
              { name: data.name },
              { slug: generateSlug(data.name) }
            ],
            NOT: { id }
          }
        });

        if (nameConflict) {
          return {
            success: false,
            error: {
              code: ErrorCode.VALIDATION_ERROR,
              message: 'Channel with this name already exists'
            }
          };
        }
      }

      const updateData: { name?: string; slug?: string; description?: string; ftpPath?: string } = { ...data };
      if (data.name) {
        updateData.slug = generateSlug(data.name);
      }

      const channel = await this.prisma.channel.update({
        where: { id },
        data: updateData
      });

      return {
        success: true,
        data: { channel }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Failed to update channel',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Delete channel and clean up associated resources
   */
  async deleteChannel(id: string): Promise<ApiResponse<{ success: boolean }>> {
    try {
      const channel = await this.prisma.channel.findUnique({
        where: { id },
        include: {
          files: {
            where: { isActive: true },
            select: { id: true, filename: true }
          }
        }
      });

      if (!channel) {
        return {
          success: false,
          error: {
            code: ErrorCode.NOT_FOUND,
            message: 'Channel not found'
          }
        };
      }

      // Import FileService for FTP operations
      const { FileService } = await import('../services/fileService');
      const fileService = new FileService(this.prisma);

      // First, delete all files in the channel
      if (channel.files.length > 0) {
        console.log(`Deleting ${channel.files.length} files from channel ${channel.name}`);
        
        for (const file of channel.files) {
          try {
            await fileService.deleteFile(file.id, 'system'); // Use 'system' as userId for channel deletion
          } catch (error) {
            console.error(`Failed to delete file ${file.filename}:`, error);
            // Continue with other files even if one fails
          }
        }
      }

      // Delete the channel directory from FTP
      try {
        await fileService.connectToFtp();
        const channelPath = `/${channel.slug}`;
        
        try {
          await fileService.ftpClientInstance.removeDir(channelPath);
          console.log(`Successfully deleted channel directory from FTP: ${channelPath}`);
        } catch (ftpError) {
          console.error(`Error deleting channel directory from FTP: ${channelPath}`, ftpError);
          // Continue with database deletion even if FTP deletion fails
        }
        
        await fileService.disconnectFromFtp();
      } catch (error) {
        console.error('Error with FTP operations during channel deletion:', error);
      }

      // Finally, delete the channel from database (hard delete since files are already cleaned up)
      await this.prisma.channel.delete({
        where: { id }
      });

      return {
        success: true,
        data: { success: true }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Failed to delete channel',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Assign user to channel
   */
  async assignUserToChannel(
    userId: string,
    channelId: string,
    assignedBy: string
  ): Promise<ApiResponse<{ userChannel: unknown }>> {
    try {
      // Verify user and channel exist
      const [user, channel] = await Promise.all([
        this.prisma.user.findUnique({ where: { id: userId } }),
        this.prisma.channel.findUnique({ where: { id: channelId } })
      ]);

      if (!user) {
        return {
          success: false,
          error: {
            code: ErrorCode.NOT_FOUND,
            message: 'User not found'
          }
        };
      }

      if (!channel) {
        return {
          success: false,
          error: {
            code: ErrorCode.NOT_FOUND,
            message: 'Channel not found'
          }
        };
      }

      // Check if assignment already exists
      const existingAssignment = await this.prisma.userChannel.findUnique({
        where: {
          userId_channelId: { userId, channelId }
        }
      });

      if (existingAssignment) {
        return {
          success: false,
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: 'User is already assigned to this channel'
          }
        };
      }

      // Create the assignment
      await this.prisma.userChannel.create({
        data: {
          userId,
          channelId,
          assignedBy
        }
      });

      // Invalidate caches
      await Promise.all([
        CacheService.invalidateUserCaches(userId),
        CacheService.invalidateChannelCaches(channelId)
      ]);

      // Get the created assignment with related data
      const userChannelWithDetails = await this.prisma.userChannel.findUnique({
        where: { 
          userId_channelId: { userId, channelId }
        },
        include: {
          user: {
            select: { id: true, email: true }
          },
          channel: {
            select: { id: true, name: true, slug: true }
          }
        }
      });

      if (!userChannelWithDetails) {
        return {
          success: false,
          error: {
            code: ErrorCode.INTERNAL_ERROR,
            message: 'Failed to retrieve created assignment'
          }
        };
      }

      return {
        success: true,
        data: { userChannel: userChannelWithDetails }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Failed to assign user to channel',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Remove user from channel
   */
  async removeUserFromChannel(userId: string, channelId: string): Promise<ApiResponse<{ success: boolean }>> {
    try {
      const existingAssignment = await this.prisma.userChannel.findUnique({
        where: {
          userId_channelId: { userId, channelId }
        }
      });

      if (!existingAssignment) {
        return {
          success: false,
          error: {
            code: ErrorCode.NOT_FOUND,
            message: 'User channel assignment not found'
          }
        };
      }

      await this.prisma.userChannel.delete({
        where: {
          userId_channelId: { userId, channelId }
        }
      });

      // Invalidate caches
      await Promise.all([
        CacheService.invalidateUserCaches(userId),
        CacheService.invalidateChannelCaches(channelId)
      ]);

      return {
        success: true,
        data: { success: true }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Failed to remove user from channel',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Get users assigned to a channel along with available users
   */
  async getChannelUsers(channelId: string): Promise<ApiResponse<{ assignedUsers: unknown[]; availableUsers: unknown[] }>> {
    try {
      // Get assigned users
      const userChannels = await this.prisma.userChannel.findMany({
        where: { channelId },
        include: {
          user: {
            select: { id: true, email: true, role: true, isActive: true, createdAt: true, lastLoginAt: true }
          }
        },
        orderBy: { assignedAt: 'desc' }
      });

      const assignedUsers = userChannels.map(uc => {
        const user = uc.user;
        return {
          ...user,
          assignedAt: uc.assignedAt
        };
      });

      // Get available users (active users not assigned to this channel)
      const assignedUserIds = userChannels.map(uc => uc.userId);
      const availableUsers = await this.prisma.user.findMany({
        where: {
          isActive: true,
          id: { notIn: assignedUserIds }
        },
        select: {
          id: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
          lastLoginAt: true
        },
        orderBy: { email: 'asc' }
      });

      return {
        success: true,
        data: { assignedUsers, availableUsers }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Failed to retrieve channel users',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Calculate guest link statistics for a channel
   */
  private calculateGuestLinkStats(guestUploadLinks: any[]): {
    total: number;
    active: number;
    inactive: number;
    expired: number;
    totalUploads: number;
    averageUploadsPerLink: number;
    linksNearLimit: number;
  } {
    const now = new Date();
    
    const stats = {
      total: guestUploadLinks.length,
      active: 0,
      inactive: 0,
      expired: 0,
      totalUploads: 0,
      averageUploadsPerLink: 0,
      linksNearLimit: 0
    };

    guestUploadLinks.forEach(link => {
      // Count uploads
      stats.totalUploads += link.uploadCount || 0;
      
      // Check if expired
      const isExpired = link.expiresAt && new Date(link.expiresAt) < now;
      
      // Check if near limit (80% of max uploads)
      const isNearLimit = link.maxUploads && 
        link.uploadCount >= (link.maxUploads * 0.8);
      
      if (isExpired) {
        stats.expired++;
      }
      
      if (link.isActive && !isExpired) {
        stats.active++;
      } else {
        stats.inactive++;
      }
      
      if (isNearLimit) {
        stats.linksNearLimit++;
      }
    });

    // Calculate average uploads per link
    stats.averageUploadsPerLink = stats.total > 0 
      ? Math.round((stats.totalUploads / stats.total) * 100) / 100 
      : 0;

    return stats;
  }

  /**
   * Check if user has access to a channel
   */
  private async checkChannelAccess(userId: string, channelId: string): Promise<boolean> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user || !user.isActive) {
        return false;
      }

      // Admins have access to all channels
      if (user.role === 'ADMIN') {
        return true;
      }

      // Check if user is assigned to the channel
      const userChannel = await this.prisma.userChannel.findUnique({
        where: {
          userId_channelId: { userId, channelId }
        }
      });

      return !!userChannel;
    } catch {
      return false;
    }
  }

  /**
   * Get guest link statistics for a channel
   */
  async getChannelGuestLinkStats(channelId: string): Promise<ApiResponse<{
    stats: {
      total: number;
      active: number;
      inactive: number;
      expired: number;
      totalUploads: number;
      averageUploadsPerLink: number;
      linksNearLimit: number;
    };
    recentLinks: any[];
  }>> {
    try {
      const channel = await this.prisma.channel.findUnique({
        where: { id: channelId },
        include: {
          guestUploadLinks: {
            select: {
              id: true,
              token: true,
              description: true,
              isActive: true,
              uploadCount: true,
              maxUploads: true,
              expiresAt: true,
              guestFolder: true,
              createdAt: true,
              updatedAt: true,
              creator: {
                select: {
                  id: true,
                  email: true
                }
              }
            },
            orderBy: { createdAt: 'desc' },
            take: 5 // Get 5 most recent links
          }
        }
      });

      if (!channel) {
        return {
          success: false,
          error: {
            code: ErrorCode.NOT_FOUND,
            message: 'Channel not found'
          }
        };
      }

      const stats = this.calculateGuestLinkStats(channel.guestUploadLinks);

      return {
        success: true,
        data: {
          stats,
          recentLinks: channel.guestUploadLinks
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Failed to retrieve guest link statistics',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Get available users for channel assignment
   */
  async getAvailableUsers(channelId: string): Promise<ApiResponse<{ users: unknown[] }>> {
    try {
      // Get all active users who are not assigned to this channel
      const assignedUserIds = await this.prisma.userChannel
        .findMany({
          where: { channelId },
          select: { userId: true }
        })
        .then(ucs => ucs.map(uc => uc.userId));

      const users = await this.prisma.user.findMany({
        where: {
          isActive: true,
          id: { notIn: assignedUserIds }
        },
        select: {
          id: true,
          email: true,
          role: true,
          createdAt: true,
          lastLoginAt: true
        },
        orderBy: { email: 'asc' }
      });

      return {
        success: true,
        data: { users }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Failed to retrieve available users',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }
}
