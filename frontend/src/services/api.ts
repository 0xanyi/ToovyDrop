import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { ApiResponse } from '../types';

class ApiService {
  public client: AxiosInstance;
  private csrfToken: string | null = null;
  private csrfTokenExpiry: number = 0;

  constructor() {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    this.client = axios.create({
      baseURL: `${apiUrl}/api`,
      timeout: 30000,
    });

    // Request interceptor to add auth token and CSRF token
    this.client.interceptors.request.use(
      async (config) => {
        const tokens = localStorage.getItem('authTokens');
        if (tokens) {
          const { accessToken } = JSON.parse(tokens);
          config.headers.Authorization = `Bearer ${accessToken}`;
        }

        // Add CSRF token for state-changing requests
        if (config.method && ['post', 'put', 'delete', 'patch'].includes(config.method.toLowerCase())) {
          const csrfToken = await this.getCsrfToken();
          config.headers['x-csrf-token'] = csrfToken;
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor to handle auth errors
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          localStorage.removeItem('authTokens');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  private async getCsrfToken(): Promise<string> {
    // Check if we have a valid cached token
    const now = Date.now();
    if (this.csrfToken && this.csrfTokenExpiry > now) {
      return this.csrfToken;
    }

    // Fetch a new CSRF token
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await axios.get(`${apiUrl}/api/security/csrf-token`, {
        headers: {
          Authorization: this.client.defaults.headers.common['Authorization']
        }
      });

      const token = response.data.data.token;
      this.csrfToken = token;
      // Set expiry to 14 minutes (token is valid for 15 minutes)
      this.csrfTokenExpiry = now + 14 * 60 * 1000;
      
      return token;
    } catch (error) {
      console.error('Failed to fetch CSRF token:', error);
      throw new Error('Failed to fetch CSRF token');
    }
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.get(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.post(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.put(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.delete(url, config);
    return response.data;
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.patch(url, data, config);
    return response.data;
  }
}

export type { ApiResponse };
export const apiService = new ApiService();