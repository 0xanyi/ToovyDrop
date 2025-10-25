import React, { useState, useEffect } from 'react';
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
  List,
  FileText,
  Image,
  Film,
  Music,
  Archive,
  CheckSquare,
  Square,
  Edit2
} from 'lucide-react';
import { fileService } from '../services/fileService';
import { File as FileType, FileFilters } from '../types';
import toast from 'react-hot-toast';
import RenameFileModal from './RenameFileModal';

interface FileListProps {
  channelId?: string;
  onFileSelect?: (file: FileType) => void;
  onFilesChange?: (files: FileType[]) => void;
  className?: string;
}

interface FileItemProps {
  file: FileType;
  view: 'grid' | 'list';
  isSelected: boolean;
  onSelect: (fileId: string, selected: boolean) => void;
  onPreview: (file: FileType) => void;
  onDownload: (file: FileType) => void;
  onDelete: (file: FileType) => void;
  onRename: (file: FileType) => void;
  showActions?: boolean;
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
  showActions = true
}) => {
  const [showMenu, setShowMenu] = useState(false);

  const { icon: iconName, color: iconColor } = fileService.getFileIcon(file.mimeType);
  const IconComponent = (() => {
    switch (iconName) {
      case 'image': return Image;
      case 'video': return Film;
      case 'audio': return Music;
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

  if (view === 'grid') {
    return (
      <div
        className={`
          relative bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer
          ${isSelected ? 'ring-2 ring-blue-500 border-blue-500' : ''}
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

        {/* Actions menu */}
        {showActions && (
          <div className="absolute top-2 right-2 z-10">
            <div className="relative">
              <button
                className="p-1 rounded-md bg-white border border-gray-200 text-gray-500 hover:text-gray-700 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {showMenu && (
                <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-20">
                  {isPreviewable && (
                    <button
                      className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPreview(file);
                        setShowMenu(false);
                      }}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Preview
                    </button>
                  )}
                  <button
                    className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDownload(file);
                      setShowMenu(false);
                    }}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </button>
                  <button
                    className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRename(file);
                      setShowMenu(false);
                    }}
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Rename
                  </button>
                  <button
                    className="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(file);
                      setShowMenu(false);
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* File icon and preview */}
        <div className="flex flex-col items-center space-y-3 mt-8">
          <div className={`p-4 rounded-lg bg-gray-50 ${iconColor}`}>
            <IconComponent className="w-8 h-8" />
          </div>

          <div className="text-center w-full">
            <p 
              className="text-sm font-medium text-gray-900 truncate max-w-[200px] mx-auto" 
              title={file.originalName}
            >
              {file.originalName.length > 30 
                ? `${file.originalName.substring(0, 27)}...` 
                : file.originalName}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {fileService.formatFileSize(file.size)}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {formatDate(file.createdAt)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div
      className={`
        bg-white border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer
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

        {/* File icon */}
        <div className={`p-2 rounded-lg bg-gray-50 ${iconColor} flex-shrink-0`}>
          <IconComponent className="w-5 h-5" />
        </div>

        {/* File info */}
        <div className="flex-1 min-w-0">
          <p 
            className="text-sm font-medium text-gray-900 truncate" 
            title={file.originalName}
          >
            {file.originalName.length > 50 
              ? `${file.originalName.substring(0, 47)}...` 
              : file.originalName}
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

        {/* Actions */}
        {showActions && (
          <div className="flex items-center space-x-2">
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
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(file);
              }}
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const FileList: React.FC<FileListProps> = ({
  channelId,
  onFileSelect,
  onFilesChange,
  className = ''
}) => {
  const [files, setFiles] = useState<FileType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'grid' | 'list'>('list');
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

  const limit = view === 'grid' ? 20 : 25;

  // Load files
  const loadFiles = async () => {
    try {
      setLoading(true);
      setError(null);

      const fileFilters: FileFilters = {
        ...filters,
        search: searchQuery.trim() || undefined,
        channelId
      };

      const response = await fileService.getFiles(page, limit, fileFilters);

      let sortedFiles = fileService.sortFiles(response.files, sortBy, sortOrder);

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
  };

  // Initial load and when dependencies change
  useEffect(() => {
    loadFiles();
  }, [page, view, searchQuery, filters, sortBy, sortOrder, channelId]);

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
      loadFiles(); // Reload the list
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete file';
      toast.error(errorMessage);
    }
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
      loadFiles(); // Reload the list
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
      loadFiles(); // Reload the list
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to rename file';
      toast.error(errorMessage);
    }
  };

  // Filter handlers
  const handleFilterChange = (newFilters: Partial<FileFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPage(1); // Reset to first page
  };

  const clearFilters = () => {
    setFilters({});
    setSearchQuery('');
    setPage(1);
  };

  const hasActiveFilters = searchQuery || Object.values(filters).some(v => v !== undefined);

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
    <div className={`space-y-4 ${className}`}>
      {/* Header with search and controls */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
          {/* Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center space-x-2">
            {/* Filters */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`
                p-2 rounded-md border transition-colors flex items-center space-x-1
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
            <div className="flex items-center border border-gray-300 rounded-md">
              <button
                onClick={() => setView('list')}
                className={`
                  p-2 transition-colors
                  ${view === 'list' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700'}
                `}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setView('grid')}
                className={`
                  p-2 transition-colors
                  ${view === 'grid' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700'}
                `}
              >
                <Grid className="w-4 h-4" />
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
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
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

        {/* Filter panel */}
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value="">All types</option>
                  <option value="image">Images</option>
                  <option value="video">Videos</option>
                  <option value="audio">Audio</option>
                  <option value="application/pdf">PDF</option>
                  <option value="text">Text</option>
                </select>
              </div>

              {/* Size range filter */}
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
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
                  Clear filters
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
              <span className="text-sm text-blue-800">
                {selectedFiles.size} file{selectedFiles.size === 1 ? '' : 's'} selected
              </span>
              <button
                onClick={handleBulkDelete}
                className="text-sm text-red-600 hover:text-red-800 transition-colors"
              >
                Delete selected
              </button>
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
              className="text-sm text-red-600 hover:text-red-800 transition-colors"
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

          {/* Files */}
          <div className={view === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' : 'space-y-2'}>
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
              />
            ))}
          </div>

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
                  className="p-2 rounded-md border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-gray-600">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded-md border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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

export default FileList;