import { ApiClient } from '../client';
import type { TranscriptionResponse, ApiResponse } from '@meeting-transcriber/shared';

export const transcriptionApi = {
  async transcribeChunk(
    meetingId: string,
    audioBlob: Blob,
    timestamp: number
  ): Promise<ApiResponse<TranscriptionResponse>> {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'chunk.webm');
    formData.append('meetingId', meetingId);
    formData.append('timestamp', timestamp.toString());

    return ApiClient.getInstance().postFormData<TranscriptionResponse>(
      '/transcription',
      formData,
      true
    );
  },
};
