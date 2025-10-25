import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import {
  Search,
  Filter,
  Download,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Grid,
  List as ListIcon,
  LayoutGrid,
  FileText,
  Image,
  Film,
  Music,
  Archive,
  CheckSquare,
  Square,
  Edit2,
  Share2,
  Copy,
  X,
  HardDrive,
  Clock,
  Star
} from 'lucide-react';
import { fileService } from '../services/fileService';
import { File as FileType, FileFilters } from '../types';
import { useSwipeGestures, useIsMobile, useIsTouchDevice } from '../hooks/useSwipeGestures';
import { useScreenReader, generateId } from '../hooks/useAccessibility';
import { cn } from '../design-system/utils';
import toast from 'react-hot-toast';
import RenameFileModal from './RenameFileModal';

interface EnhancedFileListProps {
  channelId?: string;
  onFileSelect?: (file: FileType) => void;
  onFilesChange?: (files: FileType[]) => void;
  onRename?: (file: FileType) => void;
  className?: string;
}

type ViewMode = 'list' | 'grid' | 'card';
type SmartView = 'all' | 'recent' | 'favorites' | 'images' | 'videos' | 'documents';

interface FileItemProps {
  file: FileType;
  view: ViewMode;
  isSelected: boolean;
  onSelect: (fileId: string, selected: boolean) => void;
  onPreview: (file: FileType) => void;
  onDownload: (file: FileType) => void;
  onDelete: (file: FileType) => void;
  onRename: (file: FileType) => void;
  onShare: (file: FileType) => void;
  onCopy: (file: FileType) => void;
  onToggleFavorite: (file: FileType) => void;
  showActions?: boolean;
  style?: React.CSSProperties;
}

const FileItem: React.FC<FileItemProps> = ({
  file,
  view,
  isSelected,
  onSelect,
  onPreview,
  onDownload,
  onDelete,
  onRename,
  onShare,
  onCopy,
  onToggleFavorite,
  showActions = true,
  style
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [imageError, setImageError] = useState(false);
  const isMobile = useIsMobile();
  const isTouchDevice = useIsTouchDevice();

  // Swipe gestures for mobile file actions
  const { swipeHandlers } = useSwipeGestures({
    onSwipeLeft: () => {
      if (isMobile && fileService.isPreviewable(file.mimeType)) {
        onPreview(file);
      }
    },
    onSwipeRight: () => {
      if (isMobile) {
        onSelect(file.id, !isSelected);
      }
    },
    threshold: 80,
    preventScroll: false
  });

  const { icon: iconName, color: iconColor } = fileService.getFileIcon(file.mimeType);
  const IconComponent = (() => {
    switch (iconName) {
      case 'image': return Image;
      case 'video': return Film;
      case 'music': return Music;
      case 'archive': return Archive;
      default: return FileText;
    }
  })();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isPreviewable = fileService.isPreviewable(file.mimeType);
  const isImage = file.mimeType?.startsWith('image/');
  const thumbnailUrl = isImage ? fileService.generateThumbnailUrl(file.id) : null;

  // Card view
  if (view === 'card') {
    return (
      <div
        style={style}
        className={cn(
          'relative bg-white rounded-xl border border-gray-200 hover:shadow-lg transition-all duration-200 cursor-pointer group',
          'p-4 sm:p-6', // Responsive padding
          'swipeable', // Enable swipe gestures
          isSelected ? 'ring-2 ring-blue-500 border-blue-500 shadow-md' : 'hover:border-gray-300',
          isTouchDevice && 'active:scale-95'
        )}
        onClick={() => onSelect(file.id, !isSelected)}
        {...(isMobile ? swipeHandlers : {})}
      >
        {/* Selection checkbox */}
        <div className="absolute top-2 sm:top-3 left-2 sm:left-3 z-10">
          <button
            className={cn(
              'rounded-lg border transition-all duration-200',
              'touch-target-comfortable flex items-center justify-center',
              isSelected
                ? 'bg-blue-500 border-blue-500 text-white shadow-sm'
                : 'bg-white border-gray-300 text-gray-400 hover:border-gray-400 hover:bg-gray-50'
            )}
          >
            {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
          </button>
        </div>

        {/* Actions menu */}
        {showActions && (
          <div className={cn(
            'absolute top-2 sm:top-3 right-2 sm:right-3 z-10 transition-opacity',
            isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          )}>
            <div className="relative">
              <button
                className={cn(
                  'rounded-lg bg-white border border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-all duration-200 shadow-sm',
                  'touch-target-comfortable flex items-center justify-center'
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {showMenu && (
                <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
                  {isPreviewable && (
                    <button
                      className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPreview(file);
                        setShowMenu(false);
                      }}
                    >
                      <Eye className="w-4 h-4 mr-3" />
                      Preview
                    </button>
                  )}
                  <button
                    className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDownload(file);
                      setShowMenu(false);
                    }}
                  >
                    <Download className="w-4 h-4 mr-3" />
                    Download
                  </button>
                  <button
                    className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      onShare(file);
                      setShowMenu(false);
                    }}
                  >
                    <Share2 className="w-4 h-4 mr-3" />
                    Share
                  </button>
                  <button
                    className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCopy(file);
                      setShowMenu(false);
                    }}
                  >
                    <Copy className="w-4 h-4 mr-3" />
                    Copy link
                  </button>
                  <button
                    className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRename(file);
                      setShowMenu(false);
                    }}
                  >
                    <Edit2 className="w-4 h-4 mr-3" />
                    Rename
                  </button>
                  <button
                    className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(file);
                      setShowMenu(false);
                    }}
                  >
                    <Star className="w-4 h-4 mr-3" />
                    Add to favorites
                  </button>
                  <div className="border-t border-gray-100 my-1"></div>
                  <button
                    className="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(file);
                      setShowMenu(false);
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-3" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* File preview/thumbnail */}
        <div className="flex flex-col items-center space-y-4 mt-8">
          <div className="relative">
            {thumbnailUrl && !imageError ? (
              <div className="w-24 h-24 rounded-lg overflow-hidden bg-gray-100">
                <img
                  src={thumbnailUrl}
                  alt={file.originalName}
                  className="w-full h-full object-cover"
                  onError={() => setImageError(true)}
                />
              </div>
            ) : (
              <div className={`p-6 rounded-lg bg-gray-50 ${iconColor}`}>
                <IconComponent className="w-12 h-12" />
              </div>
            )}
          </div>

          <div className="text-center w-full">
            <p 
              className="text-sm font-medium text-gray-900 truncate max-w-[200px] mx-auto mb-2" 
              title={file.originalName}
            >
              {file.originalName.length > 30 
                ? `${file.originalName.substring(0, 27)}...` 
                : file.originalName}
            </p>
            <div className="space-y-1">
              <p className="text-xs text-gray-500 flex items-center justify-center">
                <HardDrive className="w-3 h-3 mr-1" />
                {fileService.formatFileSize(file.size)}
              </p>
              <p className="text-xs text-gray-400 flex items-center justify-center">
                <Clock className="w-3 h-3 mr-1" />
                {formatDate(file.createdAt)}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Grid view
  if (view === 'grid') {
    return (
      <div
        style={style}
        className={`
          relative bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all duration-200 cursor-pointer group
          ${isSelected ? 'ring-2 ring-blue-500 border-blue-500' : 'hover:border-gray-300'}
        `}
        onClick={() => onSelect(file.id, !isSelected)}
      >
        {/* Selection checkbox */}
        <div className="absolute top-2 left-2 z-10">
          <button
            className={`
              p-1 rounded-md border transition-colors
              ${isSelected
                ? 'bg-blue-500 border-blue-500 text-white'
                : 'bg-white border-gray-300 text-gray-400 hover:border-gray-400'
              }
            `}
          >
            {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
          </button>
        </div>

        {/* Quick actions on hover */}
        {showActions && (
          <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
            {isPreviewable && (
              <button
                className="p-1 rounded-md bg-white border border-gray-200 text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors shadow-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onPreview(file);
                }}
                title="Preview"
              >
                <Eye className="w-3 h-3" />
              </button>
            )}
            <button
              className="p-1 rounded-md bg-white border border-gray-200 text-gray-500 hover:text-green-600 hover:bg-green-50 transition-colors shadow-sm"
              onClick={(e) => {
                e.stopPropagation();
                onDownload(file);
              }}
              title="Download"
            >
              <Download className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* File icon and preview */}
        <div className="flex flex-col items-center space-y-3 mt-6">
          {thumbnailUrl && !imageError ? (
            <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
              <img
                src={thumbnailUrl}
                alt={file.originalName}
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
            </div>
          ) : (
            <div className={`p-3 rounded-lg bg-gray-50 ${iconColor}`}>
              <IconComponent className="w-8 h-8" />
            </div>
          )}

          <div className="text-center w-full">
            <p 
              className="text-sm font-medium text-gray-900 truncate max-w-[150px] mx-auto" 
              title={file.originalName}
            >
              {file.originalName.length > 20 
                ? `${file.originalName.substring(0, 17)}...` 
                : file.originalName}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {fileService.formatFileSize(file.size)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div
      style={style}
      className={`
        bg-white border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer group
        ${isSelected ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50' : ''}
      `}
      onClick={() => onSelect(file.id, !isSelected)}
    >
      <div className="flex items-center space-x-4">
        {/* Selection checkbox */}
        <button
          className={`
            p-1 rounded border transition-colors flex-shrink-0
            ${isSelected
              ? 'bg-blue-500 border-blue-500 text-white'
              : 'bg-white border-gray-300 text-gray-400 hover:border-gray-400'
            }
          `}
        >
          {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
        </button>

        {/* File thumbnail/icon */}
        <div className="flex-shrink-0">
          {thumbnailUrl && !imageError ? (
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100">
              <img
                src={thumbnailUrl}
                alt={file.originalName}
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
            </div>
          ) : (
            <div className={`p-2 rounded-lg bg-gray-50 ${iconColor}`}>
              <IconComponent className="w-5 h-5" />
            </div>
          )}
        </div>

        {/* File info */}
        <div className="flex-1 min-w-0">
          <p 
            className="text-sm font-medium text-gray-900 truncate" 
            title={file.originalName}
          >
            {file.originalName}
          </p>
          <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
            <span>{fileService.formatFileSize(file.size)}</span>
            <span>•</span>
            <span>{formatDate(file.createdAt)}</span>
            {file.mimeType && (
              <>
                <span>•</span>
                <span className="truncate max-w-[200px]" title={file.mimeType}>
                  {file.mimeType}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Inline actions */}
        {showActions && (
          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {isPreviewable && (
              <button
                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onPreview(file);
                }}
                title="Preview"
              >
                <Eye className="w-4 h-4" />
              </button>
            )}
            <button
              className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onDownload(file);
              }}
              title="Download"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              title="More actions"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Dropdown menu for list view */}
        {showMenu && (
          <div className="absolute right-4 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
            <button
              className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onShare(file);
                setShowMenu(false);
              }}
            >
              <Share2 className="w-4 h-4 mr-3" />
              Share
            </button>
            <button
              className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onCopy(file);
                setShowMenu(false);
              }}
            >
              <Copy className="w-4 h-4 mr-3" />
              Copy link
            </button>
            <button
              className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onRename(file);
                setShowMenu(false);
              }}
            >
              <Edit2 className="w-4 h-4 mr-3" />
              Rename
            </button>
            <button
              className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(file);
                setShowMenu(false);
              }}
            >
              <Star className="w-4 h-4 mr-3" />
              Add to favorites
            </button>
            <div className="border-t border-gray-100 my-1"></div>
            <button
              className="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(file);
                setShowMenu(false);
              }}
            >
              <Trash2 className="w-4 h-4 mr-3" />
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const EnhancedFileList: React.FC<EnhancedFileListProps> = ({
  channelId,
  onFileSelect,
  onFilesChange,
  className = ''
}) => {
  const [files, setFiles] = useState<FileType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>('list');
  const [smartView, setSmartView] = useState<SmartView>('all');
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FileFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'size' | 'date'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [fileToRename, setFileToRename] = useState<FileType | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  
  const { announce, AnnouncementRegion } = useScreenReader();
  const searchInputId = generateId('file-search');

  const limit = view === 'card' ? 12 : view === 'grid' ? 20 : 25;

  // Smart view filters
  const getSmartViewFilter = useCallback((smartView: SmartView): Partial<FileFilters> => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    switch (smartView) {
      case 'recent':
        return {
          dateRange: {
            start: sevenDaysAgo.toISOString().split('T')[0]
          }
        };
      case 'images':
        return { mimeType: 'image' };
      case 'videos':
        return { mimeType: 'video' };
      case 'documents':
        return { mimeType: 'application/pdf' };
      case 'favorites':
        return {}; // Will be filtered client-side
      default:
        return {};
    }
  }, []);

  // Apply smart view and regular filters
  const appliedFilters = useMemo(() => {
    return {
      ...filters,
      ...getSmartViewFilter(smartView),
      search: searchQuery.trim() || undefined,
      channelId
    };
  }, [filters, smartView, searchQuery, channelId, getSmartViewFilter]);

  // Load files
  const loadFiles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fileService.getFiles(page, limit, appliedFilters);
      let sortedFiles = fileService.sortFiles(response.files, sortBy, sortOrder);

      // Apply favorites filter client-side
      if (smartView === 'favorites') {
        sortedFiles = sortedFiles.filter(file => favorites.has(file.id));
      }

      setFiles(sortedFiles);
      setTotalPages(response.pagination.totalPages);
      setTotal(response.pagination.total);

      if (onFilesChange) {
        onFilesChange(sortedFiles);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load files';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [page, limit, appliedFilters, sortBy, sortOrder, smartView, favorites, onFilesChange]);

  // Initial load and when dependencies change
  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  // File selection handlers
  const handleFileSelect = (fileId: string, selected: boolean) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(fileId);
      } else {
        newSet.delete(fileId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedFiles.size === files.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(files.map(f => f.id)));
    }
  };

  // File action handlers
  const handlePreview = (file: FileType) => {
    if (onFileSelect) {
      onFileSelect(file);
    }
  };

  const handleDownload = async (file: FileType) => {
    try {
      await fileService.downloadFile(file.id, file.originalName);
      toast.success('Download started');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to download file';
      toast.error(errorMessage);
    }
  };

  const handleDelete = async (file: FileType) => {
    if (!confirm(`Are you sure you want to delete "${file.originalName}"?`)) {
      return;
    }

    try {
      await fileService.deleteFile(file.id);
      toast.success('File deleted successfully');
      announce(`File ${file.originalName} deleted successfully`);
      loadFiles();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete file';
      toast.error(errorMessage);
      announce(`Failed to delete file: ${errorMessage}`, 'assertive');
    }
  };

  const handleShare = (file: FileType) => {
    // Generate shareable link
    const shareUrl = fileService.generateFileUrl(file.id);
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      toast.success('Share link copied to clipboard');
      announce(`Share link for ${file.originalName} copied to clipboard`);
    } else {
      toast.error('Clipboard not available');
    }
  };

  const handleCopy = (file: FileType) => {
    const fileUrl = fileService.generateFileUrl(file.id);
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(fileUrl);
      toast.success('File link copied to clipboard');
    } else {
      toast.error('Clipboard not available');
    }
  };

  const handleToggleFavorite = (file: FileType) => {
    setFavorites(prev => {
      const newSet = new Set(prev);
      if (newSet.has(file.id)) {
        newSet.delete(file.id);
        toast.success('Removed from favorites');
        announce(`${file.originalName} removed from favorites`);
      } else {
        newSet.add(file.id);
        toast.success('Added to favorites');
        announce(`${file.originalName} added to favorites`);
      }
      return newSet;
    });
  };

  const handleBulkDelete = async () => {
    if (selectedFiles.size === 0) return;

    if (!confirm(`Are you sure you want to delete ${selectedFiles.size} file(s)?`)) {
      return;
    }

    try {
      await fileService.deleteMultipleFiles(Array.from(selectedFiles));
      toast.success(`${selectedFiles.size} file(s) deleted successfully`);
      setSelectedFiles(new Set());
      loadFiles();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete files';
      toast.error(errorMessage);
    }
  };

  const handleRename = (file: FileType) => {
    setFileToRename(file);
    setRenameModalOpen(true);
  };

  const handleRenameSubmit = async (newName: string) => {
    if (!fileToRename) return;

    try {
      await fileService.renameFile(fileToRename.id, newName);
      toast.success('File renamed successfully');
      loadFiles();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to rename file';
      toast.error(errorMessage);
    }
  };

  // Filter handlers
  const handleFilterChange = (newFilters: Partial<FileFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({});
    setSearchQuery('');
    setSmartView('all');
    setPage(1);
  };

  const hasActiveFilters = searchQuery || Object.values(filters).some(v => v !== undefined) || smartView !== 'all';

  // Virtual list item renderer for large lists
  const VirtualListItem = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const file = files[index];
    if (!file) return null;

    return (
      <FileItem
        key={file.id}
        file={file}
        view={view}
        isSelected={selectedFiles.has(file.id)}
        onSelect={handleFileSelect}
        onPreview={handlePreview}
        onDownload={handleDownload}
        onDelete={handleDelete}
        onRename={handleRename}
        onShare={handleShare}
        onCopy={handleCopy}
        onToggleFavorite={handleToggleFavorite}
        style={style}
      />
    );
  };

  if (loading && files.length === 0) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading files...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <AnnouncementRegion />
      {/* Smart views */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center space-x-1 overflow-x-auto">
          {[
            { key: 'all', label: 'All Files', icon: FileText },
            { key: 'recent', label: 'Recent', icon: Clock },
            { key: 'favorites', label: 'Favorites', icon: Star },
            { key: 'images', label: 'Images', icon: Image },
            { key: 'videos', label: 'Videos', icon: Film },
            { key: 'documents', label: 'Documents', icon: FileText }
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => {
                setSmartView(key as SmartView);
                setPage(1);
              }}
              className={`
                flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap
                ${smartView === key
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }
              `}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
              {key === 'favorites' && favorites.size > 0 && (
                <span className="bg-blue-500 text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center">
                  {favorites.size}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Header with search and controls */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
          {/* Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <label htmlFor={searchInputId} className="sr-only">
                Search files
              </label>
              <Search 
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" 
                aria-hidden="true"
              />
              <input
                id={searchInputId}
                type="text"
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (e.target.value) {
                    announce(`Searching for ${e.target.value}`);
                  }
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                aria-describedby={`${searchInputId}-description`}
              />
              <div id={`${searchInputId}-description`} className="sr-only">
                Type to search through your files by name
              </div>
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    announce('Search cleared');
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center space-x-2">
            {/* Filters */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`
                p-2 rounded-lg border transition-colors flex items-center space-x-1
                ${hasActiveFilters
                  ? 'border-blue-500 bg-blue-50 text-blue-600'
                  : 'border-gray-300 text-gray-500 hover:border-gray-400'
                }
              `}
            >
              <Filter className="w-4 h-4" />
              <span className="text-sm">Filters</span>
            </button>

            {/* View toggle */}
            <div className="flex items-center border border-gray-300 rounded-lg">
              <button
                onClick={() => setView('list')}
                className={`
                  p-2 transition-colors
                  ${view === 'list' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700'}
                `}
                title="List view"
              >
                <ListIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setView('grid')}
                className={`
                  p-2 transition-colors
                  ${view === 'grid' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700'}
                `}
                title="Grid view"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setView('card')}
                className={`
                  p-2 transition-colors
                  ${view === 'card' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700'}
                `}
                title="Card view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>

            {/* Sort */}
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [sort, order] = e.target.value.split('-') as [typeof sortBy, typeof sortOrder];
                setSortBy(sort);
                setSortOrder(order);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="date-desc">Newest first</option>
              <option value="date-asc">Oldest first</option>
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="size-desc">Largest first</option>
              <option value="size-asc">Smallest first</option>
            </select>
          </div>
        </div>

        {/* Advanced filters panel */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* File type filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  File type
                </label>
                <select
                  value={filters.mimeType || ''}
                  onChange={(e) => handleFilterChange({ mimeType: e.target.value || undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value="">All types</option>
                  <option value="image">Images</option>
                  <option value="video">Videos</option>
                  <option value="audio">Audio</option>
                  <option value="application/pdf">PDF</option>
                  <option value="text">Text</option>
                </select>
              </div>

              {/* Size range filters */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Min size (MB)
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={filters.sizeRange?.min ? Math.round((filters.sizeRange.min || 0) / (1024 * 1024)) : ''}
                  onChange={(e) => handleFilterChange({
                    sizeRange: {
                      min: e.target.value ? Number(e.target.value) * 1024 * 1024 : undefined,
                      max: filters.sizeRange?.max
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max size (MB)
                </label>
                <input
                  type="number"
                  placeholder="5000"
                  value={filters.sizeRange?.max ? Math.round((filters.sizeRange.max || 0) / (1024 * 1024)) : ''}
                  onChange={(e) => handleFilterChange({
                    sizeRange: {
                      min: filters.sizeRange?.min,
                      max: e.target.value ? Number(e.target.value) * 1024 * 1024 : undefined
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>

              {/* Date range filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  From date
                </label>
                <input
                  type="date"
                  value={filters.dateRange?.start || ''}
                  onChange={(e) => handleFilterChange({
                    dateRange: {
                      start: e.target.value || undefined,
                      end: filters.dateRange?.end
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            {/* Filter actions */}
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-600">
                {total > 0 ? `${total} file${total === 1 ? '' : 's'} found` : 'No files found'}
              </div>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                >
                  Clear all filters
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bulk actions */}
      {selectedFiles.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-blue-800 font-medium">
                {selectedFiles.size} file{selectedFiles.size === 1 ? '' : 's'} selected
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleBulkDelete}
                  className="text-sm text-red-600 hover:text-red-800 transition-colors font-medium"
                >
                  Delete selected
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={() => {
                    // Bulk download functionality
                    selectedFiles.forEach(fileId => {
                      const file = files.find(f => f.id === fileId);
                      if (file) handleDownload(file);
                    });
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800 transition-colors font-medium"
                >
                  Download selected
                </button>
              </div>
            </div>
            <button
              onClick={() => setSelectedFiles(new Set())}
              className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
            >
              Clear selection
            </button>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <span className="text-red-600">{error}</span>
            <button
              onClick={loadFiles}
              className="text-sm text-red-600 hover:text-red-800 transition-colors font-medium"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && files.length === 0 && !error && (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No files found</h3>
          <p className="text-gray-500">
            {hasActiveFilters ? 'Try adjusting your filters' : 'Upload some files to get started'}
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="mt-4 text-blue-600 hover:text-blue-800 transition-colors font-medium"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* File list/grid */}
      {files.length > 0 && (
        <>
          {/* Select all checkbox */}
          <div className="flex items-center space-x-2 px-4 py-2 bg-gray-50 rounded-lg">
            <button
              onClick={handleSelectAll}
              className="p-1 rounded border transition-colors"
            >
              {selectedFiles.size === files.length ? (
                <CheckSquare className="w-4 h-4 text-blue-600" />
              ) : (
                <Square className="w-4 h-4 text-gray-400" />
              )}
            </button>
            <span className="text-sm text-gray-600">
              {selectedFiles.size === files.length ? 'Deselect all' : 'Select all'}
            </span>
          </div>

          {/* Files - Use virtual scrolling for large lists */}
          {files.length > 100 && view === 'list' ? (
            <div className="bg-white rounded-lg border border-gray-200">
              <List
                height={600}
                width="100%"
                itemCount={files.length}
                itemSize={80}
                className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
              >
                {VirtualListItem}
              </List>
            </div>
          ) : (
            <div className={
              view === 'card' 
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
                : view === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4'
                : 'space-y-2'
            }>
              {files.map(file => (
                <FileItem
                  key={file.id}
                  file={file}
                  view={view}
                  isSelected={selectedFiles.has(file.id)}
                  onSelect={handleFileSelect}
                  onPreview={handlePreview}
                  onDownload={handleDownload}
                  onDelete={handleDelete}
                  onRename={handleRename}
                  onShare={handleShare}
                  onCopy={handleCopy}
                  onToggleFavorite={handleToggleFavorite}
                />
              ))}
            </div>
          )}

          {/* Rename Modal */}
          <RenameFileModal
            isOpen={renameModalOpen}
            currentName={fileToRename?.originalName || ''}
            onClose={() => {
              setRenameModalOpen(false);
              setFileToRename(null);
            }}
            onRename={handleRenameSubmit}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-white rounded-lg border border-gray-200 p-4">
              <div className="text-sm text-gray-600">
                Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} files
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-gray-600">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default EnhancedFileList;