import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { ApiResponse, GuestUploadLink } from '../../types';
import Button from '../Button';
import {
  Link,
  Calendar,
  Hash,
  FolderOpen,
  Edit,
  Trash2,
  Power,
  PowerOff,
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
  Clock,
  Upload,
  Eye,
  EyeOff
} from 'lucide-react';

interface GuestLinkListProps {
  channelId: string;
  refreshTrigger?: number;
  onEdit: (link: GuestUploadLink) => void;
  onDelete: (linkId: string) => void;
  onToggleActive: (linkId: string, isActive: boolean) => void;
}

const GuestLinkList: React.FC<GuestLinkListProps> = ({
  channelId,
  refreshTrigger = 0,
  onEdit,
  onDelete,
  onToggleActive
}) => {
  const [links, setLinks] = useState<GuestUploadLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  // Fetch guest links
  const fetchGuestLinks = async () => {
    try {
      setLoading(true);
      setError(null);

      const response: ApiResponse<{ guestLinks: GuestUploadLink[] }> = 
        await adminService.getChannelGuestLinks(channelId);

      if (response.success && response.data) {
        setLinks(response.data.guestLinks);
      } else {
        throw new Error(response.error?.message || 'Failed to fetch guest links');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch and refresh on trigger changes
  useEffect(() => {
    fetchGuestLinks();
  }, [channelId, refreshTrigger]);

  // Handle copy to clipboard
  const handleCopyUrl = async (link: GuestUploadLink) => {
    try {
      await navigator.clipboard.writeText(link.url);
      setCopiedLinkId(link.id);
      setTimeout(() => setCopiedLinkId(null), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = link.url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedLinkId(link.id);
      setTimeout(() => setCopiedLinkId(null), 2000);
    }
  };

  // Handle toggle active status
  const handleToggleActive = async (link: GuestUploadLink) => {
    const newStatus = !link.isActive;
    const action = newStatus ? 'activate' : 'deactivate';
    
    if (!confirm(`Are you sure you want to ${action} this guest link?`)) {
      return;
    }

    try {
      const response = await adminService.updateGuestLink(link.id, { isActive: newStatus });
      if (response.success) {
        onToggleActive(link.id, newStatus);
        fetchGuestLinks(); // Refresh the list
      } else {
        alert(response.error?.message || `Failed to ${action} guest link`);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : `Failed to ${action} guest link`);
    }
  };

  // Handle delete
  const handleDelete = async (link: GuestUploadLink) => {
    if (!confirm(`Are you sure you want to delete this guest link? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await adminService.deleteGuestLink(link.id);
      if (response.success) {
        onDelete(link.id);
        fetchGuestLinks(); // Refresh the list
      } else {
        alert(response.error?.message || 'Failed to delete guest link');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete guest link');
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return formatDate(dateString);
  };

  // Check if link is expired
  const isExpired = (link: GuestUploadLink) => {
    if (!link.expiresAt) return false;
    return new Date(link.expiresAt) <= new Date();
  };

  // Check if link has reached upload limit
  const isUploadLimitReached = (link: GuestUploadLink) => {
    if (!link.maxUploads) return false;
    return link.uploadCount >= link.maxUploads;
  };

  // Get link status
  const getLinkStatus = (link: GuestUploadLink) => {
    if (!link.isActive) return { status: 'inactive', color: 'gray', text: 'Inactive' };
    if (isExpired(link)) return { status: 'expired', color: 'red', text: 'Expired' };
    if (isUploadLimitReached(link)) return { status: 'limit-reached', color: 'orange', text: 'Limit Reached' };
    return { status: 'active', color: 'green', text: 'Active' };
  };

  // Filter links based on showInactive
  const filteredLinks = links.filter(link => showInactive || link.isActive);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-medium text-gray-900">Guest Upload Links</h3>
          <div className="flex items-center space-x-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowInactive(!showInactive)}
            >
              {showInactive ? (
                <>
                  <EyeOff className="w-4 h-4 mr-1" />
                  Hide Inactive
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 mr-1" />
                  Show All
                </>
              )}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={fetchGuestLinks}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-1 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-500 mr-2" />
          <span className="text-gray-500">Loading guest links...</span>
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredLinks.length === 0 && (
        <div className="text-center py-8">
          <Link className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {links.length === 0 ? 'No guest links yet' : 'No active guest links'}
          </h3>
          <p className="text-gray-500 mb-4">
            {links.length === 0 
              ? 'Create your first guest link to allow external file uploads'
              : 'All guest links are currently inactive'
            }
          </p>
        </div>
      )}

      {/* Guest links list */}
      {!loading && filteredLinks.length > 0 && (
        <div className="space-y-4">
          {filteredLinks.map((link) => {
            const linkStatus = getLinkStatus(link);
            const isCopied = copiedLinkId === link.id;
            
            return (
              <div
                key={link.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  {/* Link info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="flex-shrink-0">
                        <div className={`h-3 w-3 rounded-full ${
                          linkStatus.color === 'green' ? 'bg-green-400' :
                          linkStatus.color === 'red' ? 'bg-red-400' :
                          linkStatus.color === 'orange' ? 'bg-orange-400' :
                          'bg-gray-400'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {link.description || 'Guest Upload Link'}
                          </h4>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            linkStatus.color === 'green' ? 'bg-green-100 text-green-800' :
                            linkStatus.color === 'red' ? 'bg-red-100 text-red-800' :
                            linkStatus.color === 'orange' ? 'bg-orange-100 text-orange-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {linkStatus.text}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Link details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600">
                      {/* Created */}
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        <span>Created {formatRelativeTime(link.createdAt)}</span>
                      </div>

                      {/* Expiration */}
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        <span>
                          {link.expiresAt ? (
                            <>
                              Expires {formatDate(link.expiresAt)}
                              {isExpired(link) && (
                                <span className="text-red-600 ml-1">(Expired)</span>
                              )}
                            </>
                          ) : (
                            'No expiration'
                          )}
                        </span>
                      </div>

                      {/* Upload count */}
                      <div className="flex items-center">
                        <Upload className="w-4 h-4 mr-1" />
                        <span>
                          {link.uploadCount}
                          {link.maxUploads && ` / ${link.maxUploads}`} uploads
                          {isUploadLimitReached(link) && (
                            <span className="text-orange-600 ml-1">(Limit reached)</span>
                          )}
                        </span>
                      </div>

                      {/* Guest folder */}
                      <div className="flex items-center">
                        <FolderOpen className="w-4 h-4 mr-1" />
                        <span>{link.guestFolder || 'Channel root'}</span>
                      </div>
                    </div>

                    {/* URL display */}
                    <div className="mt-3 p-2 bg-gray-50 rounded border">
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={link.url}
                          readOnly
                          className="flex-1 text-xs bg-transparent border-none focus:outline-none text-gray-700"
                        />
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleCopyUrl(link)}
                          className={isCopied ? 'bg-green-100 text-green-800' : ''}
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3 h-3 mr-1" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 mr-1" />
                              Copy
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 ml-4">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onEdit(link)}
                      title="Edit guest link"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleToggleActive(link)}
                      title={link.isActive ? 'Deactivate guest link' : 'Activate guest link'}
                      className={link.isActive ? 'text-orange-600 hover:text-orange-700' : 'text-green-600 hover:text-green-700'}
                    >
                      {link.isActive ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(link)}
                      title="Delete guest link"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Summary */}
      {!loading && links.length > 0 && (
        <div className="text-sm text-gray-500 text-center pt-4 border-t">
          {links.length} total guest link{links.length !== 1 ? 's' : ''} • 
          {' '}{links.filter(l => l.isActive && !isExpired(l) && !isUploadLimitReached(l)).length} active • 
          {' '}{links.filter(l => !l.isActive).length} inactive • 
          {' '}{links.filter(l => isExpired(l)).length} expired • 
          {' '}{links.filter(l => isUploadLimitReached(l)).length} limit reached
        </div>
      )}
    </div>
  );
};

export default GuestLinkList;