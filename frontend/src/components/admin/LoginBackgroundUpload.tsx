import React, { useState, useEffect, useRef } from 'react';
import {
  uploadLoginBackground,
  deleteLoginBackground,
  getLoginBackground,
  getLoginBackgroundImageUrl,
} from '../../services/settingsService';
import Button from '../Button';
import { Upload, Trash2, Image as ImageIcon, CheckCircle, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

const LoginBackgroundUpload: React.FC = () => {
  const [currentBackground, setCurrentBackground] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get auth token
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

  // Fetch current background on mount
  useEffect(() => {
    fetchCurrentBackground();
  }, []);

  const fetchCurrentBackground = async () => {
    try {
      const background = await getLoginBackground();
      if (background) {
        setCurrentBackground(background.filename);
        setPreviewUrl(getLoginBackgroundImageUrl());
      }
    } catch (error) {
      console.error('Error fetching login background:', error);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.');
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB.');
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload file
    await handleUpload(file);
  };

  const handleUpload = async (file: File) => {
    const token = getAuthToken();
    if (!token) {
      toast.error('Authentication required');
      return;
    }

    setUploading(true);
    try {
      const result = await uploadLoginBackground(file, token);
      setCurrentBackground(result.filename);
      toast.success('Login background image uploaded successfully');
      // Refresh preview
      setPreviewUrl(`${getLoginBackgroundImageUrl()}?t=${Date.now()}`);
    } catch (error: any) {
      console.error('Error uploading login background:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to upload login background');
      // Restore previous preview
      if (currentBackground) {
        setPreviewUrl(getLoginBackgroundImageUrl());
      } else {
        setPreviewUrl(null);
      }
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete the login background image?')) {
      return;
    }

    const token = getAuthToken();
    if (!token) {
      toast.error('Authentication required');
      return;
    }

    setDeleting(true);
    try {
      await deleteLoginBackground(token);
      setCurrentBackground(null);
      setPreviewUrl(null);
      toast.success('Login background image deleted successfully');
    } catch (error: any) {
      console.error('Error deleting login background:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to delete login background');
    } finally {
      setDeleting(false);
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center space-x-3 mb-4">
        <ImageIcon className="w-5 h-5 text-gray-400" />
        <div>
          <h3 className="text-lg font-medium text-gray-900">Login Page Background</h3>
          <p className="text-sm text-gray-500">
            Customize the background image for the login page
          </p>
        </div>
      </div>

      {/* Current Background Preview */}
      {previewUrl ? (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Current Background</label>
          <div className="relative w-full h-64 bg-gray-100 rounded-lg overflow-hidden border border-gray-300">
            <img
              src={previewUrl}
              alt="Login background preview"
              className="w-full h-full object-cover"
              onError={() => {
                console.error('Failed to load image preview');
                setPreviewUrl(null);
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900/50 via-slate-900/30 to-transparent"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-white/90 backdrop-blur-sm p-8 rounded-xl shadow-xl">
                <h4 className="text-xl font-bold text-gray-900 mb-2">Login Preview</h4>
                <p className="text-sm text-gray-600">This is how your login page will look</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Current Background</label>
          <div className="w-full h-64 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 rounded-lg flex items-center justify-center border border-gray-300">
            <div className="text-center">
              <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No custom background uploaded</p>
              <p className="text-xs text-gray-400">Default gradient will be used</p>
            </div>
          </div>
        </div>
      )}

      {/* File Upload Info */}
      <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-blue-400" />
          </div>
          <div className="ml-3">
            <h4 className="text-sm font-medium text-blue-800">Upload Guidelines</h4>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li>Accepted formats: JPEG, PNG, WebP</li>
                <li>Maximum file size: 10MB</li>
                <li>Recommended resolution: 1920x1080 or higher</li>
                <li>Use high-contrast images for better login form readability</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Actions */}
      <div className="flex items-center space-x-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileSelect}
          className="hidden"
        />

        <Button
          onClick={handleBrowseClick}
          disabled={uploading || deleting}
          variant="primary"
        >
          {uploading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              {currentBackground ? 'Replace Background' : 'Upload Background'}
            </>
          )}
        </Button>

        {currentBackground && (
          <Button onClick={handleDelete} disabled={uploading || deleting} variant="danger">
            {deleting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Remove Background
              </>
            )}
          </Button>
        )}
      </div>

      {/* Success Message */}
      {currentBackground && !uploading && (
        <div className="mt-4 flex items-center text-sm text-green-600">
          <CheckCircle className="w-4 h-4 mr-2" />
          Custom background is active
        </div>
      )}
    </div>
  );
};

export default LoginBackgroundUpload;
