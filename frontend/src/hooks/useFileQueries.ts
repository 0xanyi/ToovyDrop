import React from 'react';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { fileService } from '../services/fileService';
import { queryKeys, cacheConfig } from '../lib/queryClient';
import { FileFilters } from '../types';
import toast from 'react-hot-toast';

// File list query with infinite loading and optimized caching
export const useInfiniteFiles = (filters?: FileFilters) => {
  return useInfiniteQuery({
    queryKey: queryKeys.files.list(filters),
    queryFn: ({ pageParam = 1 }) => fileService.getFiles(pageParam, 20, filters),
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.page < lastPage.pagination.totalPages) {
        return lastPage.pagination.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    ...cacheConfig.fileLists,
    // Prefetch next page when user is near the end
    getPreviousPageParam: (firstPage) => {
      return firstPage.pagination.page > 1 ? firstPage.pagination.page - 1 : undefined;
    },
  });
};

// File list query (paginated) with optimized caching
export const useFiles = (page: number = 1, limit: number = 20, filters?: FileFilters) => {
  return useQuery({
    queryKey: queryKeys.files.list({ page, limit, ...filters }),
    queryFn: () => fileService.getFiles(page, limit, filters),
    ...cacheConfig.fileLists,
  });
};

// Single file query with optimized caching
export const useFile = (fileId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: queryKeys.files.detail(fileId),
    queryFn: () => fileService.getFile(fileId),
    enabled: enabled && !!fileId,
    ...cacheConfig.fileDetails,
  });
};

// File preview query with enhanced caching and error handling
export const useFilePreview = (fileId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: queryKeys.files.preview(fileId),
    queryFn: () => fileService.getFilePreview(fileId),
    enabled: enabled && !!fileId,
    ...cacheConfig.filePreviews,
    retry: 3, // Retry preview generation more times
    retryDelay: (attemptIndex) => Math.min(2000 * 2 ** attemptIndex, 10000),
  });
};

// File thumbnail query with multiple sizes and enhanced caching
export const useFileThumbnail = (
  fileId: string, 
  size: 'small' | 'medium' | 'large' = 'medium',
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: queryKeys.files.thumbnail(fileId, size),
    queryFn: async () => {
      return await fileService.getThumbnailBlob(fileId, size);
    },
    enabled: enabled && !!fileId,
    ...cacheConfig.thumbnails,
    retry: 2,
  });
};

// File deletion mutation
export const useDeleteFile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (fileId: string) => fileService.deleteFile(fileId),
    onSuccess: (_, fileId) => {
      // Invalidate file lists
      queryClient.invalidateQueries({ queryKey: queryKeys.files.lists() });
      // Remove the specific file from cache
      queryClient.removeQueries({ queryKey: queryKeys.files.detail(fileId) });
      queryClient.removeQueries({ queryKey: queryKeys.files.preview(fileId) });
      queryClient.removeQueries({ queryKey: queryKeys.files.thumbnail(fileId) });
      
      toast.success('File deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete file');
    },
  });
};

// Bulk file deletion mutation
export const useDeleteFiles = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (fileIds: string[]) => fileService.deleteMultipleFiles(fileIds),
    onSuccess: (_, fileIds) => {
      // Invalidate file lists
      queryClient.invalidateQueries({ queryKey: queryKeys.files.lists() });
      // Remove specific files from cache
      fileIds.forEach(fileId => {
        queryClient.removeQueries({ queryKey: queryKeys.files.detail(fileId) });
        queryClient.removeQueries({ queryKey: queryKeys.files.preview(fileId) });
        queryClient.removeQueries({ queryKey: queryKeys.files.thumbnail(fileId) });
      });
      
      toast.success(`${fileIds.length} files deleted successfully`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete files');
    },
  });
};

// File rename mutation
export const useRenameFile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ fileId, newName }: { fileId: string; newName: string }) =>
      fileService.renameFile(fileId, newName),
    onSuccess: (_, { fileId }) => {
      // Invalidate file lists and specific file
      queryClient.invalidateQueries({ queryKey: queryKeys.files.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.files.detail(fileId) });
      
      toast.success('File renamed successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to rename file');
    },
  });
};

// File move mutation
export const useMoveFiles = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ fileIds, channelId }: { fileIds: string[]; channelId: string }) =>
      fileService.moveFiles(fileIds, channelId),
    onSuccess: (_, { fileIds }) => {
      // Invalidate file lists
      queryClient.invalidateQueries({ queryKey: queryKeys.files.lists() });
      // Invalidate specific files
      fileIds.forEach(fileId => {
        queryClient.invalidateQueries({ queryKey: queryKeys.files.detail(fileId) });
      });
      
      toast.success(`${fileIds.length} files moved successfully`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to move files');
    },
  });
};

// File metadata update mutation
export const useUpdateFileMetadata = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      fileId, 
      metadata 
    }: { 
      fileId: string; 
      metadata: { originalName?: string; description?: string } 
    }) => fileService.updateFileMetadata(fileId, metadata),
    onSuccess: (updatedFile, { fileId }) => {
      // Update the file in cache
      queryClient.setQueryData(queryKeys.files.detail(fileId), updatedFile);
      // Invalidate file lists to show updated data
      queryClient.invalidateQueries({ queryKey: queryKeys.files.lists() });
      
      toast.success('File updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update file');
    },
  });
};

// Prefetch file preview
export const usePrefetchFilePreview = () => {
  const queryClient = useQueryClient();

  return (fileId: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.files.preview(fileId),
      queryFn: () => fileService.getFilePreview(fileId),
      staleTime: 30 * 60 * 1000, // 30 minutes
    });
  };
};

// File metadata query for progressive loading
export const useFileMetadata = (fileId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: queryKeys.files.detail(fileId),
    queryFn: () => fileService.getFileMetadata(fileId),
    enabled: enabled && !!fileId,
    ...cacheConfig.fileDetails,
  });
};

// File content chunk query for progressive loading
export const useFileContentChunk = (
  fileId: string, 
  chunkIndex: number, 
  chunkSize: number = 1024 * 1024,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: queryKeys.files.contentChunk(fileId, chunkIndex),
    queryFn: () => fileService.getFileContentChunk(fileId, chunkIndex, chunkSize),
    enabled: enabled && !!fileId && chunkIndex >= 0,
    ...cacheConfig.contentChunks,
    retry: 2,
  });
};

// Progressive file loading hook
export const useProgressiveFileLoading = (fileId: string, enabled: boolean = true) => {
  const { data: metadata } = useFileMetadata(fileId, enabled);
  const [loadedChunks, setLoadedChunks] = React.useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = React.useState(false);
  const queryClient = useQueryClient();

  const loadChunk = React.useCallback(async (chunkIndex: number) => {
    if (!metadata || loadedChunks.has(chunkIndex)) return;

    setIsLoading(true);
    try {
      await queryClient.prefetchQuery({
        queryKey: queryKeys.files.contentChunk(fileId, chunkIndex),
        queryFn: () => fileService.getFileContentChunk(fileId, chunkIndex, metadata.chunkSize),
        ...cacheConfig.contentChunks,
      });
      setLoadedChunks(prev => new Set([...prev, chunkIndex]));
    } catch (error) {
      console.error(`Failed to load chunk ${chunkIndex}:`, error);
    } finally {
      setIsLoading(false);
    }
  }, [fileId, metadata, loadedChunks, queryClient]);

  const loadNextChunks = React.useCallback((count: number = 3) => {
    if (!metadata) return;

    const nextChunks = Array.from({ length: count }, (_, i) => {
      const nextIndex = loadedChunks.size + i;
      return nextIndex < metadata.totalChunks ? nextIndex : -1;
    }).filter(index => index >= 0);

    nextChunks.forEach(loadChunk);
  }, [metadata, loadedChunks, loadChunk]);

  return {
    metadata,
    loadedChunks: Array.from(loadedChunks),
    totalChunks: metadata?.totalChunks || 0,
    isLoading,
    loadChunk,
    loadNextChunks,
    progress: metadata ? (loadedChunks.size / metadata.totalChunks) * 100 : 0,
  };
};

// Prefetch file thumbnail with multiple sizes
export const usePrefetchFileThumbnail = () => {
  const queryClient = useQueryClient();

  return (fileId: string, sizes: ('small' | 'medium' | 'large')[] = ['medium']) => {
    sizes.forEach(size => {
      queryClient.prefetchQuery({
        queryKey: queryKeys.files.thumbnail(fileId, size),
        queryFn: async () => {
          return await fileService.getThumbnailBlob(fileId, size);
        },
        ...cacheConfig.thumbnails,
      });
    });
  };
};