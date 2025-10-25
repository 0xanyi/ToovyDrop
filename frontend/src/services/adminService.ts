import { ApiResponse } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface DashboardStats {
  users: {
    total: number;
    byRole: Record<string, number>;
    recent: number;
  };
  channels: {
    total: number;
    topByUsage: Array<{
      id: string;
      name: string;
      slug: string;
      _count: {
        files: number;
        guestUploadLinks: number;
      };
    }>;
  };
  files: {
    total: number;
    recent: number;
    totalStorageBytes: bigint;
    typeDistribution: Array<{
      mimeType: string;
      count: number;
      totalSize: bigint;
    }>;
  };
  period: string;
}

interface SystemHealth {
  database: {
    status: string;
    connectedAt: string;
  };
  server: {
    uptime: number;
    memory: NodeJS.MemoryUsage;
    nodeVersion: string;
    environment: string;
  };
  timestamp: string;
}

interface UserListParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: 'ADMIN' | 'CHANNEL_USER';
  sortBy?: 'email' | 'createdAt' | 'lastLoginAt';
  sortOrder?: 'asc' | 'desc';
}

interface UserListResponse {
  users: Array<{
    id: string;
    email: string;
    role: 'ADMIN' | 'CHANNEL_USER';
    isActive: boolean;
    createdAt: string;
    lastLoginAt?: string;
    _count: {
      channels: number;
    };
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

class AdminService {
  private async getCsrfToken(): Promise<string> {
    const response = await fetch(`${API_BASE_URL}/api/security/csrf-token`, {
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch CSRF token');
    }

    const data = await response.json();
    return data.data.token;
  }

  private getAuthHeaders(): HeadersInit {
    const authTokens = localStorage.getItem('authTokens');
    let token = null;
    
    if (authTokens) {
      try {
        const tokens = JSON.parse(authTokens);
        token = tokens.accessToken;
      } catch (error) {
        console.error('Error parsing auth tokens:', error);
      }
    }
    
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    };
  }

  private async getAuthHeadersWithCsrf(): Promise<HeadersInit> {
    const csrfToken = await this.getCsrfToken();
    return {
      ...this.getAuthHeaders(),
      'x-csrf-token': csrfToken
    };
  }

  /**
   * Get dashboard statistics
   */
  async getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
    const response = await fetch(`${API_BASE_URL}/api/admin/dashboard/stats`, {
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch dashboard stats: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get system health information
   */
  async getSystemHealth(): Promise<ApiResponse<SystemHealth>> {
    const response = await fetch(`${API_BASE_URL}/api/admin/system/health`, {
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch system health: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get audit logs
   */
  async getAuditLogs(params?: {
    page?: number;
    limit?: number;
    action?: string;
    resourceType?: string;
  }): Promise<ApiResponse<any>> {
    const searchParams = new URLSearchParams();

    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.action) searchParams.append('action', params.action);
    if (params?.resourceType) searchParams.append('resourceType', params.resourceType);

    const response = await fetch(
      `${API_BASE_URL}/api/admin/audit-logs?${searchParams.toString()}`,
      {
        headers: this.getAuthHeaders()
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch audit logs: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get list of users
   */
  async getUsers(params?: UserListParams): Promise<ApiResponse<UserListResponse>> {
    const searchParams = new URLSearchParams();

    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.search) searchParams.append('search', params.search);
    if (params?.role) searchParams.append('role', params.role);
    if (params?.sortBy) searchParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) searchParams.append('sortOrder', params.sortOrder);

    // Note: This endpoint would need to be implemented in the backend
    const response = await fetch(
      `${API_BASE_URL}/api/admin/users?${searchParams.toString()}`,
      {
        headers: this.getAuthHeaders()
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch users: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Create a new user
   */
  async createUser(userData: {
    email: string;
    password: string;
    role: 'ADMIN' | 'CHANNEL_USER';
  }): Promise<ApiResponse<any>> {
    const response = await fetch(`${API_BASE_URL}/api/admin/users`, {
      method: 'POST',
      headers: await this.getAuthHeadersWithCsrf(),
      body: JSON.stringify(userData)
    });

    if (!response.ok) {
      throw new Error(`Failed to create user: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Update user
   */
  async updateUser(
    userId: string,
    userData: {
      email?: string;
      role?: 'ADMIN' | 'CHANNEL_USER';
      isActive?: boolean;
    }
  ): Promise<ApiResponse<any>> {
    const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}`, {
      method: 'PUT',
      headers: await this.getAuthHeadersWithCsrf(),
      body: JSON.stringify(userData)
    });

    if (!response.ok) {
      throw new Error(`Failed to update user: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Deactivate user
   */
  async deactivateUser(userId: string): Promise<ApiResponse<any>> {
    const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}`, {
      method: 'DELETE',
      headers: await this.getAuthHeadersWithCsrf()
    });

    if (!response.ok) {
      throw new Error(`Failed to deactivate user: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get user channel assignments
   */
  async getUserChannels(userId: string): Promise<ApiResponse<any>> {
    const response = await fetch(
      `${API_BASE_URL}/api/admin/users/${userId}/channels`,
      {
        headers: this.getAuthHeaders()
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch user channels: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Update user channel assignments
   */
  async updateUserChannels(
    userId: string,
    channelIds: string[]
  ): Promise<ApiResponse<any>> {
    const response = await fetch(
      `${API_BASE_URL}/api/admin/users/${userId}/channels`,
      {
        method: 'PUT',
        headers: await this.getAuthHeadersWithCsrf(),
        body: JSON.stringify({ channelIds })
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to update user channels: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get analytics data
   */
  async getAnalytics(dateRange: '7d' | '30d' | '90d' | '1y'): Promise<ApiResponse<any>> {
    const response = await fetch(
      `${API_BASE_URL}/api/admin/analytics?dateRange=${dateRange}`,
      {
        headers: this.getAuthHeaders()
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch analytics: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get list of channels
   */
  async getChannels(params?: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<ApiResponse<any>> {
    const searchParams = new URLSearchParams();

    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.search) searchParams.append('search', params.search);
    if (params?.isActive !== undefined) searchParams.append('isActive', params.isActive.toString());
    if (params?.sortBy) searchParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) searchParams.append('sortOrder', params.sortOrder);

    const response = await fetch(
      `${API_BASE_URL}/api/channels?${searchParams.toString()}`,
      {
        headers: this.getAuthHeaders()
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch channels: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get single channel details
   */
  async getChannel(channelId: string): Promise<ApiResponse<any>> {
    const response = await fetch(`${API_BASE_URL}/api/channels/${channelId}`, {
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch channel: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Delete channel
   */
  async deleteChannel(channelId: string): Promise<ApiResponse<any>> {
    const response = await fetch(`${API_BASE_URL}/api/channels/${channelId}`, {
      method: 'DELETE',
      headers: await this.getAuthHeadersWithCsrf()
    });

    if (!response.ok) {
      throw new Error(`Failed to delete channel: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Create channel
   */
  async createChannel(data: {
    name: string;
    description?: string;
    ftpPath: string;
  }): Promise<ApiResponse<any>> {
    const response = await fetch(`${API_BASE_URL}/api/channels`, {
      method: 'POST',
      headers: await this.getAuthHeadersWithCsrf(),
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`Failed to create channel: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Update channel
   */
  async updateChannel(channelId: string, data: {
    name?: string;
    description?: string;
    ftpPath?: string;
    isActive?: boolean;
  }): Promise<ApiResponse<any>> {
    const response = await fetch(`${API_BASE_URL}/api/channels/${channelId}`, {
      method: 'PUT',
      headers: await this.getAuthHeadersWithCsrf(),
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`Failed to update channel: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get channel users
   */
  async getChannelUsers(channelId: string): Promise<ApiResponse<any>> {
    const response = await fetch(`${API_BASE_URL}/api/channels/${channelId}/users`, {
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch channel users: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Update channel users
   */
  async updateChannelUsers(channelId: string, userIds: string[]): Promise<ApiResponse<any>> {
    const response = await fetch(`${API_BASE_URL}/api/channels/${channelId}/users`, {
      method: 'PUT',
      headers: await this.getAuthHeadersWithCsrf(),
      body: JSON.stringify({ userIds })
    });

    if (!response.ok) {
      throw new Error(`Failed to update channel users: ${response.statusText}`);
    }

    return response.json();
  }
}

export const adminService = new AdminService();
export type { UserListParams };