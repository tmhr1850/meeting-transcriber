import type { ApiResponse } from '@meeting-transcriber/shared';

export interface ClientConfig {
  baseUrl: string;
  getAuthToken?: () => Promise<string | null>;
  /** リクエストタイムアウト（ミリ秒）。デフォルト: 30000ms (30秒) */
  timeout?: number;
}

export class ApiClient {
  private static instance: ApiClient;
  private config: ClientConfig;

  private constructor(config: ClientConfig) {
    this.config = config;
  }

  static initialize(config: ClientConfig): void {
    if (ApiClient.instance) {
      throw new Error('ApiClient already initialized. Call initialize() only once.');
    }
    ApiClient.instance = new ApiClient(config);
  }

  static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      throw new Error('ApiClient not initialized. Call ApiClient.initialize() first.');
    }
    return ApiClient.instance;
  }

  /**
   * HTTPヘッダーを取得
   * @param requireAuth 認証が必須かどうか
   * @param includeContentType Content-Typeヘッダーを含めるか（FormDataの場合はfalse）
   */
  private async getHeaders(
    requireAuth: boolean = false,
    includeContentType: boolean = true
  ): Promise<HeadersInit> {
    const headers: HeadersInit = {};

    // Content-Typeヘッダー（FormData以外の場合）
    if (includeContentType) {
      headers['Content-Type'] = 'application/json';
    }

    // 認証ヘッダー
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
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    try {
      const timeout = this.config.timeout ?? 30000; // デフォルト: 30秒
      timeoutId = setTimeout(() => controller.abort(), timeout);

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
      // timeoutIdが設定されている場合のみクリア
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
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
    return this.request<T>(endpoint, {
      method: 'POST',
      headers: await this.getHeaders(false, false),
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
