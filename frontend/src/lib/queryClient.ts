import { QueryClient } from '@tanstack/react-query';

// Create a query client with optimized defaults for caching
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 5 minutes by default
      staleTime: 5 * 60 * 1000,
      // Keep data in cache for 30 minutes (increased for better caching)
      gcTime: 30 * 60 * 1000,
      // Retry failed requests 3 times with exponential backoff
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors (client errors)
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
      // Retry with exponential backoff
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch on window focus for critical data only
      refetchOnWindowFocus: false,
      // Refetch on reconnect for real-time data
      refetchOnReconnect: 'always',
      // Network mode for better offline handling
      networkMode: 'online',
    },
    mutations: {
      // Retry mutations once for network errors
      retry: (failureCount, error: any) => {
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false;
        }
        return failureCount < 1;
      },
      // Network mode for mutations
      networkMode: 'online',
    },
  },
});

// Query keys factory for consistent cache keys
export const queryKeys = {
  // Files
  files: {
    all: ['files'] as const,
    lists: () => [...queryKeys.files.all, 'list'] as const,
    list: (filters?: any) => [...queryKeys.files.lists(), filters] as const,
    details: () => [...queryKeys.files.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.files.details(), id] as const,
    previews: () => [...queryKeys.files.all, 'preview'] as const,
    preview: (id: string) => [...queryKeys.files.previews(), id] as const,
    thumbnails: () => [...queryKeys.files.all, 'thumbnail'] as const,
    thumbnail: (id: string, size?: 'small' | 'medium' | 'large') => 
      [...queryKeys.files.thumbnails(), id, size || 'medium'] as const,
    content: () => [...queryKeys.files.all, 'content'] as const,
    contentChunk: (id: string, chunkIndex: number) => 
      [...queryKeys.files.content(), id, chunkIndex] as const,
  },
  // Channels
  channels: {
    all: ['channels'] as const,
    lists: () => [...queryKeys.channels.all, 'list'] as const,
    list: (filters?: any) => [...queryKeys.channels.lists(), filters] as const,
    details: () => [...queryKeys.channels.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.channels.details(), id] as const,
  },
  // Users
  users: {
    all: ['users'] as const,
    lists: () => [...queryKeys.users.all, 'list'] as const,
    list: (filters?: any) => [...queryKeys.users.lists(), filters] as const,
    details: () => [...queryKeys.users.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.users.details(), id] as const,
    current: () => [...queryKeys.users.all, 'current'] as const,
  },
  // Admin
  admin: {
    all: ['admin'] as const,
    stats: () => [...queryKeys.admin.all, 'stats'] as const,
    health: () => [...queryKeys.admin.all, 'health'] as const,
    analytics: () => [...queryKeys.admin.all, 'analytics'] as const,
  },
  // Cache management
  cache: {
    all: ['cache'] as const,
    stats: () => [...queryKeys.cache.all, 'stats'] as const,
    clear: () => [...queryKeys.cache.all, 'clear'] as const,
  },
} as const;

// Cache configuration for different data types
export const cacheConfig = {
  // File lists - moderate caching since they change frequently
  fileLists: {
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  },
  // Individual files - longer caching since metadata doesn't change often
  fileDetails: {
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  },
  // File previews - very long caching since content doesn't change
  filePreviews: {
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 4 * 60 * 60 * 1000, // 4 hours
  },
  // Thumbnails - extremely long caching since they rarely change
  thumbnails: {
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    gcTime: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
  // File content chunks - very long caching for progressive loading
  contentChunks: {
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
  },
  // User data - moderate caching
  userData: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  },
  // Channel data - longer caching since it changes less frequently
  channelData: {
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
  },
} as const;