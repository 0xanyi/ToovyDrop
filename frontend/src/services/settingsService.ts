import axios from 'axios';
import { ApiResponse } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface LoginBackgroundResponse {
  url: string;
}

/**
 * Get current login background URL
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
 * Set login background image URL (Admin only)
 */
export const setLoginBackgroundUrl = async (
  url: string,
  token: string
): Promise<{ url: string; message: string }> => {
  const response = await axios.post<ApiResponse<{ url: string; message: string }>>(
    `${API_URL}/api/settings/login-background`,
    { url },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.data.success) {
    throw new Error(response.data.error?.message || 'Failed to set login background URL');
  }

  return response.data.data!;
};

/**
 * Delete the current login background URL (Admin only)
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
