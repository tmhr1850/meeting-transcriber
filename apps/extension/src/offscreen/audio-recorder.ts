/**
 * Offscreen Document - Audio Recorder
 * tabCaptureで取得した音声ストリームを録音し、チャンク化してAPIに送信する
 */

import { AudioChunker } from '@meeting-transcriber/audio-processor';
import { ApiClient } from '@meeting-transcriber/api-client';
import type { ExtensionMessage, MeetingInfo } from '@meeting-transcriber/shared';
// Chrome拡張のtabCapture用型定義は chrome-media.d.ts で定義済み

let audioChunker: AudioChunker | null = null;
let mediaStream: MediaStream | null = null;
let currentMeetingInfo: MeetingInfo | null = null;

// API Client初期化
ApiClient.initialize({
  baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  getAuthToken: async () => {
    const result = await chrome.storage.local.get('authToken');
    return result.authToken || null;
  },
});

// Background Scriptからのメッセージを受信
chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
  // targetフィールドを持つメッセージのみを処理
  if (!('target' in message) || message.target !== 'offscreen') {
    return;
  }

  switch (message.type) {
    case 'OFFSCREEN_START_RECORDING':
      startRecording(message.data.streamId, message.data.meetingInfo)
        .then(() => sendResponse({ success: true }))
        .catch((error) => sendResponse({ success: false, error: String(error) }));
      return true;

    case 'OFFSCREEN_STOP_RECORDING':
      stopRecording()
        .then(() => sendResponse({ success: true }))
        .catch((error) => sendResponse({ success: false, error: String(error) }));
      return true;
  }
});

/**
 * 録音を開始
 */
async function startRecording(streamId: string, meetingInfo: MeetingInfo): Promise<void> {
  // リソース重複チェック
  if (mediaStream || audioChunker) {
    throw new Error('録音は既に進行中です');
  }

  try {
    // tabCaptureのstreamIdからMediaStreamを取得
    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: 'tab',
          chromeMediaSourceId: streamId,
        },
      },
    });

    currentMeetingInfo = meetingInfo;

    // AudioChunkerを初期化
    audioChunker = new AudioChunker({
      onChunk: async (audioBlob: Blob, timestamp: number) => {
        await sendAudioChunk(audioBlob, timestamp);
      },
      onError: (error: Error) => {
        console.error('Audio chunking error:', error);
      },
    });

    audioChunker.start(mediaStream);
    if (import.meta.env.DEV) {
      console.log('Recording started for meeting:', meetingInfo);
    }
  } catch (error) {
    // エラー時はリソースをクリーンアップ
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
      mediaStream = null;
    }
    audioChunker = null;
    currentMeetingInfo = null;
    if (import.meta.env.DEV) {
      console.error('Failed to start recording:', error);
    }
    throw error;
  }
}

/**
 * 音声チャンクをAPIに送信
 */
async function sendAudioChunk(audioBlob: Blob, timestamp: number): Promise<void> {
  if (!currentMeetingInfo) {
    if (import.meta.env.DEV) {
      console.error('No meeting info available');
    }
    return;
  }

  try {
    if (import.meta.env.DEV) {
      console.log('Sending audio chunk:', audioBlob.size, 'bytes, timestamp:', timestamp);
    }

    // FormDataを作成
    const formData = new FormData();
    formData.append('audio', audioBlob, 'chunk.webm');
    formData.append('meetingId', currentMeetingInfo.meetingId);
    formData.append('timestamp', timestamp.toString());

    // APIに送信（Issue #17で完全実装予定）
    const client = ApiClient.getInstance();
    const response = await client.postFormData('/transcription/upload-chunk', formData, true);

    if (response.success && response.data) {
      // Background Scriptに文字起こし結果を送信
      chrome.runtime.sendMessage({
        type: 'TRANSCRIPT_RECEIVED',
        data: response.data,
      } as ExtensionMessage);
    } else {
      if (import.meta.env.DEV) {
        console.error('Failed to upload chunk:', response.error);
      }
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Error sending audio chunk:', error);
    }
    // エラーがあってもチャンク送信は継続
  }
}

/**
 * 録音を停止
 */
async function stopRecording(): Promise<void> {
  try {
    if (audioChunker) {
      audioChunker.stop();
      audioChunker = null;
    }

    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
      mediaStream = null;
    }

    currentMeetingInfo = null;

    if (import.meta.env.DEV) {
      console.log('Recording stopped');
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Failed to stop recording:', error);
    }
    // エラーがあってもリソースはクリーンアップする
    audioChunker = null;
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
      mediaStream = null;
    }
    currentMeetingInfo = null;
    throw error;
  }
}

if (import.meta.env.DEV) {
  console.log('Offscreen Audio Recorder initialized');
}
