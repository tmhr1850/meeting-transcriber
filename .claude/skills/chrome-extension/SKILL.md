---
name: chrome-extension
description: Chrome拡張機能（Manifest V3）の開発ガイド。tabCapture、Content Scripts、Service Worker、Offscreen Documentの実装時に使用。
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
---

# Chrome Extension Skill (Manifest V3)

会議音声キャプチャ用Chrome拡張機能の開発ガイド。

## プロジェクト構成

```
apps/extension/
├── src/
│   ├── manifest.ts          # Manifest V3定義
│   ├── background/
│   │   └── service-worker.ts # Background Service Worker
│   ├── content/
│   │   ├── index.ts         # Content Script
│   │   └── meet-detector.ts # Google Meet検出
│   ├── offscreen/
│   │   └── recorder.ts      # Offscreen音声録音
│   ├── sidepanel/
│   │   └── App.tsx          # Side Panel UI
│   └── popup/
│       └── App.tsx          # Popup UI
├── vite.config.ts
└── package.json
```

## Manifest V3 設定

```typescript
// manifest.ts
import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: 'Meeting Transcriber',
  version: '1.0.0',
  permissions: [
    'tabCapture',
    'offscreen',
    'storage',
    'sidePanel',
    'activeTab',
  ],
  host_permissions: [
    'https://meet.google.com/*',
    'https://*.zoom.us/*',
    'https://teams.microsoft.com/*',
  ],
  background: {
    service_worker: 'src/background/service-worker.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: [
        'https://meet.google.com/*',
        'https://*.zoom.us/*',
      ],
      js: ['src/content/index.ts'],
    },
  ],
  side_panel: {
    default_path: 'src/sidepanel/index.html',
  },
  action: {
    default_popup: 'src/popup/index.html',
    default_icon: {
      '16': 'icons/icon16.png',
      '48': 'icons/icon48.png',
      '128': 'icons/icon128.png',
    },
  },
});
```

## tabCapture による音声キャプチャ

### Service Worker

```typescript
// background/service-worker.ts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'START_CAPTURE') {
    startCapture(sender.tab!.id!);
    sendResponse({ success: true });
  }
  return true;
});

async function startCapture(tabId: number) {
  // Offscreen documentを作成
  await chrome.offscreen.createDocument({
    url: 'src/offscreen/index.html',
    reasons: [chrome.offscreen.Reason.USER_MEDIA],
    justification: 'Recording tab audio for transcription',
  });

  // tabCaptureでストリームID取得
  const streamId = await chrome.tabCapture.getMediaStreamId({
    targetTabId: tabId,
  });

  // Offscreenに送信
  chrome.runtime.sendMessage({
    type: 'START_RECORDING',
    streamId,
    tabId,
  });
}
```

### Offscreen Document

```typescript
// offscreen/recorder.ts
let mediaRecorder: MediaRecorder | null = null;

chrome.runtime.onMessage.addListener(async (message) => {
  if (message.type === 'START_RECORDING') {
    await startRecording(message.streamId);
  }
  if (message.type === 'STOP_RECORDING') {
    stopRecording();
  }
});

async function startRecording(streamId: string) {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      mandatory: {
        chromeMediaSource: 'tab',
        chromeMediaSourceId: streamId,
      },
    } as any,
  });

  mediaRecorder = new MediaRecorder(stream, {
    mimeType: 'audio/webm;codecs=opus',
  });

  mediaRecorder.ondataavailable = async (e) => {
    if (e.data.size > 1024) { // 無音スキップ
      const arrayBuffer = await e.data.arrayBuffer();
      chrome.runtime.sendMessage({
        type: 'AUDIO_CHUNK',
        data: Array.from(new Uint8Array(arrayBuffer)),
      });
    }
  };

  // 5秒ごとにチャンク生成
  mediaRecorder.start(5000);
}

function stopRecording() {
  mediaRecorder?.stop();
  mediaRecorder = null;
}
```

## Content Script（会議検出）

```typescript
// content/meet-detector.ts
class MeetingDetector {
  private isInMeeting = false;

  constructor() {
    this.observeMeetingState();
  }

  private observeMeetingState() {
    // Google Meet: 参加ボタンの検出
    const observer = new MutationObserver(() => {
      const inMeeting = this.detectGoogleMeet();
      if (inMeeting !== this.isInMeeting) {
        this.isInMeeting = inMeeting;
        this.notifyStateChange(inMeeting);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  private detectGoogleMeet(): boolean {
    // 会議中の特徴的な要素を検出
    return !!document.querySelector('[data-call-state="connected"]');
  }

  private notifyStateChange(inMeeting: boolean) {
    chrome.runtime.sendMessage({
      type: inMeeting ? 'MEETING_STARTED' : 'MEETING_ENDED',
      platform: 'google-meet',
      url: window.location.href,
    });
  }
}

new MeetingDetector();
```

## Side Panel UI

```tsx
// sidepanel/App.tsx
import { useState, useEffect } from 'react';

export function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState<string[]>([]);

  useEffect(() => {
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'TRANSCRIPTION_RESULT') {
        setTranscript(prev => [...prev, message.text]);
      }
    });
  }, []);

  const toggleRecording = async () => {
    if (isRecording) {
      chrome.runtime.sendMessage({ type: 'STOP_CAPTURE' });
    } else {
      chrome.runtime.sendMessage({ type: 'START_CAPTURE' });
    }
    setIsRecording(!isRecording);
  };

  return (
    <div className="p-4">
      <button
        onClick={toggleRecording}
        className={`px-4 py-2 rounded ${
          isRecording ? 'bg-red-500' : 'bg-blue-500'
        } text-white`}
      >
        {isRecording ? '録音停止' : '録音開始'}
      </button>

      <div className="mt-4 space-y-2">
        {transcript.map((text, i) => (
          <p key={i} className="text-sm">{text}</p>
        ))}
      </div>
    </div>
  );
}
```

## ビルド設定

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import manifest from './src/manifest';

export default defineConfig({
  plugins: [react(), crx({ manifest })],
  build: {
    rollupOptions: {
      input: {
        offscreen: 'src/offscreen/index.html',
      },
    },
  },
});
```

## デバッグ方法

1. `chrome://extensions` を開く
2. 「デベロッパーモード」を有効化
3. 「パッケージ化されていない拡張機能を読み込む」
4. `dist` フォルダを選択
5. Service Worker: 「Service Worker」リンクをクリック
6. Content Script: ページでDevTools > Console
