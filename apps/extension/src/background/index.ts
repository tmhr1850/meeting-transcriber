import { ApiClient } from '@meeting-transcriber/api-client';

// 状態管理
let isRecording = false;
let currentMeetingId: string | null = null;

// API Client初期化
ApiClient.initialize({
  baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  getAuthToken: async () => {
    const result = await chrome.storage.local.get('authToken');
    return result.authToken || null;
  },
});

// メッセージハンドラ
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender).then(sendResponse);
  return true; // 非同期レスポンスのため
});

async function handleMessage(message: any, sender: chrome.runtime.MessageSender) {
  switch (message.type) {
    case 'START_RECORDING':
      return await startRecording(sender.tab?.id, message.meetingInfo);

    case 'STOP_RECORDING':
      return await stopRecording();

    case 'GET_STATUS':
      return { isRecording, currentMeetingId };

    case 'TRANSCRIPT_RECEIVED':
      // Content Scriptにブロードキャスト
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, {
            type: 'TRANSCRIPT_UPDATE',
            data: message.data,
          });
        }
      });
      return { success: true };

    default:
      return { error: 'Unknown message type' };
  }
}

async function startRecording(tabId: number | undefined, meetingInfo: any) {
  if (!tabId || isRecording) {
    return { success: false, error: 'Already recording or no tab' };
  }

  try {
    // Offscreen Document作成
    const contexts = await chrome.runtime.getContexts({});
    const offscreenExists = contexts.some(c => c.contextType === 'OFFSCREEN_DOCUMENT');

    if (!offscreenExists) {
      await chrome.offscreen.createDocument({
        url: 'src/offscreen/index.html',
        reasons: [chrome.offscreen.Reason.USER_MEDIA],
        justification: 'Recording tab audio for transcription',
      });
    }

    // tabCapture用のstreamIdを取得
    const streamId = await new Promise<string>((resolve, reject) => {
      chrome.tabCapture.getMediaStreamId(
        { targetTabId: tabId },
        (id) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(id);
          }
        }
      );
    });

    // Offscreenに録音開始を指示
    chrome.runtime.sendMessage({
      type: 'OFFSCREEN_START_RECORDING',
      target: 'offscreen',
      data: { streamId, meetingInfo },
    });

    isRecording = true;

    // アイコン変更
    chrome.action.setIcon({ path: 'icons/icon-recording.png' });

    return { success: true };
  } catch (error) {
    console.error('Start recording error:', error);
    return { success: false, error: String(error) };
  }
}

async function stopRecording() {
  chrome.runtime.sendMessage({
    type: 'OFFSCREEN_STOP_RECORDING',
    target: 'offscreen',
  });

  isRecording = false;
  currentMeetingId = null;

  chrome.action.setIcon({ path: 'icons/icon-128.png' });

  return { success: true };
}

// Side Panel設定
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
