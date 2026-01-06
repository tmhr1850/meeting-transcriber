/**
 * Google Meet用 Content Script
 * 会議ページで録音ボタンを表示し、録音開始/停止を制御する
 */

console.log('Meeting Transcriber: Google Meet Content Script loaded');

// Background Scriptからのメッセージを受信
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'TRANSCRIPT_UPDATE') {
    console.log('Transcript update received:', message.data);
    // TODO: UIに文字起こし結果を表示
  }
  sendResponse({ success: true });
});

// 会議情報を取得
function getMeetingInfo() {
  const url = new URL(window.location.href);
  const meetingId = url.pathname.split('/').pop() || 'unknown';

  return {
    platform: 'google-meet',
    meetingId,
    title: document.title,
    url: window.location.href,
  };
}

// 録音開始
async function startRecording() {
  const meetingInfo = getMeetingInfo();

  const response = await chrome.runtime.sendMessage({
    type: 'START_RECORDING',
    meetingInfo,
  });

  if (response.success) {
    console.log('Recording started');
  } else {
    console.error('Failed to start recording:', response.error);
  }
}

// 録音停止
async function stopRecording() {
  const response = await chrome.runtime.sendMessage({
    type: 'STOP_RECORDING',
  });

  if (response.success) {
    console.log('Recording stopped');
  } else {
    console.error('Failed to stop recording:', response.error);
  }
}

// TODO: 録音ボタンUIの挿入
// TODO: 文字起こし結果の表示UI
