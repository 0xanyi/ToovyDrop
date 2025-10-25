import React, { useState } from 'react';
import {
  Download,
  Trash2,
  Move,
  Copy,
  Share2,
  X,
  CheckSquare,
  MoreHorizontal,
  AlertTriangle
} from 'lucide-react';
import { File as FileType } from '../types';
import { fileService } from '../services/fileService';
import toast from 'react-hot-toast';

interface BulkOperationsProps {
  selectedFiles: Set<string>;
  allFiles: FileType[];
  onClearSelection: () => void;
  onFilesChange: () => void;
  channels?: Array<{ id: string; name: string }>;
  className?: string;
}

interface BulkAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  description: string;
  requiresConfirmation: boolean;
  action: (fileIds: string[], files: FileType[]) => Promise<void>;
}

const BulkOperations: React.FC<BulkOperationsProps> = ({
  selectedFiles,
  allFiles,
  onClearSelection,
  onFilesChange,
  channels = [],
  className = ''
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<BulkAction | null>(null);
  const [selectedChannelId, setSelectedChannelId] = useState('');

  const selectedFileObjects = allFiles.filter(file => selectedFiles.has(file.id));
  const selectedCount = selectedFiles.size;

  // Calculate total size of selected files
  const totalSize = selectedFileObjects.reduce((sum, file) => sum + file.size, 0);
  const formattedTotalSize = fileService.formatFileSize(totalSize);

  // Bulk actions configuration
  const bulkActions: BulkAction[] = [
    {
      id: 'download',
      label: 'Download',
      icon: Download,
      color: 'text-green-600 hover:text-green-700',
      description: 'Download all selected files',
      requiresConfirmation: false,
      action: async (_fileIds: string[], files: FileType[]) => {
        for (const file of files) {
          await fileService.downloadFile(file.id, file.originalName);
          // Add small delay between downloads to prevent overwhelming the browser
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        toast.success(`Started downloading ${files.length} file${files.length === 1 ? '' : 's'}`);
      }
    },
    {
      id: 'move',
      label: 'Move',
      icon: Move,
      color: 'text-blue-600 hover:text-blue-700',
      description: 'Move files to another channel',
      requiresConfirmation: false,
      action: async (fileIds: string[]) => {
        if (!selectedChannelId) {
          toast.error('Please select a channel');
          return;
        }
        await fileService.moveFiles(fileIds, selectedChannelId);
        toast.success(`Moved ${fileIds.length} file${fileIds.length === 1 ? '' : 's'} successfully`);
        onFilesChange();
      }
    },
    {
      id: 'copy',
      label: 'Copy Links',
      icon: Copy,
      color: 'text-purple-600 hover:text-purple-700',
      description: 'Copy file links to clipboard',
      requiresConfirmation: false,
      action: async (_fileIds: string[], files: FileType[]) => {
        const links = files.map(file => fileService.generateFileUrl(file.id)).join('\n');
        await window.navigator.clipboard.writeText(links);
        toast.success(`Copied ${files.length} file link${files.length === 1 ? '' : 's'} to clipboard`);
      }
    },
    {
      id: 'share',
      label: 'Share',
      icon: Share2,
      color: 'text-indigo-600 hover:text-indigo-700',
      description: 'Generate shareable links',
      requiresConfirmation: false,
      action: async (_fileIds: string[], files: FileType[]) => {
        const shareLinks = files.map(file => {
          const shareUrl = fileService.generateFileUrl(file.id);
          return `${file.originalName}: ${shareUrl}`;
        }).join('\n');
        await window.navigator.clipboard.writeText(shareLinks);
        toast.success(`Copied ${files.length} shareable link${files.length === 1 ? '' : 's'} to clipboard`);
      }
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: Trash2,
      color: 'text-red-600 hover:text-red-700',
      description: 'Permanently delete selected files',
      requiresConfirmation: true,
      action: async (fileIds: string[]) => {
        await fileService.deleteMultipleFiles(fileIds);
        toast.success(`Deleted ${fileIds.length} file${fileIds.length === 1 ? '' : 's'} successfully`);
        onFilesChange();
        onClearSelection();
      }
    }
  ];

  const handleActionClick = async (action: BulkAction) => {
    if (selectedCount === 0) return;

    if (action.id === 'move') {
      setShowMoveModal(true);
      return;
    }

    if (action.requiresConfirmation) {
      setPendingAction(action);
      setShowConfirmModal(true);
      return;
    }

    await executeAction(action);
  };

  const executeAction = async (action: BulkAction) => {
    setIsProcessing(true);
    try {
      await action.action(Array.from(selectedFiles), selectedFileObjects);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Operation failed';
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
      setShowConfirmModal(false);
      setPendingAction(null);
    }
  };

  const handleMoveConfirm = async () => {
    const moveAction = bulkActions.find(a => a.id === 'move');
    if (moveAction) {
      setShowMoveModal(false);
      await executeAction(moveAction);
      setSelectedChannelId('');
    }
  };

  if (selectedCount === 0) {
    return null;
  }

  return (
    <>
      <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <CheckSquare className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">
                {selectedCount} file{selectedCount === 1 ? '' : 's'} selected
              </span>
              <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                {formattedTotalSize}
              </span>
            </div>

            {/* Quick actions */}
            <div className="flex items-center space-x-1">
              {bulkActions.slice(0, 4).map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.id}
                    onClick={() => handleActionClick(action)}
                    disabled={isProcessing}
                    className={`
                      p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                      ${action.color} hover:bg-white/50
                    `}
                    title={action.description}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                );
              })}

              {/* More actions dropdown */}
              <div className="relative group">
                <button
                  className="p-2 rounded-lg text-gray-600 hover:text-gray-700 hover:bg-white/50 transition-colors"
                  title="More actions"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>

                <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 py-1">
                  {bulkActions.slice(4).map((action) => {
                    const Icon = action.icon;
                    return (
                      <button
                        key={action.id}
                        onClick={() => handleActionClick(action)}
                        disabled={isProcessing}
                        className={`
                          flex items-center w-full px-3 py-2 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                          ${action.id === 'delete' ? 'text-red-600 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-100'}
                        `}
                      >
                        <Icon className="w-4 h-4 mr-3" />
                        {action.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={onClearSelection}
            className="text-sm text-blue-600 hover:text-blue-800 transition-colors flex items-center space-x-1"
          >
            <X className="w-4 h-4" />
            <span>Clear selection</span>
          </button>
        </div>

        {/* File type breakdown */}
        {selectedCount > 1 && (
          <div className="mt-3 pt-3 border-t border-blue-200">
            <div className="flex items-center space-x-4 text-xs text-blue-700">
              <span>Selected files:</span>
              {(() => {
                const fileTypes = selectedFileObjects.reduce((acc, file) => {
                  const type = file.mimeType?.split('/')[0] || 'other';
                  acc[type] = (acc[type] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>);

                return Object.entries(fileTypes).map(([type, count]) => (
                  <span key={type} className="bg-blue-100 px-2 py-1 rounded-full">
                    {count} {type}{count === 1 ? '' : 's'}
                  </span>
                ));
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Move Modal */}
      {showMoveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center space-x-2 mb-4">
              <Move className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Move {selectedCount} file{selectedCount === 1 ? '' : 's'}
              </h3>
            </div>

            <p className="text-gray-600 mb-4">
              Select the channel where you want to move the selected files.
            </p>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Destination Channel
              </label>
              <select
                value={selectedChannelId}
                onChange={(e) => setSelectedChannelId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a channel...</option>
                {channels.map((channel) => (
                  <option key={channel.id} value={channel.id}>
                    {channel.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowMoveModal(false);
                  setSelectedChannelId('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleMoveConfirm}
                disabled={!selectedChannelId || isProcessing}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isProcessing ? 'Moving...' : 'Move Files'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && pendingAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center space-x-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Confirm {pendingAction.label}
              </h3>
            </div>

            <p className="text-gray-600 mb-4">
              Are you sure you want to {pendingAction.label.toLowerCase()} {selectedCount} file{selectedCount === 1 ? '' : 's'}?
              {pendingAction.id === 'delete' && (
                <span className="block mt-2 text-red-600 font-medium">
                  This action cannot be undone.
                </span>
              )}
            </p>

            {/* Show file list for destructive actions */}
            {pendingAction.id === 'delete' && selectedCount <= 5 && (
              <div className="bg-gray-50 rounded-lg p-3 mb-4 max-h-32 overflow-y-auto">
                <div className="text-xs text-gray-600 mb-2">Files to be deleted:</div>
                {selectedFileObjects.map((file) => (
                  <div key={file.id} className="text-sm text-gray-800 truncate">
                    • {file.originalName}
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setPendingAction(null);
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => executeAction(pendingAction)}
                disabled={isProcessing}
                className={`
                  px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                  ${pendingAction.id === 'delete'
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                  }
                `}
              >
                {isProcessing ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Processing...</span>
                  </div>
                ) : (
                  `${pendingAction.label} Files`
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BulkOperations;