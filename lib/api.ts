import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

// Storage keys
const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

interface RegisterData {
  email: string;
  password: string;
  fullName?: string;
}

interface LoginData {
  email: string;
  password: string;
}

// Add these new interfaces for proper typing
interface Session {
  accessToken: string;
  refreshToken: string;
}

interface AuthResponse {
  session: Session;
  user?: {
    id: string;
    email: string;
    fullName?: string;
  };
}

interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

class ApiClient {
  private baseURL: string;  

  constructor() {
    this.baseURL = API_URL;
    console.log('API Base URL:', this.baseURL);
  }

  // Helper method to get stored token
  private async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(TOKEN_KEY);
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  }

  // Helper method to save tokens
  private async saveTokens(accessToken: string, refreshToken: string): Promise<void> {
    try {
      await AsyncStorage.setItem(TOKEN_KEY, accessToken);
      await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    } catch (error) {
      console.error('Error saving tokens:', error);
    }
  }

  // Helper method to clear tokens
  private async clearTokens(): Promise<void> {
    try {
      await AsyncStorage.removeItem(TOKEN_KEY);
      await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
  }

  // Generic request method
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const token = await this.getToken();
      
      // FIX 1: Use Record<string, string> instead of HeadersInit
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Merge existing headers if they exist
      if (options.headers) {
        const existingHeaders = options.headers as Record<string, string>;
        Object.assign(headers, existingHeaders);
      }

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          error: data.error || 'Request failed',
          message: data.message || 'An error occurred',
        };
      }

      return { data };
    } catch (error) {
      console.error('API request error:', error);
      return {
        error: 'Network error',
        message: error instanceof Error ? error.message : 'Failed to connect to server',
      };
    }
  }

  // Auth endpoints
  async register(userData: RegisterData): Promise<ApiResponse<AuthResponse>> {
    const response = await this.request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });

    return response;
  }

  // FIX 2: Add proper generic type for login response
  async login(credentials: LoginData): Promise<ApiResponse<AuthResponse>> {
    const response = await this.request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    if (response.data?.session) {
      await this.saveTokens(
        response.data.session.accessToken,
        response.data.session.refreshToken
      );
    }

    return response;
  }

  async logout(): Promise<ApiResponse<{ success: boolean }>> {
    const response = await this.request<{ success: boolean }>('/api/auth/logout', {
      method: 'POST',
    });

    await this.clearTokens();
    return response;
  }

  async getCurrentUser(): Promise<ApiResponse<{ user: AuthResponse['user'] }>> {
    return this.request('/api/auth/me', {
      method: 'GET',
    });
  }

  // FIX 2: Add proper generic type for refresh response
  async refreshToken(): Promise<ApiResponse<AuthResponse>> {
    try {
      const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
      
      if (!refreshToken) {
        return { error: 'No refresh token available' };
      }

      const response = await this.request<AuthResponse>('/api/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      });

      if (response.data?.session) {
        await this.saveTokens(
          response.data.session.accessToken,
          response.data.session.refreshToken
        );
      }

      return response;
    } catch (error) {
      return {
        error: 'Token refresh failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Check if user is authenticated
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getToken();
    return !!token;
  }
}

export const api = new ApiClient();
export type { ApiResponse, AuthResponse, LoginData, RegisterData, Session };

