import type { ApiResponse } from '@meeting-transcriber/shared';

export interface ClientConfig {
  baseUrl: string;
  getAuthToken?: () => Promise<string | null>;
}

export class ApiClient {
  private static instance: ApiClient;
  private config: ClientConfig;

  private constructor(config: ClientConfig) {
    this.config = config;
  }

  static initialize(config: ClientConfig): void {
    ApiClient.instance = new ApiClient(config);
  }

  static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      throw new Error('ApiClient not initialized. Call ApiClient.initialize() first.');
    }
    return ApiClient.instance;
  }

  private async getHeaders(): Promise<HeadersInit> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.config.getAuthToken) {
      const token = await this.config.getAuthToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
        method: 'GET',
        headers: await this.getHeaders(),
      });

      if (!response.ok) {
        return { success: false, error: `HTTP ${response.status}` };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async post<T>(endpoint: string, body: unknown): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: await this.getHeaders(),
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        return { success: false, error: `HTTP ${response.status}` };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async postFormData<T>(endpoint: string, formData: FormData): Promise<ApiResponse<T>> {
    try {
      const headers: HeadersInit = {};
      if (this.config.getAuthToken) {
        const token = await this.config.getAuthToken();
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
      }

      const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        return { success: false, error: `HTTP ${response.status}` };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
        method: 'DELETE',
        headers: await this.getHeaders(),
      });

      if (!response.ok) {
        return { success: false, error: `HTTP ${response.status}` };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }
}
