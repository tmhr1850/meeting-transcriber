/**
 * Offscreen Document - Audio Recorder
 * tabCaptureで取得した音声ストリームを録音し、チャンク化してAPIに送信する
 */

import { AudioChunker } from '@meeting-transcriber/audio-processor';

let audioChunker: AudioChunker | null = null;
let mediaStream: MediaStream | null = null;

// Background Scriptからのメッセージを受信
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.target !== 'offscreen') {
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

async function startRecording(streamId: string, meetingInfo: any) {
  try {
    // tabCaptureのstreamIdからMediaStreamを取得
    // Chrome拡張のtabCapture用の特殊なconstraintsのため、型定義と異なる
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: 'tab',
          chromeMediaSourceId: streamId,
        },
      },
    });

    // AudioChunkerを初期化
    audioChunker = new AudioChunker({
      onChunk: async (audioBlob: Blob) => {
        // チャンクをAPIに送信
        console.log('Audio chunk ready:', audioBlob.size, 'bytes');
        // TODO: API送信処理を実装（Issue #17で実装予定）
      },
      onError: (error: Error) => {
        console.error('Audio chunking error:', error);
      },
    });

    await audioChunker.start(mediaStream);
    console.log('Recording started for meeting:', meetingInfo);
  } catch (error) {
    console.error('Failed to start recording:', error);
    throw error;
  }
}

async function stopRecording() {
  try {
    if (audioChunker) {
      await audioChunker.stop();
      audioChunker = null;
    }

    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
      mediaStream = null;
    }

    console.log('Recording stopped');
  } catch (error) {
    console.error('Failed to stop recording:', error);
    throw error;
  }
}

console.log('Offscreen Audio Recorder initialized');
