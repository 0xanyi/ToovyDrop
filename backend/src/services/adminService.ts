import { prisma } from '../app';
import { ApiResponse } from '../types';
import logger from '../utils/logger';

export class AdminService {
  /**
   * Get comprehensive dashboard statistics
   */
  async getDashboardStats(): Promise<ApiResponse> {
    try {
      // Get user statistics
      const userStats = await prisma.user.groupBy({
        by: ['role'],
        _count: { id: true },
        where: { isActive: true }
      });

      const totalUsers = await prisma.user.count({ where: { isActive: true } });

      // Get channel statistics
      const totalChannels = await prisma.channel.count({ where: { isActive: true } });

      // Get file statistics
      const [totalFiles, totalStorage] = await Promise.all([
        prisma.file.count({ where: { isActive: true } }),
        prisma.file.aggregate({
          where: { isActive: true },
          _sum: { size: true }
        })
      ]);

      // Get recent activity (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const [recentUsers, recentFiles] = await Promise.all([
        prisma.user.count({
          where: {
            isActive: true,
            createdAt: { gte: sevenDaysAgo }
          }
        }),
        prisma.file.count({
          where: {
            isActive: true,
            createdAt: { gte: sevenDaysAgo }
          }
        })
      ]);

      // Get channel usage statistics
      const channelStats = await prisma.channel.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          slug: true,
          _count: {
            select: {
              files: {
                where: { isActive: true }
              },
              guestUploadLinks: {
                where: { isActive: true }
              }
            }
          }
        },
        orderBy: {
          files: {
            _count: 'desc'
          }
        },
        take: 10
      });

      const stats = {
        users: {
          total: totalUsers,
          byRole: userStats.reduce((acc, stat) => {
            acc[stat.role] = stat._count.id;
            return acc;
          }, {} as Record<string, number>),
          recent: recentUsers
        },
        channels: {
          total: totalChannels,
          topByUsage: channelStats
        },
        files: {
          total: totalFiles,
          recent: recentFiles,
          totalStorageBytes: totalStorage._sum.size || BigInt(0)
        },
        period: 'last_7_days'
      };

      return {
        success: true,
        data: stats
      };
    } catch (error) {
      logger.error('Error fetching dashboard stats:', error);
      throw new Error('Failed to fetch dashboard statistics');
    }
  }

  /**
   * Get system health information
   */
  async getSystemHealth(): Promise<ApiResponse> {
    try {
      // Test database connection
      await prisma.$queryRaw`SELECT 1`;

      const health = {
        database: {
          status: 'healthy',
          connectedAt: new Date().toISOString()
        },
        server: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          nodeVersion: process.version,
          environment: process.env.NODE_ENV || 'development'
        },
        timestamp: new Date().toISOString()
      };

      return {
        success: true,
        data: health
      };
    } catch (error) {
      logger.error('Error checking system health:', error);
      return {
        success: false,
        error: {
          code: 'HEALTH_CHECK_FAILED',
          message: 'System health check failed'
        }
      };
    }
  }

  /**
   * Get user activity analytics
   */
  async getUserActivityAnalytics(): Promise<ApiResponse> {
    try {
      // Get user registration trends (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const userRegistrationTrend = await prisma.user.findMany({
        where: {
          isActive: true,
          createdAt: { gte: thirtyDaysAgo }
        },
        select: {
          createdAt: true,
          role: true
        },
        orderBy: { createdAt: 'asc' }
      });

      // Get user login activity (if lastLoginAt is tracked)
      const recentLogins = await prisma.user.findMany({
        where: {
          isActive: true,
          lastLoginAt: { not: null }
        },
        select: {
          id: true,
          email: true,
          lastLoginAt: true,
          role: true
        },
        orderBy: { lastLoginAt: 'desc' },
        take: 20
      });

      // Get user channel assignments
      const userChannelStats = await prisma.userChannel.groupBy({
        by: ['userId'],
        _count: { channelId: true }
      });

      const analytics = {
        registrationTrend: userRegistrationTrend,
        recentLogins: recentLogins,
        channelAssignments: userChannelStats.map(stat => ({
          userId: stat.userId,
          channelCount: stat._count.channelId
        })),
        period: 'last_30_days'
      };

      return {
        success: true,
        data: analytics
      };
    } catch (error) {
      logger.error('Error fetching user activity analytics:', error);
      throw new Error('Failed to fetch user activity analytics');
    }
  }

  /**
   * Get file usage analytics
   */
  async getFileUsageAnalytics(): Promise<ApiResponse> {
    try {
      // Get file upload trends (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const fileUploadTrend = await prisma.file.findMany({
        where: {
          isActive: true,
          createdAt: { gte: thirtyDaysAgo }
        },
        select: {
          createdAt: true,
          size: true,
          mimeType: true,
          channelId: true,
          uploadedByGuest: true,
          guestUploadLinkId: true
        },
        orderBy: { createdAt: 'asc' }
      });

      // Get file type distribution
      const fileTypeDistribution = await prisma.file.groupBy({
        by: ['mimeType'],
        _count: { id: true },
        _sum: { size: true },
        where: {
          isActive: true,
          mimeType: { not: null }
        },
        orderBy: { _count: { id: 'desc' } }
      });

      // Get storage usage by channel
      const storageByChannel = await prisma.channel.findMany({
        where: { isActive: true },
        include: {
          _count: {
            select: {
              files: {
                where: { isActive: true }
              }
            }
          },
          files: {
            where: { isActive: true },
            select: { size: true, uploadedByGuest: true }
          }
        }
      });

      // Get guest upload statistics
      const guestUploadStats = await prisma.file.groupBy({
        by: ['uploadedByGuest'],
        _count: { id: true },
        _sum: { size: true },
        where: {
          isActive: true,
          createdAt: { gte: thirtyDaysAgo }
        }
      });

      // Get guest link usage statistics
      const guestLinkStats = await prisma.guestUploadLink.findMany({
        where: {
          isActive: true,
          uploadCount: { gt: 0 }
        },
        select: {
          id: true,
          description: true,
          uploadCount: true,
          maxUploads: true,
          createdAt: true,
          expiresAt: true,
          channel: {
            select: {
              name: true
            }
          },
          _count: {
            select: {
              files: {
                where: { isActive: true }
              }
            }
          }
        },
        orderBy: { uploadCount: 'desc' },
        take: 10
      });

      const analytics = {
        uploadTrend: fileUploadTrend,
        typeDistribution: fileTypeDistribution.map(stat => ({
          mimeType: stat.mimeType,
          count: stat._count.id,
          totalSize: stat._sum.size || BigInt(0)
        })),
        storageByChannel: storageByChannel.map(channel => ({
          id: channel.id,
          name: channel.name,
          slug: channel.slug,
          fileCount: channel._count.files,
          totalSize: channel.files.reduce((acc: bigint, file) => acc + file.size, BigInt(0)),
          guestFileCount: channel.files.filter(file => file.uploadedByGuest).length,
          guestStorageSize: channel.files
            .filter(file => file.uploadedByGuest)
            .reduce((acc: bigint, file) => acc + file.size, BigInt(0))
        })),
        guestUploads: {
          totalGuestFiles: guestUploadStats.find(stat => stat.uploadedByGuest)?._count.id || 0,
          totalRegularFiles: guestUploadStats.find(stat => !stat.uploadedByGuest)?._count.id || 0,
          totalGuestStorage: guestUploadStats.find(stat => stat.uploadedByGuest)?._sum.size || BigInt(0),
          totalRegularStorage: guestUploadStats.find(stat => !stat.uploadedByGuest)?._sum.size || BigInt(0),
          topGuestLinks: guestLinkStats
        },
        period: 'last_30_days'
      };

      return {
        success: true,
        data: analytics
      };
    } catch (error) {
      logger.error('Error fetching file usage analytics:', error);
      throw new Error('Failed to fetch file usage analytics');
    }
  }

  /**
   * Get comprehensive analytics data for dashboard
   */
  async getAnalytics(dateRange: '7d' | '30d' | '90d' | '1y' = '30d'): Promise<ApiResponse> {
    try {
      // Calculate date range
      const now = new Date();
      const daysBack = {
        '7d': 7,
        '30d': 30,
        '90d': 90,
        '1y': 365
      }[dateRange];
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      // Get overview statistics
      const [
        totalUsers,
        totalChannels,
        totalFiles,
        totalStorage,
        activeUsers,
        activeChannels,
        uploadsInPeriod,
        guestLinksActive
      ] = await Promise.all([
        prisma.user.count({ where: { isActive: true } }),
        prisma.channel.count({ where: { isActive: true } }),
        prisma.file.count({ where: { isActive: true } }),
        prisma.file.aggregate({
          where: { isActive: true },
          _sum: { size: true }
        }),
        prisma.user.count({
          where: {
            isActive: true,
            lastLoginAt: { gte: startDate }
          }
        }),
        prisma.channel.count({
          where: {
            isActive: true,
            files: {
              some: {
                isActive: true,
                createdAt: { gte: startDate }
              }
            }
          }
        }),
        prisma.file.count({
          where: {
            isActive: true,
            createdAt: { gte: startDate }
          }
        }),
        prisma.guestUploadLink.count({
          where: { isActive: true }
        })
      ]);

      // Get upload trends with guest data
      const uploadTrends = await prisma.file.findMany({
        where: {
          isActive: true,
          createdAt: { gte: startDate }
        },
        select: {
          createdAt: true,
          size: true,
          uploadedByGuest: true,
          uploadedBy: true
        },
        orderBy: { createdAt: 'asc' }
      });

      // Group uploads by day
      interface DailyUploadData {
        date: string;
        uploads: number;
        guestUploads: number;
        size: bigint;
        guestSize: bigint;
        users: Set<string>;
      }
      
      const dailyUploads = uploadTrends.reduce((acc, file) => {
        const date = file.createdAt.toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = {
            date,
            uploads: 0,
            guestUploads: 0,
            size: BigInt(0),
            guestSize: BigInt(0),
            users: new Set<string>()
          };
        }
        acc[date].uploads++;
        acc[date].size += file.size;
        if (file.uploadedByGuest) {
          acc[date].guestUploads++;
          acc[date].guestSize += file.size;
        } else {
          acc[date].users.add(file.uploadedBy);
        }
        return acc;
      }, {} as Record<string, DailyUploadData>);

      // Get storage usage by type
      const usageByType = await prisma.file.groupBy({
        by: ['mimeType'],
        _count: { id: true },
        _sum: { size: true },
        where: {
          isActive: true,
          mimeType: { not: null }
        },
        orderBy: { _sum: { size: 'desc' } },
        take: 10
      });

      // Get storage usage by channel with guest data
      const usageByChannel = await prisma.channel.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          _count: {
            select: {
              files: { where: { isActive: true } },
              guestUploadLinks: { where: { isActive: true } }
            }
          },
          files: {
            where: { isActive: true },
            select: {
              size: true,
              uploadedByGuest: true
            }
          }
        },
        orderBy: {
          files: { _count: 'desc' }
        },
        take: 10
      });

      // Get user activity
      const topUsers = await prisma.user.findMany({
        where: {
          isActive: true,
          uploadedFiles: {
            some: {
              isActive: true,
              createdAt: { gte: startDate }
            }
          }
        },
        select: {
          id: true,
          email: true,
          lastLoginAt: true,
          _count: {
            select: {
              uploadedFiles: {
                where: {
                  isActive: true,
                  createdAt: { gte: startDate }
                }
              }
            }
          },
          uploadedFiles: {
            where: {
              isActive: true,
              createdAt: { gte: startDate }
            },
            select: { size: true, createdAt: true }
          }
        },
        orderBy: {
          uploadedFiles: { _count: 'desc' }
        },
        take: 10
      });

      // Get guest link analytics
      const guestLinkAnalytics = await prisma.guestUploadLink.findMany({
        where: { isActive: true },
        select: {
          id: true,
          description: true,
          uploadCount: true,
          maxUploads: true,
          expiresAt: true,
          createdAt: true,
          channel: {
            select: { name: true }
          },
          files: {
            where: {
              isActive: true,
              createdAt: { gte: startDate }
            },
            select: { size: true }
          }
        },
        orderBy: { uploadCount: 'desc' }
      });

      const analytics = {
        overview: {
          totalUsers,
          totalChannels,
          totalFiles,
          totalStorage: totalStorage._sum.size || BigInt(0),
          activeUsers,
          activeChannels,
          uploadsToday: uploadTrends.filter(f => 
            f.createdAt >= new Date(now.getFullYear(), now.getMonth(), now.getDate())
          ).length,
          uploadsThisWeek: uploadsInPeriod,
          guestLinksActive,
          guestUploadsInPeriod: uploadTrends.filter(f => f.uploadedByGuest).length
        },
        storageUsage: {
          totalSize: Number(totalStorage._sum.size || BigInt(0)),
          usedSize: Number(totalStorage._sum.size || BigInt(0)),
          availableSize: 0, // This would need to be configured based on system limits
          usageByType: usageByType.map(item => ({
            type: item.mimeType || 'unknown',
            size: Number(item._sum.size || BigInt(0)),
            count: item._count.id,
            percentage: 0 // Will be calculated on frontend
          })),
          usageByChannel: usageByChannel.map(channel => ({
            channelId: channel.id,
            channelName: channel.name,
            size: channel.files.reduce((acc, file) => acc + Number(file.size), 0),
            count: channel._count.files,
            guestUploads: channel.files.filter(f => f.uploadedByGuest).length,
            guestSize: channel.files
              .filter(f => f.uploadedByGuest)
              .reduce((acc, file) => acc + Number(file.size), 0),
            percentage: 0 // Will be calculated on frontend
          }))
        },
        uploadTrends: {
          daily: Object.values(dailyUploads).map((day) => ({
            date: day.date,
            uploads: day.uploads,
            guestUploads: day.guestUploads,
            size: Number(day.size),
            guestSize: Number(day.guestSize),
            users: day.users.size
          }))
        },
        userActivity: {
          activeUsers,
          newUsers: await prisma.user.count({
            where: {
              isActive: true,
              createdAt: { gte: startDate }
            }
          }),
          topUsers: topUsers.map(user => ({
            userId: user.id,
            email: user.email,
            uploadCount: user._count.uploadedFiles,
            totalSize: user.uploadedFiles.reduce((acc, file) => acc + Number(file.size), 0),
            lastActive: user.lastLoginAt?.toISOString() || user.uploadedFiles[0]?.createdAt?.toISOString() || ''
          })),
          activityByRole: await prisma.user.groupBy({
            by: ['role'],
            _count: { id: true },
            where: { isActive: true }
          }).then(roles => roles.map(role => ({
            role: role.role,
            count: role._count.id,
            percentage: 0 // Will be calculated on frontend
          })))
        },
        channelActivity: {
          activeChannels,
          topChannels: usageByChannel.map(channel => ({
            channelId: channel.id,
            name: channel.name,
            fileCount: channel._count.files,
            totalSize: channel.files.reduce((acc, file) => acc + Number(file.size), 0),
            userCount: 0, // Would need additional query
            guestLinkCount: channel._count.guestUploadLinks,
            guestFileCount: channel.files.filter(f => f.uploadedByGuest).length,
            lastActivity: '' // Would need additional query
          })),
          channelsByUsage: usageByChannel.slice(0, 5).map(channel => ({
            name: channel.name,
            count: channel._count.files,
            percentage: 0 // Will be calculated on frontend
          }))
        },
        guestLinkActivity: {
          totalActiveLinks: guestLinksActive,
          totalGuestUploads: uploadTrends.filter(f => f.uploadedByGuest).length,
          totalGuestStorage: uploadTrends
            .filter(f => f.uploadedByGuest)
            .reduce((acc, file) => acc + Number(file.size), 0),
          topGuestLinks: guestLinkAnalytics.slice(0, 10).map(link => ({
            id: link.id,
            description: link.description || 'Unnamed Link',
            channelName: link.channel?.name || 'Unknown Channel',
            uploadCount: link.uploadCount,
            maxUploads: link.maxUploads,
            storageUsed: link.files.reduce((acc, file) => acc + Number(file.size), 0),
            expiresAt: link.expiresAt?.toISOString(),
            createdAt: link.createdAt.toISOString(),
            isExpired: link.expiresAt ? link.expiresAt < now : false,
            isLimitReached: link.maxUploads ? link.uploadCount >= link.maxUploads : false
          })),
          expiringLinks: guestLinkAnalytics
            .filter(link => link.expiresAt && link.expiresAt <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000))
            .length,
          limitReachedLinks: guestLinkAnalytics
            .filter(link => link.maxUploads && link.uploadCount >= link.maxUploads)
            .length
        }
      };

      return {
        success: true,
        data: analytics
      };
    } catch (error) {
      logger.error('Error fetching comprehensive analytics:', error);
      throw new Error('Failed to fetch analytics data');
    }
  }
}