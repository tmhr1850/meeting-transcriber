import { ApiClient } from '../client';
import type { Meeting, ApiResponse } from '@meeting-transcriber/shared';

export interface CreateMeetingInput {
  title: string;
  platform: Meeting['platform'];
}

export const meetingsApi = {
  async list(): Promise<ApiResponse<Meeting[]>> {
    return ApiClient.getInstance().get<Meeting[]>('/meetings', true);
  },

  async get(id: string): Promise<ApiResponse<Meeting>> {
    return ApiClient.getInstance().get<Meeting>(`/meetings/${id}`, true);
  },

  async create(input: CreateMeetingInput): Promise<ApiResponse<Meeting>> {
    return ApiClient.getInstance().post<Meeting>('/meetings', input, true);
  },

  async finalize(id: string): Promise<ApiResponse<Meeting>> {
    return ApiClient.getInstance().post<Meeting>(`/meetings/${id}/finalize`, {}, true);
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    return ApiClient.getInstance().delete<void>(`/meetings/${id}`, true);
  },
};
