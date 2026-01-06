/**
 * Google Meet用 Content Script
 * 会議ページで録音ボタンを表示し、録音開始/停止を制御する
 */

import type { ExtensionMessage, MeetingInfo } from '@meeting-transcriber/shared';

if (import.meta.env.DEV) {
  console.log('Meeting Transcriber: Google Meet Content Script loaded');
}

// Background Scriptからのメッセージを受信
chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
  if (message.type === 'TRANSCRIPT_UPDATE') {
    if (import.meta.env.DEV) {
      console.log('Transcript update received:', message.data);
    }
    // TODO: UIに文字起こし結果を表示（Issue #14で実装予定）
  }
  sendResponse({ success: true });
  return true;
});

/**
 * 会議情報を取得
 */
function getMeetingInfo(): MeetingInfo {
  const url = new URL(window.location.href);
  const meetingId = url.pathname.split('/').pop() || 'unknown';

  return {
    platform: 'google-meet',
    meetingId,
    title: document.title,
    url: window.location.href,
  };
}

/**
 * 録音を開始
 */
async function startRecording(): Promise<void> {
  try {
    const meetingInfo = getMeetingInfo();

    const response = await chrome.runtime.sendMessage({
      type: 'START_RECORDING',
      meetingInfo,
    } as ExtensionMessage);

    if (response?.success) {
      if (import.meta.env.DEV) {
        console.log('Recording started');
      }
    } else {
      if (import.meta.env.DEV) {
        console.error('Failed to start recording:', response?.error);
      }
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Error starting recording:', error);
    }
  }
}

/**
 * 録音を停止
 */
async function stopRecording(): Promise<void> {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'STOP_RECORDING',
    } as ExtensionMessage);

    if (response?.success) {
      if (import.meta.env.DEV) {
        console.log('Recording stopped');
      }
    } else {
      if (import.meta.env.DEV) {
        console.error('Failed to stop recording:', response?.error);
      }
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Error stopping recording:', error);
    }
  }
}

// 関数を公開（開発用のみ）
if (import.meta.env.DEV) {
  // @ts-ignore
  window.__meetingTranscriber = {
    startRecording,
    stopRecording,
    getMeetingInfo,
  };
}

// TODO: 録音ボタンUIの挿入
// TODO: 文字起こし結果の表示UI
