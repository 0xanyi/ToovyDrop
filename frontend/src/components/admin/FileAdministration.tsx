import React, { useState, useEffect } from 'react';
import { ApiResponse } from '../../types';
import Button from '../Button';
import { useAuth } from '../../contexts/AuthContext';
import {
  FileText,
  Search,
  Filter,
  Download,
  Trash2,
  Eye,
  FolderOpen,
  Calendar,
  HardDrive,
  User,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface AdminFile {
  id: string;
  filename: string;
  originalName: string;
  mimeType?: string;
  size: number;
  ftpPath: string;
  channelId: string;
  channel?: {
    id: string;
    name: string;
    slug: string;
  };
  uploadedBy: string;
  uploader?: {
    id: string;
    email: string;
    role: string;
  };
  uploadedByGuest: boolean;
  guestUploadLinkId?: string;
  guestUploadLink?: {
    token: string;
    description?: string;
  };
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  _count: {
    downloads?: number;
  };
}

interface FileListResponse {
  files: AdminFile[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: {
    totalSize: number;
    totalFiles: number;
    avgFileSize: number;
    largestFile: {
      name: string;
      size: number;
    };
  };
}

interface FileFilters {
  search?: string;
  channelId?: string;
  mimeType?: string;
  dateRange?: {
    start?: string;
    end?: string;
  };
  sizeRange?: {
    min?: number;
    max?: number;
  };
  uploadedBy?: string;
  isActive?: boolean;
  uploadedByGuest?: boolean;
}

interface SortConfig {
  field: keyof AdminFile;
  direction: 'asc' | 'desc';
}

const FileAdministration: React.FC = () => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const { user } = useAuth();
  
  // Helper function to get auth token
  const getAuthToken = (): string | null => {
    const authTokens = localStorage.getItem('authTokens');
    if (authTokens) {
      try {
        const tokens = JSON.parse(authTokens);
        return tokens.accessToken;
      } catch (error) {
        console.error('Error parsing auth tokens:', error);
        return null;
      }
    }
    return null;
  };

  // Helper function to get CSRF token
  const getCsrfToken = async (): Promise<string> => {
    const response = await fetch(`${apiUrl}/api/security/csrf-token`, {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch CSRF token');
    }

    const data = await response.json();
    return data.data.token;
  };

  // Helper function to get headers with auth and CSRF tokens
  const getAuthHeadersWithCsrf = async (): Promise<HeadersInit> => {
    const csrfToken = await getCsrfToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getAuthToken()}`,
      'x-csrf-token': csrfToken
    };
  };

  const [files, setFiles] = useState<AdminFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });
  const [summary, setSummary] = useState({
    totalSize: 0,
    totalFiles: 0,
    avgFileSize: 0,
    largestFile: { name: '', size: 0 }
  });

  // Filters and sorting
  const [filters, setFilters] = useState<FileFilters>({});
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'createdAt',
    direction: 'desc'
  });
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal states
  const [_previewFile, setPreviewFile] = useState<AdminFile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchFiles();
  }, [pagination.page, pagination.limit, filters, sortConfig]);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.append('page', pagination.page.toString());
      params.append('limit', pagination.limit.toString());

      if (filters.search) params.append('search', filters.search);
      if (filters.channelId) params.append('channelId', filters.channelId);
      if (filters.mimeType) params.append('mimeType', filters.mimeType);
      if (filters.uploadedBy) params.append('uploadedBy', filters.uploadedBy);
      if (filters.isActive !== undefined) params.append('isActive', filters.isActive.toString());
      if (filters.uploadedByGuest !== undefined) params.append('uploadedByGuest', filters.uploadedByGuest.toString());

      if (filters.dateRange?.start) params.append('dateFrom', filters.dateRange.start);
      if (filters.dateRange?.end) params.append('dateTo', filters.dateRange.end);

      if (filters.sizeRange?.min) params.append('minSize', filters.sizeRange.min.toString());
      if (filters.sizeRange?.max) params.append('maxSize', filters.sizeRange.max.toString());

      params.append('sortBy', sortConfig.field);
      params.append('sortOrder', sortConfig.direction);

      // Note: This endpoint would need to be implemented in the backend
      const response: ApiResponse<FileListResponse> = await fetch(
        `${apiUrl}/api/admin/files?${params.toString()}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}`
          }
        }
      ).then(res => res.json());

      if (response.success && response.data) {
        setFiles(response.data.files);
        setPagination(response.data.pagination);
        setSummary(response.data.summary);
      } else {
        throw new Error(response.error?.message || 'Failed to fetch files');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      // Don't clear existing data on error - just show error message
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: keyof AdminFile) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleSelectAll = () => {
    if (selectedFiles.size === files.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(files.map(file => file.id)));
    }
  };

  const handleSelectFile = (fileId: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(fileId)) {
      newSelected.delete(fileId);
    } else {
      newSelected.add(fileId);
    }
    setSelectedFiles(newSelected);
  };

  const handleBulkDelete = async () => {
    if (selectedFiles.size === 0) return;

    if (!confirm(`Are you sure you want to delete ${selectedFiles.size} file(s)? This action cannot be undone.`)) {
      return;
    }

    // Check if user is admin
    if (user?.role !== 'ADMIN') {
      alert('You must be an admin to perform bulk operations');
      return;
    }

    try {
      setIsDeleting(true);

      const token = getAuthToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${apiUrl}/api/admin/files/bulk-operation`, {
        method: 'POST',
        headers: await getAuthHeadersWithCsrf(),
        body: JSON.stringify({ 
          operation: 'delete',
          fileIds: Array.from(selectedFiles) 
        })
      });

      const responseData = await response.json();

      if (responseData.success) {
        setSelectedFiles(new Set());
        fetchFiles();
        
        // Show success message
        const deletedCount = responseData.data?.affectedCount || selectedFiles.size;
        alert(`Successfully deleted ${deletedCount} file(s) from both database and FTP server.`);
      } else if (response.status === 207) {
        // Partial success - some files deleted, some failed
        setSelectedFiles(new Set());
        fetchFiles();
        alert(`Partial success: ${responseData.error?.message || 'Some files could not be deleted'}`);
      } else {
        throw new Error(responseData.error?.message || 'Failed to delete files');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete files');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file? This action cannot be undone.')) {
      return;
    }

    try {
      // Use bulk operation endpoint for single file deletion
      const response = await fetch(`${apiUrl}/api/admin/files/bulk-operation`, {
        method: 'POST',
        headers: await getAuthHeadersWithCsrf(),
        body: JSON.stringify({ 
          operation: 'delete',
          fileIds: [fileId] 
        })
      }).then(res => res.json());

      if (response.success) {
        fetchFiles();
      } else {
        throw new Error(response.error?.message || 'Failed to delete file');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete file');
    }
  };

  const handleDownloadFile = async (file: AdminFile) => {
    try {
      const response = await fetch(`${apiUrl}/api/files/${file.id}/download`, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to download file');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.originalName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to download file');
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  const getMimeTypeIcon = (mimeType?: string) => {
    if (!mimeType) return <FileText className="w-4 h-4 text-gray-400" />;

    if (mimeType.startsWith('image/')) return <Eye className="w-4 h-4 text-green-500" />;
    if (mimeType.startsWith('video/')) return <Eye className="w-4 h-4 text-blue-500" />;
    if (mimeType.startsWith('audio/')) return <Eye className="w-4 h-4 text-purple-500" />;
    if (mimeType.includes('pdf')) return <FileText className="w-4 h-4 text-red-500" />;
    if (mimeType.includes('text')) return <FileText className="w-4 h-4 text-gray-500" />;

    return <FileText className="w-4 h-4 text-gray-400" />;
  };

  const SortIcon = ({ field }: { field: keyof AdminFile }) => {
    if (sortConfig.field !== field) {
      return <ChevronUp className="w-4 h-4 text-gray-400" />;
    }
    return sortConfig.direction === 'asc'
      ? <ChevronUp className="w-4 h-4 text-blue-500" />
      : <ChevronDown className="w-4 h-4 text-blue-500" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to load files</h3>
        <p className="text-gray-500 mb-4">{error}</p>
        <Button onClick={fetchFiles}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">File Administration</h2>
          <p className="text-gray-600">Manage and monitor all files in the system</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="secondary" onClick={fetchFiles}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Files</p>
              <p className="text-2xl font-bold text-gray-900">{summary?.totalFiles?.toLocaleString() || '0'}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <HardDrive className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Size</p>
              <p className="text-2xl font-bold text-gray-900">{formatBytes(summary?.totalSize || 0)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <FileText className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg File Size</p>
              <p className="text-2xl font-bold text-gray-900">{formatBytes(summary?.avgFileSize || 0)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <FileText className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Largest File</p>
              <p className="text-lg font-bold text-gray-900 truncate">
                {summary?.largestFile?.name || 'N/A'}
              </p>
              <p className="text-xs text-gray-500">{formatBytes(summary?.largestFile?.size || 0)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search files..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setFilters(prev => ({ ...prev, search: e.target.value || undefined }));
                }}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
              />
            </div>

            <Button
              variant="secondary"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
              {Object.values(filters).filter(Boolean).length > 0 && (
                <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">
                  {Object.values(filters).filter(Boolean).length}
                </span>
              )}
            </Button>
          </div>

          {selectedFiles.size > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">
                {selectedFiles.size} file{selectedFiles.size !== 1 ? 's' : ''} selected
              </span>
              <Button
                variant="danger"
                onClick={handleBulkDelete}
                disabled={isDeleting}
                className="flex items-center"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Selected
              </Button>
            </div>
          )}
        </div>

        {/* Expandable Filters */}
        {showFilters && (
          <div className="border-t border-gray-200 pt-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Channel
                </label>
                <select
                  value={filters.channelId || ''}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    channelId: e.target.value || undefined
                  }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Channels</option>
                  {/* Channel options would be populated from API */}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  File Type
                </label>
                <select
                  value={filters.mimeType || ''}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    mimeType: e.target.value || undefined
                  }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Types</option>
                  <option value="image/">Images</option>
                  <option value="video/">Videos</option>
                  <option value="audio/">Audio</option>
                  <option value="application/pdf">PDF</option>
                  <option value="text/">Text</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={filters.isActive !== undefined ? filters.isActive.toString() : ''}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    isActive: e.target.value === '' ? undefined : e.target.value === 'true'
                  }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Status</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Files Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {files.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No files found</h3>
            <p className="text-gray-500">No files match your current filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedFiles.size === files.length && files.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('originalName')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>File Name</span>
                      <SortIcon field="originalName" />
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('size')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Size</span>
                      <SortIcon field="size" />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Channel
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Uploaded By
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('createdAt')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Date</span>
                      <SortIcon field="createdAt" />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {files.map((file) => (
                  <tr key={file.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedFiles.has(file.id)}
                        onChange={() => handleSelectFile(file.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        {getMimeTypeIcon(file.mimeType)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {file.originalName}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {file.filename}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900">{formatBytes(file.size)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-gray-500">{file.mimeType || 'Unknown'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <FolderOpen className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900">
                          {file.channel?.name || 'Unknown'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-900">
                            {file.uploadedByGuest ? 'Guest' : (file.uploader?.email || 'Unknown')}
                          </p>
                          {file.uploadedByGuest && file.guestUploadLink?.description && (
                            <p className="text-xs text-gray-500">
                              {file.guestUploadLink.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900">
                          {formatDate(file.createdAt)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        file.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {file.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setPreviewFile(file)}
                          className="p-1"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleDownloadFile(file)}
                          className="p-1"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDeleteFile(file.id)}
                          className="p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <Button
                variant="secondary"
                onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                disabled={pagination.page === 1}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                onClick={() => setPagination(prev => ({ ...prev, page: Math.min(pagination.totalPages, prev.page + 1) }))}
                disabled={pagination.page === pagination.totalPages}
              >
                Next
              </Button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing{' '}
                  <span className="font-medium">
                    {(pagination.page - 1) * pagination.limit + 1}
                  </span>{' '}
                  to{' '}
                  <span className="font-medium">
                    {Math.min(pagination.page * pagination.limit, pagination.total)}
                  </span>{' '}
                  of{' '}
                  <span className="font-medium">{pagination.total}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <Button
                    variant="secondary"
                    onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                    disabled={pagination.page === 1}
                    className="rounded-l-md"
                  >
                    Previous
                  </Button>

                  {/* Page numbers */}
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    let pageNum;
                    if (pagination.totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (pagination.page <= 3) {
                      pageNum = i + 1;
                    } else if (pagination.page >= pagination.totalPages - 2) {
                      pageNum = pagination.totalPages - 4 + i;
                    } else {
                      pageNum = pagination.page - 2 + i;
                    }

                    return (
                      <Button
                        key={pageNum}
                        variant={pagination.page === pageNum ? 'primary' : 'secondary'}
                        onClick={() => setPagination(prev => ({ ...prev, page: pageNum }))}
                        className={`${
                          pagination.page === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}

                  <Button
                    variant="secondary"
                    onClick={() => setPagination(prev => ({ ...prev, page: Math.min(pagination.totalPages, prev.page + 1) }))}
                    disabled={pagination.page === pagination.totalPages}
                    className="rounded-r-md"
                  >
                    Next
                  </Button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileAdministration;