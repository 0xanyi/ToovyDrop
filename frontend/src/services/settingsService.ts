import axios from 'axios';
import { ApiResponse } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface LoginBackgroundResponse {
  filename: string;
  url: string;
}

/**
 * Get current login background image
 */
export const getLoginBackground = async (): Promise<LoginBackgroundResponse | null> => {
  try {
    const response = await axios.get<ApiResponse<LoginBackgroundResponse | null>>(
      `${API_URL}/api/settings/login-background`
    );
    return response.data.data || null;
  } catch (error) {
    console.error('Error fetching login background:', error);
    return null;
  }
};

/**
 * Upload a new login background image (Admin only)
 */
export const uploadLoginBackground = async (
  file: File,
  token: string
): Promise<{ filename: string; message: string }> => {
  const formData = new FormData();
  formData.append('image', file);

  const response = await axios.post<ApiResponse<{ filename: string; message: string }>>(
    `${API_URL}/api/settings/login-background`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.data.success) {
    throw new Error(response.data.error?.message || 'Failed to upload login background');
  }

  return response.data.data!;
};

/**
 * Delete the current login background image (Admin only)
 */
export const deleteLoginBackground = async (token: string): Promise<void> => {
  const response = await axios.delete<ApiResponse>(
    `${API_URL}/api/settings/login-background`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.data.success) {
    throw new Error(response.data.error?.message || 'Failed to delete login background');
  }
};

/**
 * Get the URL for the login background image
 */
export const getLoginBackgroundImageUrl = (): string => {
  return `${API_URL}/api/settings/login-background/image`;
};
