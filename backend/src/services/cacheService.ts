import { redis } from '../app';
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';

export class CacheService {
  private static readonly DEFAULT_TTL = 300; // 5 minutes
  private static readonly USER_CHANNELS_TTL = 600; // 10 minutes
  private static readonly SYSTEM_STATS_TTL = 60; // 1 minute
  private static readonly FILE_METADATA_TTL = 3600; // 1 hour
  private static readonly FILE_PREVIEW_TTL = 7200; // 2 hours
  private static readonly THUMBNAIL_TTL = 86400; // 24 hours
  private static readonly CONTENT_CHUNK_TTL = 3600; // 1 hour

  /**
   * Get cached value with automatic JSON parsing
   */
  static async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await redis.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set cached value with automatic JSON stringification
   */
  static async set(key: string, value: any, ttl: number = this.DEFAULT_TTL): Promise<void> {
    try {
      await redis.setEx(key, ttl, JSON.stringify(value));
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
    }
  }

  /**
   * Delete cached value
   */
  static async del(key: string): Promise<void> {
    try {
      await redis.del(key);
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
    }
  }

  /**
   * Invalidate cache pattern
   */
  static async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(keys);
      }
    } catch (error) {
      logger.error(`Cache invalidate pattern error for ${pattern}:`, error);
    }
  }

  /**
   * Cache user channels with proper invalidation
   */
  static async getUserChannels(userId: string, prisma: PrismaClient): Promise<any[]> {
    const cacheKey = `user:${userId}:channels`;
    
    // Try to get from cache first
    const cached = await this.get<any[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch from database
    const channels = await prisma.channel.findMany({
      where: {
        isActive: true,
        userChannels: {
          some: {
            userId,
          },
        },
      },
      include: {
        _count: {
          select: {
            files: {
              where: {
                isActive: true,
              },
            },
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Cache the result
    await this.set(cacheKey, channels, this.USER_CHANNELS_TTL);
    
    return channels;
  }

  /**
   * Cache system statistics
   */
  static async getSystemStats(prisma: PrismaClient): Promise<any> {
    const cacheKey = 'system:stats';
    
    // Try to get from cache first
    const cached = await this.get<any>(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch from database
    const [
      totalUsers,
      activeUsers,
      totalChannels,
      activeChannels,
      totalFiles,
      totalStorage,
      recentActivity,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.channel.count(),
      prisma.channel.count({ where: { isActive: true } }),
      prisma.file.count({ where: { isActive: true } }),
      prisma.file.aggregate({
        where: { isActive: true },
        _sum: { size: true },
      }),
      prisma.file.count({
        where: {
          isActive: true,
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
      }),
    ]);

    const stats = {
      totalUsers,
      activeUsers,
      totalChannels,
      activeChannels,
      totalFiles,
      totalStorage: totalStorage._sum.size?.toString() || '0',
      recentActivity,
      storageUsageGB: Number(totalStorage._sum.size || BigInt(0)) / (1024 * 1024 * 1024),
      avgFileSize: totalFiles > 0 
        ? Number(totalStorage._sum.size || BigInt(0)) / totalFiles 
        : 0,
    };

    // Cache the result
    await this.set(cacheKey, stats, this.SYSTEM_STATS_TTL);
    
    return stats;
  }

  /**
   * Cache channel file list with pagination
   */
  static async getChannelFiles(
    channelId: string,
    page: number,
    limit: number,
    prisma: PrismaClient
  ): Promise<any> {
    const cacheKey = `channel:${channelId}:files:${page}:${limit}`;
    
    // Try to get from cache first
    const cached = await this.get<any>(cacheKey);
    if (cached) {
      return cached;
    }

    const skip = (page - 1) * limit;
    
    const [files, total] = await Promise.all([
      prisma.file.findMany({
        where: {
          channelId,
          isActive: true,
        },
        include: {
          uploader: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.file.count({
        where: {
          channelId,
          isActive: true,
        },
      }),
    ]);

    const result = {
      files: files.map(file => ({
        ...file,
        size: file.size.toString(),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    // Cache the result with shorter TTL for file lists
    await this.set(cacheKey, result, 180); // 3 minutes
    
    return result;
  }

  /**
   * Invalidate user-specific caches
   */
  static async invalidateUserCaches(userId: string): Promise<void> {
    await Promise.all([
      this.invalidatePattern(`user:${userId}:*`),
    ]);
  }

  /**
   * Invalidate channel-specific caches
   */
  static async invalidateChannelCaches(channelId: string): Promise<void> {
    await Promise.all([
      this.invalidatePattern(`channel:${channelId}:*`),
      this.invalidatePattern('system:stats'),
    ]);
  }

  /**
   * Invalidate all file-related caches
   */
  static async invalidateFileCaches(): Promise<void> {
    await Promise.all([
      this.invalidatePattern('channel:*:files:*'),
      this.invalidatePattern('system:stats'),
    ]);
  }

  /**
   * Cache file metadata for progressive loading
   */
  static async getFileMetadata(fileId: string, prisma: PrismaClient): Promise<any | null> {
    const cacheKey = `file:${fileId}:metadata`;
    
    // Try to get from cache first
    const cached = await this.get<any>(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch from database
    const file = await prisma.file.findUnique({
      where: { id: fileId },
      select: {
        id: true,
        size: true,
        mimeType: true,
        filename: true,
        originalName: true,
      },
    });

    if (!file) {
      return null;
    }

    const fileSize = Number(file.size);
    const chunkSize = 1024 * 1024; // 1MB chunks
    const totalChunks = Math.ceil(fileSize / chunkSize);
    
    const metadata = {
      size: fileSize,
      mimeType: file.mimeType || 'application/octet-stream',
      supportsChunking: fileSize > chunkSize,
      chunkSize,
      totalChunks,
      filename: file.filename,
      originalName: file.originalName,
    };

    // Cache the result
    await this.set(cacheKey, metadata, this.FILE_METADATA_TTL);
    
    return metadata;
  }

  /**
   * Cache file preview information
   */
  static async getFilePreview(fileId: string, previewData: any): Promise<void> {
    const cacheKey = `file:${fileId}:preview`;
    await this.set(cacheKey, previewData, this.FILE_PREVIEW_TTL);
  }

  /**
   * Get cached file preview
   */
  static async getCachedFilePreview(fileId: string): Promise<any | null> {
    const cacheKey = `file:${fileId}:preview`;
    return await this.get<any>(cacheKey);
  }

  /**
   * Cache thumbnail availability
   */
  static async cacheThumbnailAvailability(
    fileId: string, 
    size: string, 
    available: boolean
  ): Promise<void> {
    const cacheKey = `file:${fileId}:thumbnail:${size}:available`;
    await this.set(cacheKey, available, this.THUMBNAIL_TTL);
  }

  /**
   * Check cached thumbnail availability
   */
  static async isThumbnailAvailable(fileId: string, size: string): Promise<boolean | null> {
    const cacheKey = `file:${fileId}:thumbnail:${size}:available`;
    return await this.get<boolean>(cacheKey);
  }

  /**
   * Cache content chunk metadata
   */
  static async cacheContentChunk(
    fileId: string, 
    chunkIndex: number, 
    chunkData: Buffer
  ): Promise<void> {
    const cacheKey = `file:${fileId}:chunk:${chunkIndex}`;
    // Store as base64 string for Redis compatibility
    const chunkString = chunkData.toString('base64');
    await this.set(cacheKey, chunkString, this.CONTENT_CHUNK_TTL);
  }

  /**
   * Get cached content chunk
   */
  static async getCachedContentChunk(fileId: string, chunkIndex: number): Promise<Buffer | null> {
    const cacheKey = `file:${fileId}:chunk:${chunkIndex}`;
    const cached = await this.get<string>(cacheKey);
    
    if (cached) {
      return Buffer.from(cached, 'base64');
    }
    
    return null;
  }

  /**
   * Cache API response with automatic key generation
   */
  static async cacheApiResponse(
    endpoint: string, 
    params: Record<string, any>, 
    response: any, 
    ttl?: number
  ): Promise<void> {
    const paramString = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|');
    
    const cacheKey = `api:${endpoint}:${paramString}`;
    await this.set(cacheKey, response, ttl || this.DEFAULT_TTL);
  }

  /**
   * Get cached API response
   */
  static async getCachedApiResponse(
    endpoint: string, 
    params: Record<string, any>
  ): Promise<any | null> {
    const paramString = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|');
    
    const cacheKey = `api:${endpoint}:${paramString}`;
    return await this.get<any>(cacheKey);
  }

  /**
   * Invalidate file-specific caches
   */
  static async invalidateFileSpecificCaches(fileId: string): Promise<void> {
    await Promise.all([
      this.invalidatePattern(`file:${fileId}:*`),
    ]);
  }

  /**
   * Invalidate API response caches for specific endpoint
   */
  static async invalidateApiCaches(endpoint: string): Promise<void> {
    await this.invalidatePattern(`api:${endpoint}:*`);
  }

  /**
   * Get cache statistics
   */
  static async getCacheStats(): Promise<{
    totalKeys: number;
    memoryUsage: string;
    hitRate: number;
  }> {
    try {
      const info = await redis.info('memory');
      const keyspace = await redis.info('keyspace');
      const stats = await redis.info('stats');
      
      // Parse memory usage
      const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/);
      const memoryUsage = memoryMatch ? memoryMatch[1] : 'Unknown';
      
      // Parse total keys
      const keysMatch = keyspace.match(/keys=(\d+)/);
      const totalKeys = keysMatch ? parseInt(keysMatch[1], 10) : 0;
      
      // Parse hit rate
      const hitsMatch = stats.match(/keyspace_hits:(\d+)/);
      const missesMatch = stats.match(/keyspace_misses:(\d+)/);
      const hits = hitsMatch ? parseInt(hitsMatch[1], 10) : 0;
      const misses = missesMatch ? parseInt(missesMatch[1], 10) : 0;
      const hitRate = hits + misses > 0 ? (hits / (hits + misses)) * 100 : 0;
      
      return {
        totalKeys,
        memoryUsage,
        hitRate: Math.round(hitRate * 100) / 100,
      };
    } catch (error) {
      logger.error('Error getting cache stats:', error);
      return {
        totalKeys: 0,
        memoryUsage: 'Unknown',
        hitRate: 0,
      };
    }
  }

  /**
   * Health check for cache service
   */
  static async healthCheck(): Promise<{ status: string; latency: number }> {
    const start = Date.now();
    
    try {
      const testKey = 'health:check';
      await redis.set(testKey, 'test', { EX: 10 });
      const value = await redis.get(testKey);
      await redis.del(testKey);
      
      const latency = Date.now() - start;
      
      return {
        status: value === 'test' ? 'healthy' : 'unhealthy',
        latency,
      };
    } catch {
      return {
        status: 'unhealthy',
        latency: Date.now() - start,
      };
    }
  }
}

export default CacheService;
