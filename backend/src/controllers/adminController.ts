import { Response } from 'express';
import { prisma } from '../app';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { ApiResponse } from '../types';
import { User, Channel } from '@prisma/client';
import auditService from '../services/auditService';
import GuestLinkCleanupService from '../services/guestLinkCleanupService';

/**
 * Get admin dashboard statistics
 */
export const getDashboardStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Get user counts by role
    const userStats = await prisma.user.groupBy({
      by: ['role'],
      _count: { id: true },
      where: { isActive: true }
    });

    // Get total counts
    const [
      totalUsers,
      totalChannels,
      totalFiles,
      totalStorage
    ] = await Promise.all([
      prisma.user.count({ where: { isActive: true } }),
      prisma.channel.count({ where: { isActive: true } }),
      prisma.file.count({ where: { isActive: true } }),
      prisma.file.aggregate({
        where: { isActive: true },
        _sum: { size: true }
      })
    ]);

    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [
      recentUsers,
      recentFiles
    ] = await Promise.all([
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

    // Get file type distribution
    const fileTypeStats = await prisma.file.groupBy({
      by: ['mimeType'],
      _count: { id: true },
      _sum: { size: true },
      where: {
        isActive: true,
        mimeType: { not: null }
      },
      orderBy: { _count: { id: 'desc' } },
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
        total: totalChannels
      },
      files: {
        total: totalFiles,
        recent: recentFiles,
        totalStorageBytes: Number(totalStorage._sum.size || BigInt(0)),
        typeDistribution: fileTypeStats.map(stat => ({
          mimeType: stat.mimeType,
          count: stat._count.id,
          totalSize: Number(stat._sum.size || BigInt(0))
        }))
      }
    };

    const response: ApiResponse = {
      success: true,
      data: stats
    };

    res.status(200).json(response);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to fetch dashboard statistics', 500, 'INTERNAL_ERROR');
  }
};

/**
 * Get system health information
 */
export const getSystemHealth = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Check database connection
    const dbHealth = await prisma.$queryRaw`SELECT 1 as health`;

    // Get system metrics
    const metrics = {
      database: {
        status: Array.isArray(dbHealth) && dbHealth.length > 0 ? 'healthy' : 'unhealthy',
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

    const response: ApiResponse = {
      success: true,
      data: metrics
    };

    res.status(200).json(response);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to fetch system health', 500, 'INTERNAL_ERROR');
  }
};

/**
 * Get recent audit logs
 */
export const getAuditLogs = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '50', action = '', entityType = '' } = req.query;

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 50;

    const logs = await auditService.getAuditLogs({
      page: pageNum,
      limit: limitNum,
      action: action ? String(action) : undefined,
      entityType: entityType ? String(entityType) : undefined,
    });

    const response: ApiResponse = {
      success: true,
      data: logs
    };

    res.status(200).json(response);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to fetch audit logs', 500, 'INTERNAL_ERROR');
  }
};

/**
 * Get admin file list with advanced filtering
 */
export const getAdminFiles = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {
      page = '1',
      limit = '50',
      search = '',
      channelId = '',
      mimeType = '',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      dateFrom = '',
      dateTo = '',
      isActive = 'true'
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const offset = (pageNum - 1) * limitNum;

    // Build where clause
    const where: Record<string, unknown> = {
      isActive: isActive === 'true'
    };

    if (search) {
      where.OR = [
        { originalName: { contains: search as string, mode: 'insensitive' as const } },
        { description: { contains: search as string, mode: 'insensitive' as const } }
      ];
    }

    if (channelId) {
      where.channelId = channelId;
    }

    if (mimeType) {
      where.mimeType = { contains: mimeType as string };
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        (where.createdAt as Record<string, unknown>).gte = new Date(dateFrom as string);
      }
      if (dateTo) {
        (where.createdAt as Record<string, unknown>).lte = new Date(dateTo as string);
      }
    }

    // Build order by clause
    const orderBy: Record<string, unknown> = {};
    orderBy[sortBy as string] = sortOrder;

    const [files, total, aggregateStats] = await Promise.all([
      prisma.file.findMany({
        where,
        include: {
          channel: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          },
          uploader: {
            select: {
              id: true,
              email: true
            }
          }
        },
        orderBy,
        skip: offset,
        take: limitNum
      }),
      prisma.file.count({ where }),
      prisma.file.aggregate({
        where,
        _sum: { size: true },
        _avg: { size: true },
        _max: { size: true }
      })
    ]);

    // Get the largest file details
    let largestFile = null;
    if (aggregateStats._max.size && aggregateStats._max.size > 0) {
      largestFile = await prisma.file.findFirst({
        where: {
          isActive: where.isActive as boolean,
          size: aggregateStats._max.size
        },
        select: {
          originalName: true,
          size: true
        }
      });
    }

    // Convert BigInt values to numbers for JSON serialization
    const serializedFiles = files.map(file => ({
      ...file,
      size: Number(file.size)
    }));

    const response: ApiResponse = {
      success: true,
      data: {
        files: serializedFiles,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        },
        summary: {
          totalSize: Number(aggregateStats._sum.size || 0),
          totalFiles: total,
          avgFileSize: Number(aggregateStats._avg.size || 0),
          largestFile: {
            name: largestFile?.originalName || '',
            size: Number(largestFile?.size || 0)
          }
        }
      }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error in getAdminFiles:', error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to fetch files', 500, 'INTERNAL_ERROR');
  }
};

/**
 * Get file by ID for admin
 */
export const getAdminFileById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const file = await prisma.file.findUnique({
      where: { id },
      include: {
        channel: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true
          }
        },
        uploader: {
          select: {
            id: true,
            email: true,
            role: true
          }
        }
      }
    });

    if (!file) {
      throw new AppError('File not found', 404, 'NOT_FOUND');
    }

    const response: ApiResponse = {
      success: true,
      data: { file }
    };

    res.status(200).json(response);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to fetch file', 500, 'INTERNAL_ERROR');
  }
};

/**
 * Admin bulk file operations
 */
export const bulkFileOperation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { operation, fileIds, payload = {} } = req.body;

    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      throw new AppError('fileIds must be a non-empty array', 400, 'VALIDATION_ERROR');
    }

    if (!['delete', 'move', 'updateMetadata'].includes(operation)) {
      throw new AppError('Invalid operation', 400, 'VALIDATION_ERROR');
    }

    let result;

    switch (operation) {
      case 'delete': {
        // Get file information for FTP deletion
        const files = await prisma.file.findMany({
          where: { id: { in: fileIds } },
          select: { id: true, ftpPath: true, filename: true }
        });

        if (files.length === 0) {
          throw new AppError('No files found to delete', 404, 'NOT_FOUND');
        }

        // Import FileService for FTP operations
        const { FileService } = await import('../services/fileService');
        const fileService = new FileService(prisma);

        // Delete each file properly (from both FTP and database)
        let successCount = 0;
        const errors: string[] = [];

        for (const file of files) {
          try {
            await fileService.deleteFile(file.id, req.user!.id);
            successCount++;
          } catch (error) {
            const errorMsg = `Failed to delete ${file.filename}: ${error instanceof Error ? error.message : 'Unknown error'}`;
            errors.push(errorMsg);
            console.error(errorMsg);
          }
        }

        result = { count: successCount };

        // If some deletions failed, include error information
        if (errors.length > 0) {
          throw new AppError(
            `Deleted ${successCount} of ${files.length} files. Errors: ${errors.join('; ')}`,
            207, // Multi-Status
            'PARTIAL_SUCCESS'
          );
        }
        break;
      }

      case 'move': {
        if (!payload.channelId) {
          throw new AppError('channelId is required for move operation', 400, 'VALIDATION_ERROR');
        }

        // Verify channel exists
        const channel = await prisma.channel.findUnique({
          where: { id: payload.channelId }
        });

        if (!channel) {
          throw new AppError('Target channel not found', 404, 'NOT_FOUND');
        }

        result = await prisma.file.updateMany({
          where: { id: { in: fileIds } },
          data: { channelId: payload.channelId }
        });
        break;
      }

      case 'updateMetadata':
        result = await prisma.file.updateMany({
          where: { id: { in: fileIds } },
          data: {
            ...(payload.description && { description: payload.description }),
            ...(payload.tags && { tags: payload.tags })
          }
        });
        break;

      default:
        throw new AppError('Unsupported operation', 400, 'VALIDATION_ERROR');
    }

    const response: ApiResponse = {
      success: true,
      data: {
        message: `Bulk ${operation} completed successfully`,
        affectedCount: result.count
      }
    };

    res.status(200).json(response);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to perform bulk operation', 500, 'INTERNAL_ERROR');
  }
};

/**
 * Get system storage statistics
 */
export const getStorageStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const [
      totalFiles,
      totalSize,
      activeFiles,
      inactiveFiles,
      filesByType,
      filesByChannel,
      recentUploads
    ] = await Promise.all([
      prisma.file.count(),
      prisma.file.aggregate({ _sum: { size: true } }),
      prisma.file.count({ where: { isActive: true } }),
      prisma.file.count({ where: { isActive: false } }),
      prisma.file.groupBy({
        by: ['mimeType'],
        _count: { id: true },
        _sum: { size: true },
        where: { isActive: true },
        orderBy: { _count: { id: 'desc' } },
        take: 20
      }),
      prisma.channel.findMany({
        include: {
          _count: { select: { files: true } },
          files: {
            where: { isActive: true },
            select: { size: true }
          }
        }
      }),
      prisma.file.count({
        where: {
          isActive: true,
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        }
      })
    ]);

    const totalStorageSize = Number(totalSize._sum.size || BigInt(0));
    const allocatedStorage = 1024 * 1024 * 1024 * 1024; // 1TB

    const storageStats = {
      overview: {
        totalFiles,
        activeFiles,
        inactiveFiles,
        totalStorage: totalStorageSize,
        allocatedStorage,
        availableStorage: allocatedStorage - totalStorageSize,
        usagePercentage: (totalStorageSize / allocatedStorage) * 100,
        recentUploads
      },
      byType: filesByType.map(item => ({
        mimeType: item.mimeType,
        count: item._count.id,
        totalSize: Number(item._sum.size || BigInt(0)),
        percentage: totalStorageSize > 0 ? (Number(item._sum.size || BigInt(0)) / totalStorageSize) * 100 : 0
      })),
      byChannel: filesByChannel.map(channel => ({
        channelId: channel.id,
        channelName: channel.name,
        fileCount: channel._count.files,
        totalSize: channel.files.reduce((sum, file) => sum + Number(file.size), 0),
        percentage: totalStorageSize > 0 ? (channel.files.reduce((sum, file) => sum + Number(file.size), 0) / totalStorageSize) * 100 : 0
      }))
    };

    const response: ApiResponse = {
      success: true,
      data: storageStats
    };

    res.status(200).json(response);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to fetch storage statistics', 500, 'INTERNAL_ERROR');
  }
};

/**
 * Get comprehensive analytics data
 */
export const getAnalytics = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { dateRange = '30d' } = req.query;

    // Calculate date range
    const now = new Date();
    const startDate = new Date();

    switch (dateRange) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    // Get overview statistics including guest uploads
    const [
      totalUsers,
      totalChannels,
      totalFiles,
      totalStorage,
      activeUsers,
      activeChannels,
      uploadsToday,
      uploadsThisWeek,
      guestLinksActive,
      guestUploadsInPeriod
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
              createdAt: { gte: startDate }
            }
          }
        }
      }),
      prisma.file.count({
        where: {
          isActive: true,
          createdAt: {
            gte: new Date(now.setHours(0, 0, 0, 0))
          }
        }
      }),
      prisma.file.count({
        where: {
          isActive: true,
          createdAt: {
            gte: new Date(now.setDate(now.getDate() - 7))
          }
        }
      }),
      prisma.guestUploadLink.count({
        where: { isActive: true }
      }),
      prisma.file.count({
        where: {
          isActive: true,
          uploadedByGuest: true,
          createdAt: { gte: startDate }
        }
      }),

    ]);

    // Get storage usage by file type
    const storageByType = await prisma.file.groupBy({
      by: ['mimeType'],
      _count: { id: true },
      _sum: { size: true },
      where: {
        isActive: true,
        mimeType: { not: null }
      },
      orderBy: { _sum: { size: 'desc' } }
    });

    // Get storage usage by channel with guest data
    const storageByChannel = await prisma.channel.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: { 
            files: { where: { isActive: true } },
            guestUploadLinks: { where: { isActive: true } }
          }
        },
        files: {
          where: { isActive: true },
          select: { size: true, uploadedByGuest: true }
        }
      }
    });

    // Get upload trends with guest data
    const uploadTrends = await getUploadTrendsWithGuests(startDate, now);

    // Get user activity data
    const userActivityData = await getUserActivityData(startDate, now);

    // Get channel activity data with guest info
    const channelActivityData = await getChannelActivityDataWithGuests(startDate, now);

    // Get guest link analytics
    const guestLinkAnalytics = await getGuestLinkAnalytics(startDate, now);

    // Calculate total storage for usage calculations
    const totalStorageSize = Number(totalStorage._sum.size || BigInt(0));
    const totalStorageAllocated = 1024 * 1024 * 1024 * 1024; // 1TB default limit

    const analyticsData = {
      overview: {
        totalUsers,
        totalChannels,
        totalFiles,
        totalStorage: totalStorageSize,
        activeUsers,
        activeChannels,
        uploadsToday,
        uploadsThisWeek,
        guestLinksActive,
        guestUploadsInPeriod
      },
      storageUsage: {
        totalSize: totalStorageAllocated,
        usedSize: totalStorageSize,
        availableSize: totalStorageAllocated - totalStorageSize,
        usageByType: storageByType.map(item => ({
          type: item.mimeType || 'Unknown',
          size: Number(item._sum.size || BigInt(0)),
          count: item._count.id,
          percentage: totalStorageSize > 0 ? (Number(item._sum.size || BigInt(0)) / totalStorageSize) * 100 : 0
        })),
        usageByChannel: storageByChannel.map(channel => ({
          channelId: channel.id,
          channelName: channel.name,
          size: channel.files.reduce((sum, file) => sum + Number(file.size), 0),
          count: channel._count.files,
          guestUploads: channel.files.filter(f => f.uploadedByGuest).length,
          guestSize: channel.files
            .filter(f => f.uploadedByGuest)
            .reduce((sum, file) => sum + Number(file.size), 0),
          guestLinkCount: channel._count.guestUploadLinks,
          percentage: totalStorageSize > 0 ? (channel.files.reduce((sum, file) => sum + Number(file.size), 0) / totalStorageSize) * 100 : 0
        }))
      },
      uploadTrends,
      userActivity: userActivityData,
      channelActivity: channelActivityData,
      guestLinkActivity: guestLinkAnalytics
    };

    const response: ApiResponse = {
      success: true,
      data: analyticsData
    };

    res.status(200).json(response);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to fetch analytics data', 500, 'INTERNAL_ERROR');
  }
};

/**
 * Helper function to get upload trends with guest data
 */
async function getUploadTrendsWithGuests(startDate: Date, endDate: Date) {
  // Get daily upload counts including guest uploads
  const dailyData = await prisma.$queryRaw<Array<{
    date: Date;
    uploads: bigint;
    guest_uploads: bigint;
    size: bigint;
    guest_size: bigint;
    users: bigint;
  }>>`
    SELECT
      DATE(created_at) as date,
      COUNT(*) as uploads,
      COUNT(*) FILTER (WHERE uploaded_by_guest = true) as guest_uploads,
      COALESCE(SUM(size), 0) as size,
      COALESCE(SUM(size) FILTER (WHERE uploaded_by_guest = true), 0) as guest_size,
      COUNT(DISTINCT uploaded_by) FILTER (WHERE uploaded_by_guest = false) as users
    FROM files
    WHERE is_active = true
      AND created_at >= ${startDate}
      AND created_at <= ${endDate}
    GROUP BY DATE(created_at)
    ORDER BY date DESC
    LIMIT 30
  `;

  return {
    daily: dailyData.map(item => ({
      date: item.date.toISOString().split('T')[0],
      uploads: Number(item.uploads),
      guestUploads: Number(item.guest_uploads),
      size: Number(item.size),
      guestSize: Number(item.guest_size),
      users: Number(item.users)
    })),
    weekly: [], // Could be implemented similarly
    monthly: [] // Could be implemented similarly
  };
}

/**
 * Helper function to get user activity data
 */
async function getUserActivityData(startDate: Date, _endDate: Date) {
  const [
    activeUsers,
    newUsers,
    topUsers
  ] = await Promise.all([
    prisma.user.count({
      where: {
        isActive: true,
        lastLoginAt: { gte: startDate }
      }
    }),
    prisma.user.count({
      where: {
        isActive: true,
        createdAt: { gte: startDate }
      }
    }),
    prisma.user.findMany({
      where: { isActive: true },
      include: {
        uploadedFiles: {
          where: {
            isActive: true,
            createdAt: { gte: startDate }
          }
        },
        _count: {
          select: { uploadedFiles: true }
        }
      },
      take: 10
    })
  ]);

  // Get activity by role
  const activityByRole = await prisma.user.groupBy({
    by: ['role'],
    _count: { id: true },
    where: { isActive: true }
  });

  const totalUsers = await prisma.user.count({ where: { isActive: true } });

  return {
    activeUsers,
    newUsers,
    topUsers: topUsers.map(user => ({
      userId: user.id,
      email: user.email,
      uploadCount: user._count.uploadedFiles,
      totalSize: user.uploadedFiles.reduce((sum: number, file: { size: bigint }) => sum + Number(file.size), 0),
      lastActive: user.lastLoginAt?.toISOString() || user.createdAt.toISOString()
    })),
    activityByRole: activityByRole.map(item => ({
      role: item.role,
      count: item._count.id,
      percentage: totalUsers > 0 ? (item._count.id / totalUsers) * 100 : 0
    }))
  };
}

/**
 * Helper function to get channel activity data with guest info
 */
async function getChannelActivityDataWithGuests(startDate: Date, _endDate: Date) {
  const [
    activeChannels,
    topChannels
  ] = await Promise.all([
    prisma.channel.count({
      where: {
        isActive: true,
        files: {
          some: {
            createdAt: { gte: startDate }
          }
        }
      }
    }),
    prisma.channel.findMany({
      where: { isActive: true },
      include: {
        files: {
          where: { isActive: true },
          select: { size: true, uploadedByGuest: true }
        },
        userChannels: {
          include: {
            user: true
          }
        },
        _count: {
          select: {
            files: true,
            userChannels: true,
            guestUploadLinks: { where: { isActive: true } }
          }
        }
      },
      take: 10
    }) as unknown as Array<Channel & {
      files: Array<{ size: bigint; uploadedByGuest: boolean }>;
      userChannels: Array<{ user: User }>;
      _count: { files: number; userChannels: number; guestUploadLinks: number };
    }>
  ]);

  // Get channels by usage distribution
  const channelsByUsage = await prisma.channel.findMany({
    where: { isActive: true },
    include: {
      _count: {
        select: { files: true }
      }
    }
  }) as unknown as Array<Channel & {
    _count: { files: number };
  }>;

  const totalChannels = await prisma.channel.count({ where: { isActive: true } });

  // Group channels by usage levels
  const usageRanges = [
    { name: '0-10 files', min: 0, max: 10 },
    { name: '11-50 files', min: 11, max: 50 },
    { name: '51-100 files', min: 51, max: 100 },
    { name: '100+ files', min: 101, max: Infinity }
  ];

  const channelsByUsageRange = usageRanges.map(range => ({
    name: range.name,
    count: channelsByUsage.filter(ch =>
      ch._count.files >= range.min && ch._count.files <= range.max
    ).length,
    percentage: totalChannels > 0 ?
      (channelsByUsage.filter(ch =>
        ch._count.files >= range.min && ch._count.files <= range.max
      ).length / totalChannels) * 100 : 0
  }));

  return {
    activeChannels,
    topChannels: topChannels.map(channel => ({
      channelId: channel.id,
      name: channel.name,
      fileCount: channel._count.files,
      totalSize: channel.files.reduce((sum: number, file) => sum + Number(file.size), 0),
      userCount: channel._count.userChannels,
      guestLinkCount: channel._count.guestUploadLinks,
      guestFileCount: channel.files.filter(f => f.uploadedByGuest).length,
      guestStorageSize: channel.files
        .filter(f => f.uploadedByGuest)
        .reduce((sum: number, file) => sum + Number(file.size), 0),
      lastActivity: channel.updatedAt.toISOString()
    })),
    channelsByUsage: channelsByUsageRange
  };
}

/**
 * Helper function to get guest link analytics
 */
async function getGuestLinkAnalytics(startDate: Date, endDate: Date) {
  const now = new Date();
  
  // Get guest link statistics
  const [
    totalActiveLinks,
    totalGuestUploads,
    totalGuestStorage,
    topGuestLinks,
    expiringLinks,
    limitReachedLinks
  ] = await Promise.all([
    prisma.guestUploadLink.count({
      where: { isActive: true }
    }),
    prisma.file.count({
      where: {
        isActive: true,
        uploadedByGuest: true,
        createdAt: { gte: startDate, lte: endDate }
      }
    }),
    prisma.file.aggregate({
      where: {
        isActive: true,
        uploadedByGuest: true,
        createdAt: { gte: startDate, lte: endDate }
      },
      _sum: { size: true }
    }),
    prisma.guestUploadLink.findMany({
      where: {
        isActive: true,
        uploadCount: { gt: 0 }
      },
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
            createdAt: { gte: startDate, lte: endDate }
          },
          select: { size: true }
        }
      },
      orderBy: { uploadCount: 'desc' },
      take: 10
    }),
    prisma.guestUploadLink.count({
      where: {
        isActive: true,
        expiresAt: {
          lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // Next 7 days
        }
      }
    }),
    prisma.guestUploadLink.count({
      where: {
        isActive: true,
        AND: [
          { maxUploads: { not: null } },
          { uploadCount: { gte: prisma.guestUploadLink.fields.maxUploads } }
        ]
      }
    })
  ]);

  return {
    totalActiveLinks,
    totalGuestUploads,
    totalGuestStorage: Number(totalGuestStorage._sum.size || BigInt(0)),
    topGuestLinks: topGuestLinks.map(link => ({
      id: link.id,
      description: link.description || 'Unnamed Link',
      channelName: link.channel?.name || 'Unknown Channel',
      uploadCount: link.uploadCount,
      maxUploads: link.maxUploads,
      storageUsed: link.files.reduce((sum, file) => sum + Number(file.size), 0),
      expiresAt: link.expiresAt?.toISOString(),
      createdAt: link.createdAt.toISOString(),
      isExpired: link.expiresAt ? link.expiresAt < now : false,
      isLimitReached: link.maxUploads ? link.uploadCount >= link.maxUploads : false
    })),
    expiringLinks,
    limitReachedLinks
  };
}
/**
 * Get system configuration
 */
export const getSystemConfig = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // For now, return default configuration
    // In a real implementation, this would come from a database or config file
    const config = {
      general: {
        siteName: process.env.SITE_NAME || 'ChannelDrop',
        siteDescription: process.env.SITE_DESCRIPTION || 'Secure file sharing platform',
        defaultLanguage: process.env.DEFAULT_LANGUAGE || 'en',
        timezone: process.env.TIMEZONE || 'UTC',
        maintenanceMode: process.env.MAINTENANCE_MODE === 'true' || false,
        maintenanceMessage: process.env.MAINTENANCE_MESSAGE || 'System under maintenance. Please try again later.'
      },
      storage: {
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5368709120'), // 5GB
        maxStoragePerUser: parseInt(process.env.MAX_STORAGE_PER_USER || '53687091200'), // 50GB
        maxStoragePerChannel: parseInt(process.env.MAX_STORAGE_PER_CHANNEL || '107374182400'), // 100GB
        allowedFileTypes: (process.env.ALLOWED_FILE_TYPES || 'image/*,video/*,audio/*,application/pdf,text/*').split(','),
        autoCleanupEnabled: process.env.AUTO_CLEANUP_ENABLED === 'true' || false,
        autoCleanupDays: parseInt(process.env.AUTO_CLEANUP_DAYS || '30')
      },
      security: {
        passwordMinLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '8'),
        passwordRequireUppercase: process.env.PASSWORD_REQUIRE_UPPERCASE !== 'false',
        passwordRequireLowercase: process.env.PASSWORD_REQUIRE_LOWERCASE !== 'false',
        passwordRequireNumbers: process.env.PASSWORD_REQUIRE_NUMBERS !== 'false',
        passwordRequireSpecialChars: process.env.PASSWORD_REQUIRE_SPECIAL_CHARS !== 'false',
        sessionTimeoutMinutes: parseInt(process.env.SESSION_TIMEOUT_MINUTES || '60'),
        maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5'),
        lockoutDurationMinutes: parseInt(process.env.LOCKOUT_DURATION_MINUTES || '15'),
        twoFactorEnabled: process.env.TWO_FACTOR_ENABLED === 'true' || false
      },
      email: {
        smtpHost: process.env.SMTP_HOST || '',
        smtpPort: parseInt(process.env.SMTP_PORT || '587'),
        smtpSecure: process.env.SMTP_SECURE === 'true' || false,
        smtpUser: process.env.SMTP_USER || '',
        smtpPassword: process.env.SMTP_PASSWORD || '',
        fromEmail: process.env.FROM_EMAIL || '',
        fromName: process.env.FROM_NAME || 'ChannelDrop',
        emailNotificationsEnabled: process.env.EMAIL_NOTIFICATIONS_ENABLED !== 'false'
      },
      notifications: {
        emailOnUserRegistration: process.env.EMAIL_ON_USER_REGISTRATION !== 'false',
        emailOnFileUpload: process.env.EMAIL_ON_FILE_UPLOAD === 'true' || false,
        emailOnChannelCreation: process.env.EMAIL_ON_CHANNEL_CREATION === 'true' || false,
        emailOnSystemAlert: process.env.EMAIL_ON_SYSTEM_ALERT !== 'false',
        webhookEnabled: process.env.WEBHOOK_ENABLED === 'true' || false,
        webhookUrl: process.env.WEBHOOK_URL || ''
      },
      backup: {
        autoBackupEnabled: process.env.AUTO_BACKUP_ENABLED === 'true' || false,
        backupFrequency: process.env.BACKUP_FREQUENCY || 'daily',
        retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '30'),
        backupLocation: process.env.BACKUP_LOCATION || './backups'
      }
    };

    const response: ApiResponse = {
      success: true,
      data: config
    };

    res.status(200).json(response);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to fetch system configuration', 500, 'INTERNAL_ERROR');
  }
};

/**
 * Update system configuration
 */
export const updateSystemConfig = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const config = req.body;

    // Log the configuration update
    await auditService.recordEvent({
      action: 'UPDATE_SYSTEM_CONFIG',
      entityType: 'SYSTEM',
      entityId: 'config',
      actorId: req.user!.id,
      metadata: {
        updatedFields: Object.keys(config)
      }
    });

    // In a real implementation, you would:
    // 1. Validate the configuration
    // 2. Save to database or update environment variables
    // 3. Apply the changes (restart services if needed)
    
    // For now, just return success
    const response: ApiResponse = {
      success: true,
      data: { message: 'System configuration updated successfully' }
    };

    res.status(200).json(response);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to update system configuration', 500, 'INTERNAL_ERROR');
  }
};

/**
 * Get guest link cleanup statistics
 */
export const getGuestLinkCleanupStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const cleanupService = new GuestLinkCleanupService(prisma);
    const stats = await cleanupService.getCleanupStats();

    const response: ApiResponse = {
      success: true,
      data: stats
    };

    res.status(200).json(response);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to fetch cleanup statistics', 500, 'INTERNAL_ERROR');
  }
};

/**
 * Manually trigger guest link cleanup
 */
export const triggerGuestLinkCleanup = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const cleanupService = new GuestLinkCleanupService(prisma);
    const result = await cleanupService.cleanupExpiredLinks();

    // Log the manual cleanup trigger
    await auditService.recordEvent({
      action: 'TRIGGER_GUEST_LINK_CLEANUP',
      entityType: 'SYSTEM',
      entityId: 'guest_link_cleanup',
      actorId: req.user!.id,
      metadata: {
        deactivatedCount: result.deactivatedCount,
        deletedCount: result.deletedCount,
        errorCount: result.errors.length,
        errors: result.errors
      }
    });

    const response: ApiResponse = {
      success: true,
      data: {
        message: 'Guest link cleanup completed successfully',
        result
      }
    };

    res.status(200).json(response);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to trigger guest link cleanup', 500, 'INTERNAL_ERROR');
  }
};