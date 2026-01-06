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
    if (ApiClient.instance) {
      console.warn('ApiClient already initialized. Ignoring duplicate initialization.');
      return;
    }
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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒タイムアウト

    try {
      const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
        method: 'GET',
        headers: await this.getHeaders(),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const message = errorBody.message || errorBody.error || response.statusText;
        return {
          success: false,
          error: {
            code: `HTTP_${response.status}`,
            message: message,
          },
        };
      }

      // 空レスポンスの処理
      const data =
        response.status === 204 || response.headers.get('content-length') === '0'
          ? undefined
          : await response.json();
      return { success: true, data } as ApiResponse<T>;
    } catch (error) {
      clearTimeout(timeoutId);
      const message = error instanceof Error ? error.message : String(error);
      if (process.env.NODE_ENV === 'development') {
        console.error('API Error:', error);
      }

      // タイムアウトエラーの処理
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          error: {
            code: 'TIMEOUT',
            message: 'Request timeout',
          },
        };
      }

      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message,
        },
      };
    }
  }

  async post<T>(endpoint: string, body: unknown): Promise<ApiResponse<T>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒タイムアウト

    try {
      const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: await this.getHeaders(),
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const message = errorBody.message || errorBody.error || response.statusText;
        return {
          success: false,
          error: {
            code: `HTTP_${response.status}`,
            message: message,
          },
        };
      }

      // 空レスポンスの処理
      const data =
        response.status === 204 || response.headers.get('content-length') === '0'
          ? undefined
          : await response.json();
      return { success: true, data } as ApiResponse<T>;
    } catch (error) {
      clearTimeout(timeoutId);
      const message = error instanceof Error ? error.message : String(error);
      if (process.env.NODE_ENV === 'development') {
        console.error('API Error:', error);
      }

      // タイムアウトエラーの処理
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          error: {
            code: 'TIMEOUT',
            message: 'Request timeout',
          },
        };
      }

      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message,
        },
      };
    }
  }

  async postFormData<T>(endpoint: string, formData: FormData): Promise<ApiResponse<T>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒タイムアウト

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
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const message = errorBody.message || errorBody.error || response.statusText;
        return {
          success: false,
          error: {
            code: `HTTP_${response.status}`,
            message: message,
          },
        };
      }

      // 空レスポンスの処理
      const data =
        response.status === 204 || response.headers.get('content-length') === '0'
          ? undefined
          : await response.json();
      return { success: true, data } as ApiResponse<T>;
    } catch (error) {
      clearTimeout(timeoutId);
      const message = error instanceof Error ? error.message : String(error);
      if (process.env.NODE_ENV === 'development') {
        console.error('API Error:', error);
      }

      // タイムアウトエラーの処理
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          error: {
            code: 'TIMEOUT',
            message: 'Request timeout',
          },
        };
      }

      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message,
        },
      };
    }
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒タイムアウト

    try {
      const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
        method: 'DELETE',
        headers: await this.getHeaders(),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const message = errorBody.message || errorBody.error || response.statusText;
        return {
          success: false,
          error: {
            code: `HTTP_${response.status}`,
            message: message,
          },
        };
      }

      // 空レスポンスの処理
      const data =
        response.status === 204 || response.headers.get('content-length') === '0'
          ? undefined
          : await response.json();
      return { success: true, data } as ApiResponse<T>;
    } catch (error) {
      clearTimeout(timeoutId);
      const message = error instanceof Error ? error.message : String(error);
      if (process.env.NODE_ENV === 'development') {
        console.error('API Error:', error);
      }

      // タイムアウトエラーの処理
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          error: {
            code: 'TIMEOUT',
            message: 'Request timeout',
          },
        };
      }

      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message,
        },
      };
    }
  }
}
