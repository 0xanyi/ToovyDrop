import React, { useState, useEffect, Suspense } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { File as FileType } from '../types';
import Layout from '../components/Layout';
import { fileService } from '../services/fileService';
import { Settings } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useIsMobile } from '../hooks/useSwipeGestures';
import { cn } from '../design-system/utils';

// Lazy load heavy components
const FileUpload = React.lazy(() => import('../components/FileUpload'));
const EnhancedFileList = React.lazy(() => import('../components/EnhancedFileList'));
const FilePreviewModal = React.lazy(() => import('../components/FilePreview'));
const RenameFileModal = React.lazy(() => import('../components/RenameFileModal'));

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();

  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'upload' | 'files'>('upload');
  const [selectedFile, setSelectedFile] = useState<FileType | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [allFiles, setAllFiles] = useState<FileType[]>([]);
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [fileToRename, setFileToRename] = useState<FileType | null>(null);

  // Handle tab changes from URL parameters
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'upload' || tab === 'files') {
      setActiveTab(tab);
    } else {
      // Default to upload tab if no tab is specified
      setActiveTab('upload');
      setSearchParams({ tab: 'upload' });
    }
  }, [searchParams, setSearchParams]);

  const handleTabChange = (tab: 'upload' | 'files') => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const handleFileSelect = (file: FileType) => {
    setSelectedFile(file);
    setCurrentFileIndex(allFiles.findIndex(f => f.id === file.id));
    setIsPreviewOpen(true);
  };

  const handleRename = (file: FileType) => {
    setFileToRename(file);
    setRenameModalOpen(true);
  };

  const handleRenameSubmit = async (newName: string) => {
    if (!fileToRename) return;

    try {
      await fileService.renameFile(fileToRename.id, newName);
      // Refresh the file list to get updated names
      // For now, let's just close the modal and the list will refresh on next load
      setRenameModalOpen(false);
    } catch (error) {
      console.error('Rename failed:', error);
    }
  };

  const handleUploadComplete = (_fileId: string, _fileData: unknown) => {
    // Refresh the file list when upload completes
    handleTabChange('files');
  };

  const handleNextFile = () => {
    if (currentFileIndex < allFiles.length - 1) {
      const nextFile = allFiles[currentFileIndex + 1];
      setSelectedFile(nextFile);
      setCurrentFileIndex(currentFileIndex + 1);
    }
  };

  const handlePreviousFile = () => {
    if (currentFileIndex > 0) {
      const previousFile = allFiles[currentFileIndex - 1];
      setSelectedFile(previousFile);
      setCurrentFileIndex(currentFileIndex - 1);
    }
  };

  const userChannels = user?.channels || [];
  const defaultChannelId = userChannels.length > 0 ? userChannels[0].id : '';

  return (
    <Layout>


      {/* Main content */}
      <main className={cn(
        'max-w-7xl mx-auto',
        isMobile ? 'py-4 px-4' : 'py-6 sm:px-6 lg:px-8'
      )}>
        <div className={cn(isMobile ? 'space-y-4' : 'px-4 py-6 sm:px-0')}>
          {activeTab === 'upload' && (
            <div className={cn(isMobile ? 'space-y-4' : 'space-y-6')}>
              <div className={cn(isMobile && 'text-center')}>
                <h2 className={cn(
                  'font-bold text-gray-900 mb-2',
                  isMobile ? 'text-xl' : 'text-2xl'
                )}>
                  Upload Files
                </h2>
                <p className={cn(
                  'text-gray-600',
                  isMobile ? 'text-sm' : 'text-base'
                )}>
                  {isMobile 
                    ? 'Tap to select files or drag from other apps'
                    : 'Drag and drop files or click to select. Files are securely uploaded and stored.'
                  }
                </p>
              </div>

              {userChannels.length > 0 ? (
                <Suspense fallback={
                  <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                  </div>
                }>
                  <FileUpload
                    channelId={defaultChannelId}
                    channels={userChannels}
                    onUploadComplete={handleUploadComplete}
                  />
                </Suspense>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <Settings className="h-5 w-5 text-yellow-400" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800">
                        No channels available
                      </h3>
                      <div className="mt-2 text-sm text-yellow-700">
                        <p>
                          You don't have access to any channels yet. Please contact your administrator to get assigned to a channel.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'files' && (
            <div className={cn(isMobile ? 'space-y-4' : 'space-y-6')}>
              <div className={cn(isMobile && 'text-center')}>
                <h2 className={cn(
                  'font-bold text-gray-900 mb-2',
                  isMobile ? 'text-xl' : 'text-2xl'
                )}>
                  My Files
                </h2>
                <p className={cn(
                  'text-gray-600',
                  isMobile ? 'text-sm' : 'text-base'
                )}>
                  {isMobile 
                    ? 'Swipe left to preview, right to select'
                    : 'Browse, preview, download, and manage your uploaded files.'
                  }
                </p>
              </div>

              {userChannels.length > 0 ? (
                <Suspense fallback={
                  <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                  </div>
                }>
                  <EnhancedFileList
                    channelId={defaultChannelId}
                    onFileSelect={handleFileSelect}
                    onFilesChange={setAllFiles}
                    onRename={handleRename}
                  />
                </Suspense>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <Settings className="h-5 w-5 text-yellow-400" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800">
                        No channels available
                      </h3>
                      <div className="mt-2 text-sm text-yellow-700">
                        <p>
                          You don't have access to any channels yet. Please contact your administrator to get assigned to a channel.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* File preview modal */}
      <Suspense fallback={null}>
        <FilePreviewModal
          file={selectedFile}
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          onNext={handleNextFile}
          onPrevious={handlePreviousFile}
          hasNext={currentFileIndex < allFiles.length - 1}
          hasPrevious={currentFileIndex > 0}
        />
      </Suspense>

      {/* Rename modal */}
      <Suspense fallback={null}>
        <RenameFileModal
          isOpen={renameModalOpen}
          currentName={fileToRename?.originalName || ''}
          onClose={() => {
            setRenameModalOpen(false);
            setFileToRename(null);
          }}
          onRename={handleRenameSubmit}
        />
      </Suspense>
    </Layout>
  );
};

export default DashboardPage;