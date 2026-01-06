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

  private async getHeaders(requireAuth: boolean = false): Promise<HeadersInit> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.config.getAuthToken) {
      const token = await this.config.getAuthToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else if (requireAuth) {
        throw new Error('Authentication required but no token available');
      }
    } else if (requireAuth) {
      throw new Error('Authentication required but getAuthToken not configured');
    }

    return headers;
  }

  /**
   * 共通のHTTPリクエスト処理
   * タイムアウト、エラーハンドリング、空レスポンス処理を統一
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit
  ): Promise<ApiResponse<T>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒タイムアウト

    try {
      const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
        ...options,
        signal: controller.signal,
      });

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
      const message = error instanceof Error ? error.message : String(error);
      if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
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
    } finally {
      clearTimeout(timeoutId); // 必ずタイマーをクリア
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'GET',
      headers: await this.getHeaders(),
    });
  }

  async post<T>(endpoint: string, body: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify(body),
    });
  }

  async postFormData<T>(endpoint: string, formData: FormData): Promise<ApiResponse<T>> {
    // FormDataの場合はContent-Typeを指定しない（ブラウザが自動設定）
    const headers: HeadersInit = {};
    if (this.config.getAuthToken) {
      const token = await this.config.getAuthToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return this.request<T>(endpoint, {
      method: 'POST',
      headers,
      body: formData,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
      headers: await this.getHeaders(),
    });
  }
}
