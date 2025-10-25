import React, { useState, useEffect, useRef } from 'react';
import {
  Eye,
  Download,
  Share2,
  Copy,
  Edit2,
  Move,
  Star,
  StarOff,
  Info,
  Trash2,
  MoreVertical,
  ExternalLink,
  FileText
} from 'lucide-react';
import { File as FileType } from '../types';
import { fileService } from '../services/fileService';
import toast from 'react-hot-toast';

interface FileContextMenuProps {
  file: FileType;
  onPreview?: (file: FileType) => void;
  onRename?: (file: FileType) => void;
  onDelete?: (file: FileType) => void;
  onMove?: (file: FileType) => void;
  onToggleFavorite?: (file: FileType, isFavorite: boolean) => void;
  isFavorite?: boolean;
  position?: { x: number; y: number };
  onClose?: () => void;
  trigger?: 'click' | 'contextmenu';
  className?: string;
}

interface MenuAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  shortcut?: string;
  color?: string;
  separator?: boolean;
  disabled?: boolean;
  action: () => void;
}

const FileContextMenu: React.FC<FileContextMenuProps> = ({
  file,
  onPreview,
  onRename,
  onDelete,
  onMove,
  onToggleFavorite,
  isFavorite = false,
  position,
  onClose,
  trigger = 'click',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState(position || { x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const isPreviewable = fileService.isPreviewable(file.mimeType);

  // Handle click outside to close menu
  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      const target = event.target as Element;
      if (menuRef.current && !menuRef.current.contains(target) &&
          triggerRef.current && !triggerRef.current.contains(target)) {
        setIsOpen(false);
        onClose?.();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      switch (event.key) {
        case 'Escape':
          setIsOpen(false);
          onClose?.();
          break;
        case 'Enter':
          if (isPreviewable && onPreview) {
            onPreview(file);
            setIsOpen(false);
          }
          break;
        case 'd':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            handleDownload();
            setIsOpen(false);
          }
          break;
        case 'r':
          if ((event.ctrlKey || event.metaKey) && onRename) {
            event.preventDefault();
            onRename(file);
            setIsOpen(false);
          }
          break;
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, file, isPreviewable, onPreview, onRename]);

  const handleDownload = async () => {
    try {
      await fileService.downloadFile(file.id, file.originalName);
      toast.success('Download started');
    } catch {
      toast.error('Failed to download file');
    }
  };

  const handleCopyLink = async () => {
    try {
      const fileUrl = fileService.generateFileUrl(file.id);
      await window.navigator.clipboard.writeText(fileUrl);
      toast.success('File link copied to clipboard');
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handleShare = async () => {
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

  const handleOpenInNewTab = () => {
    const fileUrl = fileService.generateFileUrl(file.id);
    window.open(fileUrl, '_blank');
  };

  const handleToggleMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (trigger === 'contextmenu') {
      setMenuPosition({ x: event.clientX, y: event.clientY });
    } else {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (rect) {
        setMenuPosition({
          x: rect.right,
          y: rect.top
        });
      }
    }

    setIsOpen(!isOpen);
  };

  // Adjust menu position to stay within viewport
  useEffect(() => {
    if (isOpen && menuRef.current) {
      const menu = menuRef.current;
      const rect = menu.getBoundingClientRect();
      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight
      };

      let { x, y } = menuPosition;

      // Adjust horizontal position
      if (x + rect.width > viewport.width) {
        x = viewport.width - rect.width - 10;
      }
      if (x < 10) {
        x = 10;
      }

      // Adjust vertical position
      if (y + rect.height > viewport.height) {
        y = viewport.height - rect.height - 10;
      }
      if (y < 10) {
        y = 10;
      }

      if (x !== menuPosition.x || y !== menuPosition.y) {
        setMenuPosition({ x, y });
      }
    }
  }, [isOpen, menuPosition]);

  // Menu actions configuration
  const menuActions: MenuAction[] = [
    // Preview actions
    ...(isPreviewable ? [{
      id: 'preview',
      label: 'Preview',
      icon: Eye,
      shortcut: 'Enter',
      action: () => {
        onPreview?.(file);
        setIsOpen(false);
      }
    }] : []),
    {
      id: 'open-new-tab',
      label: 'Open in new tab',
      icon: ExternalLink,
      action: () => {
        handleOpenInNewTab();
        setIsOpen(false);
      }
    },
    {
      id: 'download',
      label: 'Download',
      icon: Download,
      shortcut: 'Ctrl+D',
      action: () => {
        handleDownload();
        setIsOpen(false);
      }
    },
    
    // Separator
    { id: 'sep1', label: '', icon: FileText, separator: true, action: () => {} },
    
    // Sharing actions
    {
      id: 'share',
      label: 'Share',
      icon: Share2,
      action: () => {
        handleShare();
        setIsOpen(false);
      }
    },
    {
      id: 'copy-link',
      label: 'Copy link',
      icon: Copy,
      action: () => {
        handleCopyLink();
        setIsOpen(false);
      }
    },
    
    // Separator
    { id: 'sep2', label: '', icon: FileText, separator: true, action: () => {} },
    
    // File management actions
    {
      id: 'rename',
      label: 'Rename',
      icon: Edit2,
      shortcut: 'Ctrl+R',
      disabled: !onRename,
      action: () => {
        onRename?.(file);
        setIsOpen(false);
      }
    },
    {
      id: 'move',
      label: 'Move to...',
      icon: Move,
      disabled: !onMove,
      action: () => {
        onMove?.(file);
        setIsOpen(false);
      }
    },
    {
      id: 'favorite',
      label: isFavorite ? 'Remove from favorites' : 'Add to favorites',
      icon: isFavorite ? StarOff : Star,
      color: isFavorite ? 'text-gray-600' : 'text-yellow-600',
      action: () => {
        onToggleFavorite?.(file, !isFavorite);
        setIsOpen(false);
      }
    },
    
    // Separator
    { id: 'sep3', label: '', icon: FileText, separator: true, action: () => {} },
    
    // File info
    {
      id: 'info',
      label: 'File info',
      icon: Info,
      action: () => {
        // Show file info modal or panel
        const info = [
          `Name: ${file.originalName}`,
          `Size: ${fileService.formatFileSize(file.size)}`,
          `Type: ${file.mimeType || 'Unknown'}`,
          `Created: ${new Date(file.createdAt).toLocaleString()}`,
          `Modified: ${new Date(file.updatedAt).toLocaleString()}`
        ].join('\n');
        
        // For now, show in alert - in real app, would show in modal
        alert(info);
        setIsOpen(false);
      }
    },
    
    // Separator
    { id: 'sep4', label: '', icon: FileText, separator: true, action: () => {} },
    
    // Destructive actions
    {
      id: 'delete',
      label: 'Delete',
      icon: Trash2,
      color: 'text-red-600 hover:bg-red-50',
      disabled: !onDelete,
      action: () => {
        onDelete?.(file);
        setIsOpen(false);
      }
    }
  ];

  const visibleActions = menuActions.filter(action => !action.disabled);

  return (
    <div className={className}>
      {/* Trigger button */}
      <button
        ref={triggerRef}
        onClick={trigger === 'click' ? handleToggleMenu : undefined}
        onContextMenu={trigger === 'contextmenu' ? handleToggleMenu : undefined}
        className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        title="More actions"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {/* Context menu */}
      {isOpen && (
        <div
          ref={menuRef}
          className="fixed bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1 min-w-[200px]"
          style={{
            left: menuPosition.x,
            top: menuPosition.y
          }}
        >
          {visibleActions.map((action) => {
            if (action.separator) {
              return (
                <div key={action.id} className="border-t border-gray-100 my-1" />
              );
            }

            const Icon = action.icon;
            return (
              <button
                key={action.id}
                onClick={action.action}
                className={`
                  flex items-center justify-between w-full px-3 py-2 text-sm transition-colors
                  ${action.color || 'text-gray-700 hover:bg-gray-100'}
                `}
              >
                <div className="flex items-center space-x-3">
                  <Icon className="w-4 h-4" />
                  <span>{action.label}</span>
                </div>
                {action.shortcut && (
                  <span className="text-xs text-gray-400 ml-4">
                    {action.shortcut}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FileContextMenu;