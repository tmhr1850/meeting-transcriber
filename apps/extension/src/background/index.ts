import { ApiClient } from '@meeting-transcriber/api-client';
import type {
  ExtensionMessage,
  ExtensionMessageResponse,
  RecordingState,
  MeetingInfo,
  TranscriptUpdateData,
} from '@meeting-transcriber/shared';
import {
  sendMessageWithTimeout,
  createMessage,
  logger,
  getRequiredEnv,
  EXTENSION_CONSTANTS,
} from '@meeting-transcriber/shared';

/**
 * 録音状態管理のキー
 */
const RECORDING_STATE_KEY = 'recordingState';

/**
 * 初期状態
 */
const INITIAL_STATE: RecordingState = {
  isRecording: false,
  currentMeetingId: null,
  currentTabId: null,
  startTime: null,
};

/**
 * 状態を取得（chrome.storage.sessionから）
 */
async function getState(): Promise<RecordingState> {
  const result = await chrome.storage.session.get(RECORDING_STATE_KEY);
  return result[RECORDING_STATE_KEY] || INITIAL_STATE;
}

/**
 * 状態を保存（chrome.storage.sessionに）
 */
async function setState(state: RecordingState): Promise<void> {
  await chrome.storage.session.set({ [RECORDING_STATE_KEY]: state });
}

// API Client初期化
ApiClient.initialize({
  baseUrl: getRequiredEnv('VITE_API_URL', 'http://localhost:3000/api'),
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
      logger.error('Message handling error:', error);
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
      // 必須フィールドの検証
      if (!('meetingInfo' in message)) {
        return { success: false, error: 'meetingInfo is required' };
      }
      if (!message.meetingInfo || typeof message.meetingInfo !== 'object') {
        return { success: false, error: 'Invalid meetingInfo' };
      }
      return await startRecording(sender.tab?.id, message.meetingInfo);

    case 'STOP_RECORDING':
      // STOP_RECORDINGは追加フィールド不要
      return await stopRecording();

    case 'GET_STATUS':
      // GET_STATUSは追加フィールド不要
      return await getState();

    case 'TRANSCRIPT_RECEIVED':
      // 必須フィールドの検証
      if (!('data' in message)) {
        return { success: false, error: 'data is required' };
      }
      if (!message.data || typeof message.data !== 'object') {
        return { success: false, error: 'Invalid data' };
      }
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
  const state = await getState();

  // 録音中のタブにのみ送信
  if (state.currentTabId) {
    try {
      await chrome.tabs.sendMessage(
        state.currentTabId,
        createMessage('TRANSCRIPT_UPDATE', { data })
      );
      return { success: true };
    } catch (error) {
      logger.error('Failed to send transcript to content script:', error);
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

  const currentState = await getState();

  if (currentState.isRecording) {
    return { success: false, error: 'Already recording' };
  }

  try {
    // Offscreen Document作成（二重起動防止）
    const contexts = await chrome.runtime.getContexts({});
    const offscreenExists = contexts.some((c) => c.contextType === 'OFFSCREEN_DOCUMENT');

    if (offscreenExists && currentState.isRecording) {
      // Offscreen Documentが存在し、かつ録音中の場合はエラー
      return { success: false, error: 'Offscreen Document is already recording' };
    }

    if (!offscreenExists) {
      await chrome.offscreen.createDocument({
        url: 'src/offscreen/index.html',
        reasons: [chrome.offscreen.Reason.USER_MEDIA],
        justification: 'Recording tab audio for transcription',
      });
      // Offscreen Documentの初期化待機
      await new Promise((resolve) =>
        setTimeout(resolve, EXTENSION_CONSTANTS.OFFSCREEN_CREATION_DELAY)
      );
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

    // Offscreenに録音開始を指示し、成功を確認
    const response = await sendMessageWithTimeout<{ success: boolean; error?: string }>(
      createMessage('OFFSCREEN_START_RECORDING', {
        target: 'offscreen',
        data: { streamId, meetingInfo },
      }),
      EXTENSION_CONSTANTS.MESSAGE_TIMEOUT
    );

    if (!response?.success) {
      throw new Error(
        `Failed to start recording in offscreen document: ${response?.error || 'Unknown error'}`
      );
    }

    // 録音開始成功後に状態を更新（chrome.storage.sessionに保存）
    await setState({
      isRecording: true,
      currentMeetingId: meetingInfo.meetingId,
      currentTabId: tabId,
      startTime: Date.now(),
    });

    // アイコン変更（エラーがあってもスキップ）
    try {
      await chrome.action.setIcon({ path: 'icons/icon-recording.png' });
    } catch (iconError) {
      logger.warn('Failed to set recording icon, continuing:', iconError);
    }

    // Side Panelを開く
    try {
      await chrome.sidePanel.open({ tabId });
    } catch (panelError) {
      logger.warn('Failed to open side panel, continuing:', panelError);
    }

    return { success: true };
  } catch (error) {
    // クリーンアップ: Offscreen Documentを削除
    try {
      const contexts = await chrome.runtime.getContexts({});
      const offscreenExists = contexts.some((c) => c.contextType === 'OFFSCREEN_DOCUMENT');
      if (offscreenExists) {
        await chrome.offscreen.closeDocument();
      }
    } catch (cleanupError) {
      logger.warn('Failed to cleanup offscreen document:', cleanupError);
    }

    logger.error('Start recording error:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * 録音を停止
 */
async function stopRecording(): Promise<{ success: boolean }> {
  const currentState = await getState();

  if (!currentState.isRecording) {
    return { success: true }; // 既に停止している場合は成功として扱う
  }

  try {
    // Offscreenに録音停止を指示
    chrome.runtime.sendMessage(
      createMessage('OFFSCREEN_STOP_RECORDING', { target: 'offscreen' })
    );

    // Offscreen Documentを削除（エラーがあってもスキップ）
    try {
      await chrome.offscreen.closeDocument();
    } catch (closeError) {
      logger.warn('Failed to close offscreen document, continuing:', closeError);
    }

    // 状態をリセット（chrome.storage.sessionに保存）
    await setState(INITIAL_STATE);

    // アイコンを元に戻す（エラーがあってもスキップ）
    try {
      await chrome.action.setIcon({ path: 'icons/icon-128.png' });
    } catch (iconError) {
      logger.warn('Failed to reset icon, continuing:', iconError);
    }

    return { success: true };
  } catch (error) {
    logger.error('Stop recording error:', error);
    // エラーがあっても状態はリセットする
    await setState(INITIAL_STATE);
    return { success: true };
  }
}

// Side Panel設定
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
