import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { File as FileType } from '../types';
import Button from '../components/Button';
import FileUpload from '../components/FileUpload';
import FileList from '../components/FileList';
import FilePreviewModal from '../components/FilePreview';
import RenameFileModal from '../components/RenameFileModal';
import { fileService } from '../services/fileService';
import { Upload, FolderOpen, Settings, LogOut, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'upload' | 'files'>('upload');
  const [selectedFile, setSelectedFile] = useState<FileType | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [allFiles, setAllFiles] = useState<FileType[]>([]);
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [fileToRename, setFileToRename] = useState<FileType | null>(null);

  const handleLogout = async () => {
    await logout();
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

  const handleUploadComplete = (_fileId: string, _fileData: any) => {
    // Refresh the file list when upload completes
    setActiveTab('files');
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                ToovyDrop
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Secure File Management Platform
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                Welcome, {user?.email}
              </span>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {user?.role}
              </span>
              {user?.role === 'ADMIN' && (
                <Button
                  variant="secondary"
                  onClick={() => navigate('/admin')}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Admin
                </Button>
              )}
              <Button variant="secondary" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('upload')}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeTab === 'upload'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <Upload className="w-4 h-4 inline-block mr-2" />
              Upload Files
            </button>
            <button
              onClick={() => setActiveTab('files')}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeTab === 'files'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <FolderOpen className="w-4 h-4 inline-block mr-2" />
              My Files
            </button>
          </nav>
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {activeTab === 'upload' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Upload Files
                </h2>
                <p className="text-gray-600">
                  Drag and drop files or click to select. Files are securely uploaded and stored.
                </p>
              </div>

              {userChannels.length > 0 ? (
                <FileUpload
                  channelId={defaultChannelId}
                  channels={userChannels}
                  onUploadComplete={handleUploadComplete}
                />
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
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  My Files
                </h2>
                <p className="text-gray-600">
                  Browse, preview, download, and manage your uploaded files.
                </p>
              </div>

              {userChannels.length > 0 ? (
                <FileList
                  channelId={defaultChannelId}
                  onFileSelect={handleFileSelect}
                  onFilesChange={setAllFiles}
                  onRename={handleRename}
                />
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
      <FilePreviewModal
        file={selectedFile}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        onNext={handleNextFile}
        onPrevious={handlePreviousFile}
        hasNext={currentFileIndex < allFiles.length - 1}
        hasPrevious={currentFileIndex > 0}
      />

      {/* Rename modal */}
      <RenameFileModal
        isOpen={renameModalOpen}
        currentName={fileToRename?.originalName || ''}
        onClose={() => {
          setRenameModalOpen(false);
          setFileToRename(null);
        }}
        onRename={handleRenameSubmit}
      />
    </div>
  );
};

export default DashboardPage;