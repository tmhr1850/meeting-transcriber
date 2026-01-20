/**
 * Extension API Client
 * Web App APIとの通信を管理するクライアント
 */

import { ApiClient } from '@meeting-transcriber/api-client';
import type { MeetingCreateRequest, TranscriptionResponse } from '@meeting-transcriber/shared';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * 認証トークンを取得
 */
async function getAuthToken(): Promise<string | null> {
  try {
    const result = await chrome.storage.session.get('authToken');
    return result.authToken || null;
  } catch (error) {
    console.error('[API] Failed to get auth token:', error);
    return null;
  }
}

/**
 * Extension API クライアント
 */
class ExtensionAPI {
  private apiClient: ApiClient;

  constructor() {
    this.apiClient = new ApiClient(API_BASE_URL);
  }

  /**
   * 認証ヘッダーを取得
   */
  private async getHeaders(): Promise<HeadersInit> {
    const token = await getAuthToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  /**
   * 会議セッション開始
   * @param data - 会議情報
   * @returns 会議ID
   */
  async startMeeting(data: MeetingCreateRequest): Promise<{ meetingId: string }> {
    try {
      console.log('[API] Starting meeting:', data);
      const response = await fetch(`${API_BASE_URL}/api/meetings`, {
        method: 'POST',
        headers: await this.getHeaders(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('[API] Meeting started:', result);
      return result;
    } catch (error) {
      console.error('[API] Failed to start meeting:', error);
      throw error;
    }
  }

  /**
   * 音声チャンク送信（文字起こしリクエスト）
   * @param data - 音声チャンクデータ
   * @returns 文字起こし結果
   */
  async sendAudioChunk(data: {
    meetingId: string;
    chunk: ArrayBuffer;
    timestamp: number;
    chunkIndex: number;
  }): Promise<TranscriptionResponse> {
    try {
      const formData = new FormData();
      formData.append('meetingId', data.meetingId);
      formData.append('timestamp', data.timestamp.toString());
      formData.append('chunkIndex', data.chunkIndex.toString());
      formData.append('audio', new Blob([data.chunk], { type: 'audio/webm' }));

      const token = await getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/transcribe`, {
        method: 'POST',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log(`[API] Transcription result for chunk ${data.chunkIndex}:`, result);
      return result;
    } catch (error) {
      console.error(`[API] Failed to send audio chunk ${data.chunkIndex}:`, error);
      throw error;
    }
  }

  /**
   * 会議終了
   * @param meetingId - 会議ID
   */
  async endMeeting(meetingId: string): Promise<void> {
    try {
      console.log('[API] Ending meeting:', meetingId);
      const response = await fetch(`${API_BASE_URL}/api/meetings/${meetingId}/end`, {
        method: 'POST',
        headers: await this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      console.log('[API] Meeting ended:', meetingId);
    } catch (error) {
      console.error('[API] Failed to end meeting:', error);
      throw error;
    }
  }

  /**
   * AI要約リクエスト
   * @param meetingId - 会議ID
   * @returns 要約結果
   */
  async requestSummary(meetingId: string): Promise<{
    summary: string;
    actionItems: string[];
    decisions: string[];
  }> {
    try {
      console.log('[API] Requesting summary for meeting:', meetingId);
      const response = await fetch(`${API_BASE_URL}/api/meetings/${meetingId}/summary`, {
        method: 'POST',
        headers: await this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('[API] Summary result:', result);
      return result;
    } catch (error) {
      console.error('[API] Failed to request summary:', error);
      throw error;
    }
  }
}

export const api = new ExtensionAPI();
