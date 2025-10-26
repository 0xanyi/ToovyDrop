import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { guestUploadService, GuestLinkValidationResponse } from '../services/guestUploadService';
import Button from '../components/Button';
import Card from '../components/Card';
import GuestFileUpload from '../components/GuestFileUpload';

interface UploadResult {
  success: boolean;
  fileId?: string;
  fileName?: string;
  error?: string;
  retryable?: boolean;
}

const GuestUploadPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  
  const [linkData, setLinkData] = useState<GuestLinkValidationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Validate guest link on component mount
  useEffect(() => {
    if (!token) {
      setError('Invalid guest link - no token provided');
      setLoading(false);
      return;
    }

    validateGuestLink();
  }, [token]);

  const validateGuestLink = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await guestUploadService.validateGuestLink(token!);
      setLinkData(data);
    } catch (err) {
      let errorMessage = 'Failed to validate guest link';
      
      if (err && typeof err === 'object' && 'code' in err && typeof err.code === 'string') {
        switch (err.code) {
          case 'LINK_NOT_FOUND':
            errorMessage = 'This guest link does not exist or has been deleted.';
            break;
          case 'LINK_EXPIRED':
            errorMessage = 'This guest link has expired and is no longer valid.';
            break;
          case 'RATE_LIMITED':
            errorMessage = 'Too many requests. Please wait a moment and try again.';
            break;
          case 'NETWORK_ERROR':
            errorMessage = 'Network connection error. Please check your internet connection.';
            break;
          case 'TIMEOUT':
            errorMessage = 'Request timed out. Please try again.';
            break;
          case 'SERVER_ERROR':
            errorMessage = 'Server error occurred. Please try again later.';
            break;
          default:
            errorMessage = (err as unknown as Error).message || errorMessage;
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadComplete = (result: UploadResult) => {
    // Refresh link data to show updated upload count if upload was successful
    if (result.success) {
      validateGuestLink();
    }
  };

  const handleUploadStart = () => {
    setError(null);
  };

  const isUploadDisabled = () => {
    if (!linkData) return true;
    if (linkData.link.maxUploads && linkData.link.uploadCount >= linkData.link.maxUploads) return true;
    return false;
  };

  const getUploadLimitText = () => {
    if (!linkData?.link.maxUploads) return null;
    
    const remaining = linkData.link.maxUploads - linkData.link.uploadCount;
    if (remaining <= 0) {
      return 'Upload limit reached';
    }
    
    return `${remaining} upload${remaining === 1 ? '' : 's'} remaining`;
  };

  const getExpirationText = () => {
    if (!linkData?.link.expiresAt) return null;
    
    const expirationDate = new Date(linkData.link.expiresAt);
    const now = new Date();
    
    if (expirationDate <= now) {
      return 'This link has expired';
    }
    
    const diffTime = expirationDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      return 'Expires in 1 day';
    } else if (diffDays <= 7) {
      return `Expires in ${diffDays} days`;
    } else {
      return `Expires on ${expirationDate.toLocaleDateString()}`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Validating guest link...</p>
        </div>
      </div>
    );
  }

  if (error && !linkData) {
    const isRetryableError = error.includes('Network') || error.includes('timeout') || error.includes('Server error');
    
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              {isRetryableError ? 'Connection Error' : 'Invalid Guest Link'}
            </h1>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="flex justify-center space-x-3">
              {isRetryableError && (
                <Button
                  onClick={validateGuestLink}
                  variant="primary"
                >
                  Try Again
                </Button>
              )}
              <Button
                onClick={() => navigate('/')}
                variant="outline"
              >
                Go to Homepage
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">File Upload</h1>
          <p className="text-gray-600">
            Upload files to <span className="font-semibold">{linkData?.channel.name}</span>
          </p>
          {linkData?.link.description && (
            <p className="text-sm text-gray-500 mt-1">{linkData.link.description}</p>
          )}
        </div>

        {/* Link Information */}
        <Card className="mb-6">
          <div className="p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Upload Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {linkData?.link.description && (
                <div>
                  <span className="font-medium text-gray-700">Description:</span>
                  <p className="text-gray-600">{linkData.link.description}</p>
                </div>
              )}
              {linkData?.link.guestFolder && (
                <div>
                  <span className="font-medium text-gray-700">Folder:</span>
                  <p className="text-gray-600">{linkData.link.guestFolder}</p>
                </div>
              )}
              <div>
                <span className="font-medium text-gray-700">Max File Size:</span>
                <p className="text-gray-600">
                  {linkData?.uploadConfig.maxFileSize 
                    ? guestUploadService.formatFileSize(linkData.uploadConfig.maxFileSize)
                    : 'No limit'
                  }
                </p>
              </div>
              {getUploadLimitText() && (
                <div>
                  <span className="font-medium text-gray-700">Upload Limit:</span>
                  <p className={`${(linkData?.link.uploadCount || 0) >= (linkData?.link.maxUploads || 0) ? 'text-red-600' : 'text-gray-600'}`}>
                    {getUploadLimitText()}
                  </p>
                </div>
              )}
              {getExpirationText() && (
                <div className="md:col-span-2">
                  <span className="font-medium text-gray-700">Expiration:</span>
                  <p className="text-gray-600">{getExpirationText()}</p>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Upload Interface */}
        <Card>
          <div className="p-6">
            {!isUploadDisabled() ? (
              <GuestFileUpload
                token={token!}
                maxFileSize={linkData?.uploadConfig.maxFileSize}
                allowedMimeTypes={linkData?.uploadConfig.allowedMimeTypes}
                onUploadComplete={handleUploadComplete}
                onUploadStart={handleUploadStart}
              />
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Upload Not Available</h3>
                <p className="text-red-600">
                  {linkData?.link.maxUploads && linkData.link.uploadCount >= linkData.link.maxUploads
                    ? 'This guest link has reached its upload limit.'
                    : 'This guest link is no longer available for uploads.'
                  }
                </p>
              </div>
            )}

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                  <p className="text-red-700">{error}</p>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default GuestUploadPage;