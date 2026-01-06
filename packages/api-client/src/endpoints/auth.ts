import { ApiClient } from '../client';
import type { User, ApiResponse } from '@meeting-transcriber/shared';

export const authApi = {
  async getCurrentUser(): Promise<ApiResponse<User>> {
    return ApiClient.getInstance().get<User>('/auth/me', true);
  },

  async validateToken(): Promise<ApiResponse<{ valid: boolean }>> {
    return ApiClient.getInstance().get<{ valid: boolean }>('/auth/validate', true);
  },
};
