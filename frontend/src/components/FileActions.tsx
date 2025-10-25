import React, { useState } from 'react';
import {
  Eye,
  Download,
  Share2,
  Star,
  StarOff
} from 'lucide-react';
import { File as FileType } from '../types';
import { fileService } from '../services/fileService';
import FileContextMenu from './FileContextMenu';
import toast from 'react-hot-toast';

interface FileActionsProps {
  file: FileType;
  view: 'list' | 'grid' | 'card';
  onPreview?: (file: FileType) => void;
  onRename?: (file: FileType) => void;
  onDelete?: (file: FileType) => void;
  onMove?: (file: FileType) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (file: FileType, isFavorite: boolean) => void;
  showInlineActions?: boolean;
  className?: string;
}

const FileActions: React.FC<FileActionsProps> = ({
  file,
  view,
  onPreview,
  onRename,
  onDelete,
  onMove,
  isFavorite = false,
  onToggleFavorite,
  showInlineActions = true,
  className = ''
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const isPreviewable = fileService.isPreviewable(file.mimeType);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsProcessing(true);
    try {
      await fileService.downloadFile(file.id, file.originalName);
      toast.success('Download started');
    } catch {
      toast.error('Failed to download file');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const shareUrl = fileService.generateFileUrl(file.id);
      if (window.navigator.share) {
        await window.navigator.share({
          title: file.originalName,
          url: shareUrl
        });
      } else {
        await window.navigator.clipboard.writeText(shareUrl);
        toast.success('Share link copied to clipboard');
      }
    } catch {
      toast.error('Failed to share file');
    }
  };

  const handlePreview = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPreview?.(file);
  };

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite?.(file, !isFavorite);
  };

  // Different action layouts based on view mode
  if (view === 'card') {
    return (
      <div className={`absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity ${className}`}>
        <div className="flex items-center space-x-1">
          {/* Quick actions for card view */}
          {isPreviewable && (
            <button
              onClick={handlePreview}
              className="p-1.5 rounded-lg bg-white border border-gray-200 text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 shadow-sm"
              title="Preview"
              disabled={isProcessing}
            >
              <Eye className="w-3 h-3" />
            </button>
          )}
          <button
            onClick={handleDownload}
            className="p-1.5 rounded-lg bg-white border border-gray-200 text-gray-500 hover:text-green-600 hover:bg-green-50 transition-all duration-200 shadow-sm"
            title="Download"
            disabled={isProcessing}
          >
            <Download className="w-3 h-3" />
          </button>
          <button
            onClick={handleToggleFavorite}
            className={`p-1.5 rounded-lg bg-white border border-gray-200 transition-all duration-200 shadow-sm ${
              isFavorite 
                ? 'text-yellow-500 hover:text-yellow-600 hover:bg-yellow-50' 
                : 'text-gray-500 hover:text-yellow-500 hover:bg-yellow-50'
            }`}
            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            {isFavorite ? <StarOff className="w-3 h-3" /> : <Star className="w-3 h-3" />}
          </button>
          
          {/* Context menu */}
          <FileContextMenu
            file={file}
            onPreview={onPreview}
            onRename={onRename}
            onDelete={onDelete}
            onMove={onMove}
            onToggleFavorite={onToggleFavorite}
            isFavorite={isFavorite}
            trigger="click"
            className="p-1.5 rounded-lg bg-white border border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-all duration-200 shadow-sm"
          />
        </div>
      </div>
    );
  }

  if (view === 'grid') {
    return (
      <div className={`absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity ${className}`}>
        <div className="flex items-center space-x-1">
          {/* Essential actions for grid view */}
          {isPreviewable && (
            <button
              onClick={handlePreview}
              className="p-1 rounded-md bg-white border border-gray-200 text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors shadow-sm"
              title="Preview"
              disabled={isProcessing}
            >
              <Eye className="w-3 h-3" />
            </button>
          )}
          <button
            onClick={handleDownload}
            className="p-1 rounded-md bg-white border border-gray-200 text-gray-500 hover:text-green-600 hover:bg-green-50 transition-colors shadow-sm"
            title="Download"
            disabled={isProcessing}
          >
            <Download className="w-3 h-3" />
          </button>
          
          {/* Context menu for more actions */}
          <FileContextMenu
            file={file}
            onPreview={onPreview}
            onRename={onRename}
            onDelete={onDelete}
            onMove={onMove}
            onToggleFavorite={onToggleFavorite}
            isFavorite={isFavorite}
            trigger="click"
            className="p-1 rounded-md bg-white border border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
          />
        </div>
      </div>
    );
  }

  // List view - inline actions
  return (
    <div className={`flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity ${className}`}>
      {showInlineActions && (
        <>
          {/* Primary actions */}
          {isPreviewable && (
            <button
              onClick={handlePreview}
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
              title="Preview"
              disabled={isProcessing}
            >
              <Eye className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={handleDownload}
            className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors"
            title="Download"
            disabled={isProcessing}
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={handleShare}
            className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors"
            title="Share"
            disabled={isProcessing}
          >
            <Share2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleToggleFavorite}
            className={`p-2 rounded-md transition-colors ${
              isFavorite 
                ? 'text-yellow-500 hover:text-yellow-600 hover:bg-yellow-50' 
                : 'text-gray-500 hover:text-yellow-500 hover:bg-yellow-50'
            }`}
            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            {isFavorite ? <StarOff className="w-4 h-4" /> : <Star className="w-4 h-4" />}
          </button>
        </>
      )}
      
      {/* Context menu for additional actions */}
      <FileContextMenu
        file={file}
        onPreview={onPreview}
        onRename={onRename}
        onDelete={onDelete}
        onMove={onMove}
        onToggleFavorite={onToggleFavorite}
        isFavorite={isFavorite}
        trigger="click"
        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
      />
    </div>
  );
};

export default FileActions;