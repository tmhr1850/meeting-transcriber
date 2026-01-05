export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface TranscriptionRequest {
  meetingId: string;
  audioChunk: Blob;
  timestamp: number;
}

export interface TranscriptionResponse {
  text: string;
  timestamp: number;
  segmentId: string;
  language?: string;
  confidence?: number;
}
