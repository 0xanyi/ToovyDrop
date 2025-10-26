import React, { useState, useEffect } from 'react';
import {
  setLoginBackgroundUrl,
  deleteLoginBackground,
  getLoginBackground,
} from '../../services/settingsService';
import Button from '../Button';
import Input from '../Input';
import { Image as ImageIcon, CheckCircle, AlertTriangle, Trash2, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

const LoginBackgroundUpload: React.FC = () => {
  const [currentBackgroundUrl, setCurrentBackgroundUrl] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
      if (background?.url) {
        setCurrentBackgroundUrl(background.url);
        setUrlInput(background.url);
      }
    } catch (error) {
      console.error('Error fetching login background:', error);
    }
  };

  const handleSaveUrl = async () => {
    const token = getAuthToken();
    if (!token) {
      toast.error('Authentication required');
      return;
    }

    // Validate URL format
    if (!urlInput.trim()) {
      toast.error('Please enter a URL');
      return;
    }

    try {
      new URL(urlInput); // Validate URL format
    } catch {
      toast.error('Please enter a valid URL');
      return;
    }

    setSaving(true);
    try {
      await setLoginBackgroundUrl(urlInput.trim(), token);
      setCurrentBackgroundUrl(urlInput.trim());
      toast.success('Login background URL saved successfully');
    } catch (error: any) {
      console.error('Error setting login background URL:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to save login background URL');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to remove the login background?')) {
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
      setCurrentBackgroundUrl(null);
      setUrlInput('');
      toast.success('Login background removed successfully');
    } catch (error: any) {
      console.error('Error deleting login background:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to remove login background');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center space-x-3 mb-4">
        <ImageIcon className="w-5 h-5 text-gray-400" />
        <div>
          <h3 className="text-lg font-medium text-gray-900">Login Page Background</h3>
          <p className="text-sm text-gray-500">
            Set a custom background image URL for the login page
          </p>
        </div>
      </div>

      {/* Current Background Preview */}
      {currentBackgroundUrl && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Current Background</label>
          <div className="relative w-full h-64 bg-gray-100 rounded-lg overflow-hidden border border-gray-300">
            <img
              src={currentBackgroundUrl}
              alt="Login background preview"
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent) {
                  const errorDiv = document.createElement('div');
                  errorDiv.className = 'flex items-center justify-center h-full text-red-500';
                  errorDiv.innerHTML = '<div class="text-center"><svg class="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg><p class="text-sm">Failed to load image</p></div>';
                  parent.appendChild(errorDiv);
                }
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
      )}

      {/* URL Input Section */}
      <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-blue-400" />
          </div>
          <div className="ml-3">
            <h4 className="text-sm font-medium text-blue-800">Using a CDN URL</h4>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li>Upload your image to Bunny CDN or any image hosting service</li>
                <li>Copy the public URL of your uploaded image</li>
                <li>Paste the URL below</li>
                <li>Recommended resolution: 1920x1080 or higher</li>
                <li>Use high-contrast images for better login form readability</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* URL Input Field */}
      <div className="mb-4">
        <label htmlFor="backgroundUrl" className="block text-sm font-medium text-gray-700 mb-2">
          Background Image URL
        </label>
        <Input
          id="backgroundUrl"
          type="url"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          placeholder="https://cdn.example.com/images/login-background.jpg"
          disabled={saving || deleting}
        />
        <p className="mt-1 text-xs text-gray-500">
          Enter the full URL of your background image
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center space-x-3">
        <Button
          onClick={handleSaveUrl}
          disabled={saving || deleting || !urlInput.trim()}
          variant="primary"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Saving...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              {currentBackgroundUrl ? 'Update Background' : 'Set Background'}
            </>
          )}
        </Button>

        {currentBackgroundUrl && (
          <>
            <Button
              onClick={handleDelete}
              disabled={saving || deleting}
              variant="danger"
            >
              {deleting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Removing...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remove Background
                </>
              )}
            </Button>

            <a
              href={currentBackgroundUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700"
            >
              <ExternalLink className="w-4 h-4 mr-1" />
              View Image
            </a>
          </>
        )}
      </div>

      {/* Success Message */}
      {currentBackgroundUrl && !saving && (
        <div className="mt-4 flex items-center text-sm text-green-600">
          <CheckCircle className="w-4 h-4 mr-2" />
          Custom background is active
        </div>
      )}
    </div>
  );
};

export default LoginBackgroundUpload;
