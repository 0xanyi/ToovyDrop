import { PrismaClient } from '@prisma/client';
import { ApiResponse, ErrorCode, GuestUploadLink } from '../types';
import { generateSecureToken, generateGuestUploadUrl } from '../utils/tokenGenerator';
import logger from '../utils/logger';

export interface GuestLinkConfig {
  description?: string;
  expiresAt?: Date;
  maxUploads?: number;
  guestFolder?: string;
}

export interface GuestLinkResponse extends GuestUploadLink {
  url: string;
  channelName?: string;
}

export class GuestLinkService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new guest upload link
   */
  async createLink(
    channelId: string,
    config: GuestLinkConfig,
    createdBy: string
  ): Promise<ApiResponse<{ guestLink: GuestLinkResponse }>> {
    try {
      // Verify channel exists and is active
      const channel = await this.prisma.channel.findFirst({
        where: { id: channelId, isActive: true }
      });

      if (!channel) {
        return {
          success: false,
          error: {
            code: ErrorCode.NOT_FOUND,
            message: 'Channel not found or inactive'
          }
        };
      }

      // Validate configuration
      if (config.maxUploads && config.maxUploads <= 0) {
        return {
          success: false,
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: 'Maximum uploads must be greater than 0'
          }
        };
      }

      if (config.expiresAt && config.expiresAt <= new Date()) {
        return {
          success: false,
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: 'Expiration date must be in the future'
          }
        };
      }

      // Generate unique token
      let token: string;
      let attempts = 0;
      const maxAttempts = 5;

      do {
        token = generateSecureToken();
        const existingLink = await this.prisma.guestUploadLink.findUnique({
          where: { token }
        });
        
        if (!existingLink) break;
        
        attempts++;
        if (attempts >= maxAttempts) {
          return {
            success: false,
            error: {
              code: ErrorCode.INTERNAL_ERROR,
              message: 'Failed to generate unique token'
            }
          };
        }
      } while (attempts < maxAttempts);

      // Create the guest link
      const guestLink = await this.prisma.guestUploadLink.create({
        data: {
          token,
          channelId,
          description: config.description,
          expiresAt: config.expiresAt,
          maxUploads: config.maxUploads,
          guestFolder: config.guestFolder,
          createdBy
        },
        include: {
          channel: {
            select: { name: true }
          }
        }
      });

      const response: GuestLinkResponse = {
        id: guestLink.id,
        token: guestLink.token,
        channelId: guestLink.channelId || undefined,
        guestFolder: guestLink.guestFolder || undefined,
        description: guestLink.description || undefined,
        expiresAt: guestLink.expiresAt || undefined,
        maxUploads: guestLink.maxUploads || undefined,
        uploadCount: guestLink.uploadCount,
        isActive: guestLink.isActive,
        createdBy: guestLink.createdBy || undefined,
        createdAt: guestLink.createdAt,
        updatedAt: guestLink.updatedAt,
        url: generateGuestUploadUrl(token),
        channelName: guestLink.channel?.name
      };

      logger.info(`Guest upload link created: ${guestLink.id} for channel ${channelId}`);

      return {
        success: true,
        data: { guestLink: response }
      };
    } catch (error) {
      logger.error('Failed to create guest link:', error);
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Failed to create guest link',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Get all guest links for a channel
   */
  async getChannelLinks(channelId: string): Promise<ApiResponse<{ guestLinks: GuestLinkResponse[] }>> {
    try {
      const guestLinks = await this.prisma.guestUploadLink.findMany({
        where: { channelId },
        include: {
          channel: {
            select: { name: true }
          },
          creator: {
            select: { email: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      const response: GuestLinkResponse[] = guestLinks.map(link => ({
        id: link.id,
        token: link.token,
        channelId: link.channelId || undefined,
        guestFolder: link.guestFolder || undefined,
        description: link.description || undefined,
        expiresAt: link.expiresAt || undefined,
        maxUploads: link.maxUploads || undefined,
        uploadCount: link.uploadCount,
        isActive: link.isActive,
        createdBy: link.createdBy || undefined,
        createdAt: link.createdAt,
        updatedAt: link.updatedAt,
        url: generateGuestUploadUrl(link.token),
        channelName: link.channel?.name
      }));

      return {
        success: true,
        data: { guestLinks: response }
      };
    } catch (error) {
      logger.error('Failed to get channel guest links:', error);
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Failed to retrieve guest links',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Validate a guest link token and return link details
   */
  async validateToken(token: string): Promise<ApiResponse<{ 
    guestLink: GuestLinkResponse; 
    channel: { id: string; name: string; ftpPath: string } 
  }>> {
    try {
      const guestLink = await this.prisma.guestUploadLink.findUnique({
        where: { token },
        include: {
          channel: {
            select: { id: true, name: true, ftpPath: true, isActive: true }
          }
        }
      });

      if (!guestLink) {
        return {
          success: false,
          error: {
            code: ErrorCode.NOT_FOUND,
            message: 'Invalid or expired guest link'
          }
        };
      }

      if (!guestLink.isActive) {
        return {
          success: false,
          error: {
            code: ErrorCode.AUTHORIZATION_ERROR,
            message: 'Guest link has been deactivated'
          }
        };
      }

      if (!guestLink.channel || !guestLink.channel.isActive) {
        return {
          success: false,
          error: {
            code: ErrorCode.NOT_FOUND,
            message: 'Channel not found or inactive'
          }
        };
      }

      // Check expiration
      if (guestLink.expiresAt && guestLink.expiresAt <= new Date()) {
        // Auto-deactivate expired link
        await this.prisma.guestUploadLink.update({
          where: { id: guestLink.id },
          data: { isActive: false }
        });

        return {
          success: false,
          error: {
            code: ErrorCode.AUTHORIZATION_ERROR,
            message: 'Guest link has expired'
          }
        };
      }

      // Check upload limit
      if (guestLink.maxUploads && guestLink.uploadCount >= guestLink.maxUploads) {
        return {
          success: false,
          error: {
            code: ErrorCode.AUTHORIZATION_ERROR,
            message: 'Upload limit reached for this guest link'
          }
        };
      }

      const response: GuestLinkResponse = {
        id: guestLink.id,
        token: guestLink.token,
        channelId: guestLink.channelId || undefined,
        guestFolder: guestLink.guestFolder || undefined,
        description: guestLink.description || undefined,
        expiresAt: guestLink.expiresAt || undefined,
        maxUploads: guestLink.maxUploads || undefined,
        uploadCount: guestLink.uploadCount,
        isActive: guestLink.isActive,
        createdBy: guestLink.createdBy || undefined,
        createdAt: guestLink.createdAt,
        updatedAt: guestLink.updatedAt,
        url: generateGuestUploadUrl(token),
        channelName: guestLink.channel.name
      };

      return {
        success: true,
        data: {
          guestLink: response,
          channel: {
            id: guestLink.channel.id,
            name: guestLink.channel.name,
            ftpPath: guestLink.channel.ftpPath
          }
        }
      };
    } catch (error) {
      logger.error('Failed to validate guest link token:', error);
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Failed to validate guest link',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Update a guest link
   */
  async updateLink(
    linkId: string,
    updates: Partial<GuestLinkConfig & { isActive?: boolean }> | any
  ): Promise<ApiResponse<{ guestLink: GuestLinkResponse }>> {
    try {
      const existingLink = await this.prisma.guestUploadLink.findUnique({
        where: { id: linkId },
        include: {
          channel: {
            select: { name: true }
          }
        }
      });

      if (!existingLink) {
        return {
          success: false,
          error: {
            code: ErrorCode.NOT_FOUND,
            message: 'Guest link not found'
          }
        };
      }

      // Validate updates
      if (updates.maxUploads !== undefined && updates.maxUploads <= 0) {
        return {
          success: false,
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: 'Maximum uploads must be greater than 0'
          }
        };
      }

      if (updates.expiresAt && updates.expiresAt <= new Date()) {
        return {
          success: false,
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: 'Expiration date must be in the future'
          }
        };
      }

      const updatedLink = await this.prisma.guestUploadLink.update({
        where: { id: linkId },
        data: updates,
        include: {
          channel: {
            select: { name: true }
          }
        }
      });

      const response: GuestLinkResponse = {
        id: updatedLink.id,
        token: updatedLink.token,
        channelId: updatedLink.channelId || undefined,
        guestFolder: updatedLink.guestFolder || undefined,
        description: updatedLink.description || undefined,
        expiresAt: updatedLink.expiresAt || undefined,
        maxUploads: updatedLink.maxUploads || undefined,
        uploadCount: updatedLink.uploadCount,
        isActive: updatedLink.isActive,
        createdBy: updatedLink.createdBy || undefined,
        createdAt: updatedLink.createdAt,
        updatedAt: updatedLink.updatedAt,
        url: generateGuestUploadUrl(updatedLink.token),
        channelName: updatedLink.channel?.name
      };

      logger.info(`Guest upload link updated: ${linkId}`);

      return {
        success: true,
        data: { guestLink: response }
      };
    } catch (error) {
      logger.error('Failed to update guest link:', error);
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Failed to update guest link',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Deactivate a guest link
   */
  async deactivateLink(linkId: string): Promise<ApiResponse<{ success: boolean }>> {
    try {
      const existingLink = await this.prisma.guestUploadLink.findUnique({
        where: { id: linkId }
      });

      if (!existingLink) {
        return {
          success: false,
          error: {
            code: ErrorCode.NOT_FOUND,
            message: 'Guest link not found'
          }
        };
      }

      await this.prisma.guestUploadLink.update({
        where: { id: linkId },
        data: { isActive: false }
      });

      logger.info(`Guest upload link deactivated: ${linkId}`);

      return {
        success: true,
        data: { success: true }
      };
    } catch (error) {
      logger.error('Failed to deactivate guest link:', error);
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Failed to deactivate guest link',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Delete a guest link
   */
  async deleteLink(linkId: string): Promise<ApiResponse<{ success: boolean }>> {
    try {
      const existingLink = await this.prisma.guestUploadLink.findUnique({
        where: { id: linkId }
      });

      if (!existingLink) {
        return {
          success: false,
          error: {
            code: ErrorCode.NOT_FOUND,
            message: 'Guest link not found'
          }
        };
      }

      await this.prisma.guestUploadLink.delete({
        where: { id: linkId }
      });

      logger.info(`Guest upload link deleted: ${linkId}`);

      return {
        success: true,
        data: { success: true }
      };
    } catch (error) {
      logger.error('Failed to delete guest link:', error);
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Failed to delete guest link',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Increment upload count for a guest link
   */
  async incrementUploadCount(linkId: string): Promise<void> {
    try {
      await this.prisma.guestUploadLink.update({
        where: { id: linkId },
        data: {
          uploadCount: {
            increment: 1
          }
        }
      });

      logger.info(`Upload count incremented for guest link: ${linkId}`);
    } catch (error) {
      logger.error('Failed to increment upload count:', error);
      // Don't throw error as this is not critical for the upload process
    }
  }

  /**
   * Clean up expired guest links (for background jobs)
   */
  async cleanupExpiredLinks(): Promise<void> {
    try {
      const result = await this.prisma.guestUploadLink.updateMany({
        where: {
          isActive: true,
          expiresAt: {
            lte: new Date()
          }
        },
        data: {
          isActive: false
        }
      });

      logger.info(`Deactivated ${result.count} expired guest links`);
    } catch (error) {
      logger.error('Failed to cleanup expired guest links:', error);
    }
  }
}