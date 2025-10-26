import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';
import auditService from './auditService';

// Global declarations
declare const setInterval: (callback: () => void, delay: number) => any;
declare const clearInterval: (intervalId: any) => void;

export class GuestLinkCleanupService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Clean up expired guest links
   */
  async cleanupExpiredLinks(): Promise<{
    deactivatedCount: number;
    deletedCount: number;
    errors: string[];
  }> {
    const now = new Date();
    const errors: string[] = [];
    let deactivatedCount = 0;
    let deletedCount = 0;

    try {
      logger.info('Starting guest link cleanup process');

      // Find expired links that are still active
      const expiredLinks = await this.prisma.guestUploadLink.findMany({
        where: {
          isActive: true,
          expiresAt: {
            lte: now
          }
        },
        include: {
          channel: {
            select: { name: true }
          },
          creator: {
            select: { email: true }
          }
        }
      });

      logger.info(`Found ${expiredLinks.length} expired guest links to process`);

      // Deactivate expired links
      for (const link of expiredLinks) {
        try {
          await this.prisma.guestUploadLink.update({
            where: { id: link.id },
            data: { isActive: false }
          });

          // Log the deactivation
          await auditService.recordEvent({
            action: 'DEACTIVATE_EXPIRED_GUEST_LINK',
            entityType: 'GUEST_UPLOAD_LINK',
            entityId: link.id,
            actorEmail: 'system',
            metadata: {
              description: link.description,
              channelName: link.channel?.name,
              creatorEmail: link.creator?.email,
              expiresAt: link.expiresAt?.toISOString(),
              uploadCount: link.uploadCount,
              reason: 'expired'
            }
          });

          deactivatedCount++;
          logger.info(`Deactivated expired guest link: ${link.description || link.id} (Channel: ${link.channel?.name})`);
        } catch (error) {
          const errorMsg = `Failed to deactivate expired link ${link.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          logger.error(errorMsg);
        }
      }

      // Find links that have reached their upload limit
      const limitReachedLinks = await this.prisma.guestUploadLink.findMany({
        where: {
          isActive: true,
          maxUploads: { not: null },
          uploadCount: { gte: this.prisma.guestUploadLink.fields.maxUploads }
        },
        include: {
          channel: {
            select: { name: true }
          },
          creator: {
            select: { email: true }
          }
        }
      });

      logger.info(`Found ${limitReachedLinks.length} guest links that have reached their upload limit`);

      // Deactivate links that have reached their limit
      for (const link of limitReachedLinks) {
        try {
          await this.prisma.guestUploadLink.update({
            where: { id: link.id },
            data: { isActive: false }
          });

          // Log the deactivation
          await auditService.recordEvent({
            action: 'DEACTIVATE_LIMIT_REACHED_GUEST_LINK',
            entityType: 'GUEST_UPLOAD_LINK',
            entityId: link.id,
            actorEmail: 'system',
            metadata: {
              description: link.description,
              channelName: link.channel?.name,
              creatorEmail: link.creator?.email,
              maxUploads: link.maxUploads,
              uploadCount: link.uploadCount,
              reason: 'upload_limit_reached'
            }
          });

          deactivatedCount++;
          logger.info(`Deactivated guest link that reached upload limit: ${link.description || link.id} (${link.uploadCount}/${link.maxUploads})`);
        } catch (error) {
          const errorMsg = `Failed to deactivate limit-reached link ${link.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          logger.error(errorMsg);
        }
      }

      // Clean up old inactive links (older than 90 days)
      const cleanupDate = new Date();
      cleanupDate.setDate(cleanupDate.getDate() - 90);

      const oldInactiveLinks = await this.prisma.guestUploadLink.findMany({
        where: {
          isActive: false,
          updatedAt: { lte: cleanupDate },
          files: {
            none: {} // Only delete links with no associated files
          }
        },
        include: {
          channel: {
            select: { name: true }
          }
        }
      });

      logger.info(`Found ${oldInactiveLinks.length} old inactive guest links to delete`);

      // Delete old inactive links that have no associated files
      for (const link of oldInactiveLinks) {
        try {
          await this.prisma.guestUploadLink.delete({
            where: { id: link.id }
          });

          // Log the deletion
          await auditService.recordEvent({
            action: 'DELETE_OLD_GUEST_LINK',
            entityType: 'GUEST_UPLOAD_LINK',
            entityId: link.id,
            actorEmail: 'system',
            metadata: {
              description: link.description,
              channelName: link.channel?.name,
              lastUpdated: link.updatedAt.toISOString(),
              reason: 'old_inactive_cleanup'
            }
          });

          deletedCount++;
          logger.info(`Deleted old inactive guest link: ${link.description || link.id}`);
        } catch (error) {
          const errorMsg = `Failed to delete old link ${link.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          logger.error(errorMsg);
        }
      }

      logger.info(`Guest link cleanup completed: ${deactivatedCount} deactivated, ${deletedCount} deleted, ${errors.length} errors`);

      return {
        deactivatedCount,
        deletedCount,
        errors
      };
    } catch (error) {
      const errorMsg = `Guest link cleanup process failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      logger.error(errorMsg);
      errors.push(errorMsg);
      
      return {
        deactivatedCount,
        deletedCount,
        errors
      };
    }
  }

  /**
   * Get cleanup statistics
   */
  async getCleanupStats(): Promise<{
    expiredActiveLinks: number;
    limitReachedActiveLinks: number;
    oldInactiveLinks: number;
    totalActiveLinks: number;
  }> {
    const now = new Date();
    const cleanupDate = new Date();
    cleanupDate.setDate(cleanupDate.getDate() - 90);

    const [
      expiredActiveLinks,
      limitReachedActiveLinks,
      oldInactiveLinks,
      totalActiveLinks
    ] = await Promise.all([
      this.prisma.guestUploadLink.count({
        where: {
          isActive: true,
          expiresAt: { lte: now }
        }
      }),
      this.prisma.guestUploadLink.count({
        where: {
          isActive: true,
          maxUploads: { not: null },
          uploadCount: { gte: this.prisma.guestUploadLink.fields.maxUploads }
        }
      }),
      this.prisma.guestUploadLink.count({
        where: {
          isActive: false,
          updatedAt: { lte: cleanupDate },
          files: { none: {} }
        }
      }),
      this.prisma.guestUploadLink.count({
        where: { isActive: true }
      })
    ]);

    return {
      expiredActiveLinks,
      limitReachedActiveLinks,
      oldInactiveLinks,
      totalActiveLinks
    };
  }

  /**
   * Schedule cleanup to run periodically
   */
  startPeriodicCleanup(intervalHours: number = 24): any {
    logger.info(`Starting periodic guest link cleanup every ${intervalHours} hours`);
    
    // Run cleanup immediately
    this.cleanupExpiredLinks().catch(error => {
      logger.error('Initial guest link cleanup failed:', error);
    });

    // Schedule periodic cleanup
    return setInterval(async () => {
      try {
        const result = await this.cleanupExpiredLinks();
        logger.info(`Periodic guest link cleanup completed: ${result.deactivatedCount} deactivated, ${result.deletedCount} deleted`);
        
        if (result.errors.length > 0) {
          logger.warn(`Cleanup completed with ${result.errors.length} errors:`, result.errors);
        }
      } catch (error) {
        logger.error('Periodic guest link cleanup failed:', error);
      }
    }, intervalHours * 60 * 60 * 1000);
  }

  /**
   * Stop periodic cleanup
   */
  stopPeriodicCleanup(intervalId: unknown): void {
    clearInterval(intervalId);
    logger.info('Stopped periodic guest link cleanup');
  }
}

export default GuestLinkCleanupService;