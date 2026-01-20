/**
 * Google Meet用 Content Script
 * 会議ページで録音ボタンを表示し、リアルタイム文字起こしを行う
 */

import type { ExtensionMessage, MeetingInfo, TranscriptUpdateData } from '@meeting-transcriber/shared';

class GoogleMeetTranscriber {
  private isTranscribing = false;
  private overlay: HTMLElement | null = null;
  private controlButton: HTMLElement | null = null;

  constructor() {
    this.init();
  }

  private async init() {
    // 会議ページの読み込み完了を待つ
    await this.waitForMeetingReady();

    // UIを注入
    this.injectUI();

    // メッセージリスナー設定
    chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));

    if (import.meta.env.DEV) {
      console.log('[Meeting Transcriber] Initialized on Google Meet');
    }
  }

  /**
   * Google Meetの会議画面の読み込みを待つ
   */
  private waitForMeetingReady(): Promise<void> {
    return new Promise((resolve) => {
      let timeoutId: NodeJS.Timeout | null = null;

      const observer = new MutationObserver((mutations, obs) => {
        // Google Meet固有の要素を検出
        const controlsBar = document.querySelector('[data-is-muted]');
        const meetingContainer = document.querySelector('[data-meeting-code]');

        if (controlsBar || meetingContainer) {
          obs.disconnect();
          if (timeoutId) clearTimeout(timeoutId);
          resolve();
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });

      // タイムアウト（30秒）
      timeoutId = setTimeout(() => {
        observer.disconnect();
        resolve();
      }, 30000);
    });
  }

  /**
   * UIコンポーネントを注入
   */
  private injectUI() {
    this.injectControlButton();
    this.createTranscriptOverlay();
  }

  /**
   * 録音コントロールボタンを注入
   */
  private injectControlButton() {
    // 既存のボタンがあれば削除（重複対策）
    const existing = document.getElementById('mt-control-button');
    if (existing) existing.remove();

    const button = document.createElement('div');
    button.id = 'mt-control-button';
    button.innerHTML = `
      <button id="mt-toggle-btn" class="mt-btn">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
          <line x1="12" y1="19" x2="12" y2="23"/>
          <line x1="8" y1="23" x2="16" y2="23"/>
        </svg>
        <span class="mt-btn-text">文字起こし開始</span>
      </button>
    `;

    // スタイル（重複対策でIDをチェック）
    if (!document.getElementById('mt-control-button-styles')) {
      const style = document.createElement('style');
      style.id = 'mt-control-button-styles';
      style.textContent = `
        #mt-control-button {
          position: fixed;
          bottom: 80px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 10000;
        }
        .mt-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          background: #7c3aed;
          color: white;
          border: none;
          border-radius: 24px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(124, 58, 237, 0.4);
          transition: all 0.2s;
        }
        .mt-btn:hover {
          background: #6d28d9;
          transform: scale(1.05);
        }
        .mt-btn.recording {
          background: #dc2626;
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.4); }
          50% { box-shadow: 0 0 0 10px rgba(220, 38, 38, 0); }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(button);
    this.controlButton = button;

    // イベントリスナー
    document.getElementById('mt-toggle-btn')?.addEventListener('click', () => {
      this.toggleTranscription();
    });
  }

  /**
   * 文字起こしオーバーレイを作成
   */
  private createTranscriptOverlay() {
    // 既存のオーバーレイがあれば削除（重複対策）
    const existing = document.getElementById('mt-transcript-overlay');
    if (existing) existing.remove();

    this.overlay = document.createElement('div');
    this.overlay.id = 'mt-transcript-overlay';
    this.overlay.innerHTML = `
      <div class="mt-overlay-header">
        <span>リアルタイム文字起こし</span>
        <button id="mt-overlay-close">×</button>
      </div>
      <div id="mt-transcript-content"></div>
    `;

    // スタイル（重複対策でIDをチェック）
    if (!document.getElementById('mt-transcript-overlay-styles')) {
      const style = document.createElement('style');
      style.id = 'mt-transcript-overlay-styles';
      style.textContent = `
        #mt-transcript-overlay {
          position: fixed;
          right: 20px;
          bottom: 100px;
          width: 400px;
          max-height: 300px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          z-index: 10000;
          display: none;
          flex-direction: column;
          overflow: hidden;
        }
        #mt-transcript-overlay.visible {
          display: flex;
        }
        .mt-overlay-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: #7c3aed;
          color: white;
          font-weight: 500;
        }
        .mt-overlay-header button {
          background: none;
          border: none;
          color: white;
          font-size: 20px;
          cursor: pointer;
        }
        #mt-transcript-content {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          font-size: 14px;
          line-height: 1.6;
        }
        .mt-segment {
          margin-bottom: 12px;
          padding-bottom: 12px;
          border-bottom: 1px solid #eee;
        }
        .mt-segment:last-child {
          border-bottom: none;
        }
        .mt-timestamp {
          font-size: 12px;
          color: #888;
          margin-bottom: 4px;
        }
        .mt-text {
          color: #333;
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(this.overlay);

    // 閉じるボタン
    document.getElementById('mt-overlay-close')?.addEventListener('click', () => {
      this.overlay?.classList.remove('visible');
    });
  }

  /**
   * 文字起こしの開始/停止を切り替え
   */
  private async toggleTranscription() {
    if (this.isTranscribing) {
      await this.stopTranscription();
    } else {
      await this.startTranscription();
    }
  }

  /**
   * 文字起こしを開始
   */
  private async startTranscription() {
    const meetingInfo = this.extractMeetingInfo();

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'START_RECORDING',
        meetingInfo,
      } as ExtensionMessage);

      if (response?.success) {
        this.isTranscribing = true;
        this.updateButtonState();
        this.overlay?.classList.add('visible');

        if (import.meta.env.DEV) {
          console.log('Recording started successfully');
        }
      } else {
        const errorMsg = response?.error || '録音の開始に失敗しました';
        if (import.meta.env.DEV) {
          console.error('Failed to start:', errorMsg);
        }
        alert(errorMsg);
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error starting transcription:', error);
      }
      alert('録音の開始に失敗しました: ' + String(error));
    }
  }

  /**
   * 文字起こしを停止
   */
  private async stopTranscription() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'STOP_RECORDING',
      } as ExtensionMessage);

      if (response?.success) {
        this.isTranscribing = false;
        this.updateButtonState();

        if (import.meta.env.DEV) {
          console.log('Recording stopped successfully');
        }
      } else {
        const errorMsg = response?.error || '録音の停止に失敗しました';
        if (import.meta.env.DEV) {
          console.error('Failed to stop:', errorMsg);
        }
        alert(errorMsg);
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error stopping transcription:', error);
      }
      alert('録音の停止に失敗しました: ' + String(error));
    }
  }

  /**
   * 会議情報を抽出
   */
  private extractMeetingInfo(): MeetingInfo {
    const url = new URL(window.location.href);
    const meetingCode = url.pathname.split('/').pop() || 'unknown';

    // 会議タイトルを取得（ページタイトルから）
    let title = document.title;

    // もしタイトルが「Google Meet」だけなら、会議コードを使用
    if (title === 'Google Meet' || title === 'Meet') {
      title = `Meeting ${meetingCode}`;
    }

    return {
      platform: 'google-meet',
      meetingId: meetingCode,
      title,
      url: window.location.href,
    };
  }

  /**
   * ボタンの状態を更新
   */
  private updateButtonState() {
    const btn = document.getElementById('mt-toggle-btn');
    const btnText = btn?.querySelector('.mt-btn-text');

    if (btn && btnText) {
      if (this.isTranscribing) {
        btn.classList.add('recording');
        btnText.textContent = '文字起こし停止';
      } else {
        btn.classList.remove('recording');
        btnText.textContent = '文字起こし開始';
      }
    }
  }

  /**
   * メッセージハンドラー
   */
  private handleMessage(message: ExtensionMessage, sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void): boolean {
    if (message.type === 'TRANSCRIPT_UPDATE') {
      this.addTranscript(message.data);
      sendResponse({ success: true });
    }
    return true;
  }

  /**
   * 文字起こし結果をUIに追加
   */
  private addTranscript(data: TranscriptUpdateData) {
    const content = document.getElementById('mt-transcript-content');
    if (!content) return;

    const segment = document.createElement('div');
    segment.className = 'mt-segment';

    const timestamp = this.formatTimestamp(data.segment.startTime);

    segment.innerHTML = `
      <div class="mt-timestamp">${timestamp}</div>
      <div class="mt-text">${this.escapeHtml(data.segment.text)}</div>
    `;

    content.appendChild(segment);
    content.scrollTop = content.scrollHeight;
  }

  /**
   * タイムスタンプをフォーマット
   */
  private formatTimestamp(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}:${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    }
    return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
  }

  /**
   * HTMLエスケープ
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// 初期化
new GoogleMeetTranscriber();

// 開発用のデバッグAPI
if (import.meta.env.DEV) {
  console.log('[Meeting Transcriber] Google Meet Content Script loaded');
}
