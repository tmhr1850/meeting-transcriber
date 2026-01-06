import { ApiClient } from '@meeting-transcriber/api-client';
import type {
  ExtensionMessage,
  ExtensionMessageResponse,
  RecordingState,
  MeetingInfo,
  TranscriptUpdateData,
} from '@meeting-transcriber/shared';

// 録音状態管理
let state: RecordingState = {
  isRecording: false,
  currentMeetingId: null,
  currentTabId: null,
  startTime: null,
};

// API Client初期化
ApiClient.initialize({
  baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  getAuthToken: async () => {
    const result = await chrome.storage.local.get('authToken');
    return result.authToken || null;
  },
});

// メッセージハンドラ
chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
  handleMessage(message, sender)
    .then(sendResponse)
    .catch((error) => {
      console.error('Message handling error:', error);
      sendResponse({ success: false, error: String(error) });
    });
  return true; // 非同期レスポンスのため
});

async function handleMessage(
  message: ExtensionMessage,
  sender: chrome.runtime.MessageSender
): Promise<ExtensionMessageResponse> {
  switch (message.type) {
    case 'START_RECORDING':
      return await startRecording(sender.tab?.id, message.meetingInfo);

    case 'STOP_RECORDING':
      return await stopRecording();

    case 'GET_STATUS':
      return state;

    case 'TRANSCRIPT_RECEIVED':
      return await handleTranscriptReceived(message.data);

    default:
      return { success: false, error: 'Unknown message type' };
  }
}

/**
 * 文字起こし結果を受信して、録音中のタブに送信
 */
async function handleTranscriptReceived(
  data: TranscriptUpdateData
): Promise<{ success: boolean }> {
  // 録音中のタブにのみ送信
  if (state.currentTabId) {
    try {
      await chrome.tabs.sendMessage(state.currentTabId, {
        type: 'TRANSCRIPT_UPDATE',
        data,
      } as ExtensionMessage);
      return { success: true };
    } catch (error) {
      console.error('Failed to send transcript to content script:', error);
      return { success: false };
    }
  }
  return { success: true };
}

/**
 * 録音を開始
 */
async function startRecording(
  tabId: number | undefined,
  meetingInfo: MeetingInfo
): Promise<{ success: boolean; error?: string }> {
  if (!tabId) {
    return { success: false, error: 'No tab ID provided' };
  }

  if (state.isRecording) {
    return { success: false, error: 'Already recording' };
  }

  try {
    // Offscreen Document作成
    const contexts = await chrome.runtime.getContexts({});
    const offscreenExists = contexts.some((c) => c.contextType === 'OFFSCREEN_DOCUMENT');

    if (!offscreenExists) {
      await chrome.offscreen.createDocument({
        url: 'src/offscreen/index.html',
        reasons: [chrome.offscreen.Reason.USER_MEDIA],
        justification: 'Recording tab audio for transcription',
      });
    }

    // tabCapture用のstreamIdを取得
    const streamId = await new Promise<string>((resolve, reject) => {
      chrome.tabCapture.getMediaStreamId({ targetTabId: tabId }, (id) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(id);
        }
      });
    });

    // Offscreenに録音開始を指示
    chrome.runtime.sendMessage({
      type: 'OFFSCREEN_START_RECORDING',
      target: 'offscreen',
      data: { streamId, meetingInfo },
    } as ExtensionMessage);

    // 状態を更新
    state = {
      isRecording: true,
      currentMeetingId: meetingInfo.meetingId,
      currentTabId: tabId,
      startTime: Date.now(),
    };

    // アイコン変更（エラーがあってもスキップ）
    try {
      await chrome.action.setIcon({ path: 'icons/icon-recording.png' });
    } catch (iconError) {
      console.warn('Failed to set recording icon, continuing:', iconError);
    }

    // Side Panelを開く
    try {
      await chrome.sidePanel.open({ tabId });
    } catch (panelError) {
      console.warn('Failed to open side panel, continuing:', panelError);
    }

    return { success: true };
  } catch (error) {
    console.error('Start recording error:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * 録音を停止
 */
async function stopRecording(): Promise<{ success: boolean }> {
  if (!state.isRecording) {
    return { success: true }; // 既に停止している場合は成功として扱う
  }

  try {
    // Offscreenに録音停止を指示
    chrome.runtime.sendMessage({
      type: 'OFFSCREEN_STOP_RECORDING',
      target: 'offscreen',
    } as ExtensionMessage);

    // Offscreen Documentを削除（エラーがあってもスキップ）
    try {
      await chrome.offscreen.closeDocument();
    } catch (closeError) {
      console.warn('Failed to close offscreen document, continuing:', closeError);
    }

    // 状態をリセット
    state = {
      isRecording: false,
      currentMeetingId: null,
      currentTabId: null,
      startTime: null,
    };

    // アイコンを元に戻す（エラーがあってもスキップ）
    try {
      await chrome.action.setIcon({ path: 'icons/icon-128.png' });
    } catch (iconError) {
      console.warn('Failed to reset icon, continuing:', iconError);
    }

    return { success: true };
  } catch (error) {
    console.error('Stop recording error:', error);
    // エラーがあっても状態はリセットする
    state = {
      isRecording: false,
      currentMeetingId: null,
      currentTabId: null,
      startTime: null,
    };
    return { success: true };
  }
}

// Side Panel設定
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
