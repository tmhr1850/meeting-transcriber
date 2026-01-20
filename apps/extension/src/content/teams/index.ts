/**
 * Microsoft Teams用 Content Script
 * Teams会議で録音ボタンを表示し、リアルタイム文字起こしを行う
 */

import type {
  ExtensionMessage,
  ExtensionMessageResponse,
  MeetingInfo,
  TranscriptUpdateData,
} from '@meeting-transcriber/shared';
import { createMessage } from '@meeting-transcriber/shared';

class TeamsMeetingDetector {
  private isInMeeting = false;
  private isTranscribing = false;
  private meetingInfo: MeetingInfo | null = null;
  private observer: MutationObserver | null = null;
  private overlay: HTMLElement | null = null;
  private controlButton: HTMLElement | null = null;
  private eventHandlers: Map<HTMLElement, EventListener> = new Map();

  constructor() {
    this.init();
  }

  private init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.startObserving());
    } else {
      this.startObserving();
    }

    // メッセージリスナー設定
    chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));

    if (import.meta.env.DEV) {
      console.log('[MeetingTranscriber] Initialized on Microsoft Teams');
    }
  }

  private startObserving() {
    this.checkMeetingState();

    this.observer = new MutationObserver(() => {
      this.checkMeetingState();
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
    });
  }

  private checkMeetingState() {
    const inMeeting = this.detectTeamsMeeting();

    if (inMeeting !== this.isInMeeting) {
      this.isInMeeting = inMeeting;

      if (inMeeting) {
        this.updateMeetingInfo();
        this.notifyMeetingDetected();
        this.injectUI();
      } else {
        this.notifyMeetingEnded();
        this.cleanup();
      }
    }
  }

  /**
   * Teams会議中かを判定
   */
  private detectTeamsMeeting(): boolean {
    // 1. 通話コントロールバーの存在確認（最も確実）
    const callControls = document.querySelector('[data-tid="call-control-bar"]');

    // 2. 通話中バッジの存在確認
    const inCallBadge = document.querySelector('[class*="ts-calling-in-call"]');

    // 3. ビデオギャラリーの存在確認
    const videoGallery = document.querySelector('[data-tid="video-gallery"]');

    // 4. 参加者パネルの存在確認
    const participantsPanel = document.querySelector('[data-tid="roster-list"]');

    return !!(callControls || inCallBadge);
  }

  /**
   * 会議情報を更新
   */
  private updateMeetingInfo() {
    // 会議タイトルの取得
    const titleElement = document.querySelector('[data-tid="meeting-title"]');
    const title =
      titleElement?.textContent?.trim() || document.title || 'Teams Meeting';

    // 会議IDの抽出（URLパターン: /meetup-join/{threadId}）
    const url = window.location.href;
    const meetupJoinMatch = url.match(/\/meetup-join\/([^/?]+)/);
    const meetingId = meetupJoinMatch ? meetupJoinMatch[1] : 'unknown';

    this.meetingInfo = {
      meetingId: `teams-${meetingId}`,
      platform: 'teams',
      url,
      title,
    };
  }

  /**
   * 会議検出をService Workerに通知
   */
  private notifyMeetingDetected() {
    if (!this.meetingInfo) return;

    try {
      chrome.runtime.sendMessage(
        createMessage('MEETING_DETECTED', {
          payload: {
            platform: this.meetingInfo.platform,
            url: this.meetingInfo.url,
            title: this.meetingInfo.title,
          },
        })
      );

      if (import.meta.env.DEV) {
        console.log('[MeetingTranscriber] Teams meeting detected:', this.meetingInfo);
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[MeetingTranscriber] Failed to notify meeting detected:', error);
      }
    }
  }

  /**
   * 会議終了をService Workerに通知
   */
  private notifyMeetingEnded() {
    try {
      chrome.runtime.sendMessage(
        createMessage('MEETING_ENDED', {
          payload: {
            platform: 'teams',
            url: window.location.href,
            title: this.meetingInfo?.title,
          },
        })
      );

      if (import.meta.env.DEV) {
        console.log('[MeetingTranscriber] Teams meeting ended');
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[MeetingTranscriber] Failed to notify meeting ended:', error);
      }
    }
  }

  /**
   * UIコンポーネントを注入
   */
  private injectUI() {
    if (this.controlButton) return; // 既に存在する場合はスキップ

    this.injectStyles();
    this.injectControlButton();
    this.createTranscriptOverlay();
  }

  /**
   * グローバルスタイルを注入
   */
  private injectStyles() {
    if (document.getElementById('mt-global-styles')) return;

    const style = document.createElement('style');
    style.id = 'mt-global-styles';
    style.textContent = `
      /* コントロールボタン */
      #mt-control-button {
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 10000;
        padding: 12px 24px;
        background: #6264a7;
        color: white;
        border: none;
        border-radius: 24px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transition: all 0.2s;
      }

      #mt-control-button:hover {
        background: #5558a3;
        transform: translateX(-50%) translateY(-2px);
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
      }

      #mt-control-button.recording {
        background: #c4314b;
        animation: pulse 2s infinite;
      }

      #mt-control-button.recording:hover {
        background: #a52a3f;
      }

      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.8; }
      }

      /* 文字起こしオーバーレイ */
      #mt-transcript-overlay {
        position: fixed;
        bottom: 140px;
        left: 50%;
        transform: translateX(-50%);
        width: 90%;
        max-width: 800px;
        max-height: 300px;
        background: rgba(255, 255, 255, 0.95);
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        overflow-y: auto;
        z-index: 9999;
        padding: 16px;
        display: none;
      }

      #mt-transcript-overlay.visible {
        display: block;
      }

      #mt-transcript-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
        padding-bottom: 8px;
        border-bottom: 1px solid #e0e0e0;
      }

      #mt-transcript-title {
        font-size: 14px;
        font-weight: 600;
        color: #333;
      }

      #mt-transcript-close {
        background: none;
        border: none;
        font-size: 20px;
        color: #666;
        cursor: pointer;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      #mt-transcript-close:hover {
        color: #333;
      }

      #mt-transcript-content {
        font-size: 13px;
        line-height: 1.6;
        color: #333;
      }

      .mt-transcript-segment {
        margin-bottom: 12px;
        padding: 8px;
        border-radius: 6px;
        background: #f8f8f8;
      }

      .mt-transcript-timestamp {
        font-size: 11px;
        color: #666;
        margin-bottom: 4px;
      }

      .mt-transcript-text {
        color: #333;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * コントロールボタンを注入
   */
  private injectControlButton() {
    const button = document.createElement('button');
    button.id = 'mt-control-button';
    button.textContent = '🎤 文字起こし開始';

    const handler = () => this.toggleTranscription();
    this.eventHandlers.set(button, handler);
    button.addEventListener('click', handler);

    document.body.appendChild(button);
    this.controlButton = button;
  }

  /**
   * 文字起こしオーバーレイを作成
   */
  private createTranscriptOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'mt-transcript-overlay';

    const header = document.createElement('div');
    header.id = 'mt-transcript-header';

    const title = document.createElement('div');
    title.id = 'mt-transcript-title';
    title.textContent = '文字起こし';

    const closeButton = document.createElement('button');
    closeButton.id = 'mt-transcript-close';
    closeButton.textContent = '×';
    const closeHandler = () => overlay.classList.remove('visible');
    this.eventHandlers.set(closeButton, closeHandler);
    closeButton.addEventListener('click', closeHandler);

    header.appendChild(title);
    header.appendChild(closeButton);

    const content = document.createElement('div');
    content.id = 'mt-transcript-content';

    overlay.appendChild(header);
    overlay.appendChild(content);

    document.body.appendChild(overlay);
    this.overlay = overlay;
  }

  /**
   * 文字起こしの開始/停止を切り替え
   */
  private async toggleTranscription() {
    if (!this.meetingInfo) return;

    if (this.isTranscribing) {
      await this.stopTranscription();
    } else {
      await this.startTranscription();
    }
  }

  /**
   * 文字起こし開始
   */
  private async startTranscription() {
    if (!this.meetingInfo) return;

    try {
      const response = await chrome.runtime.sendMessage(
        createMessage('START_RECORDING', { meetingInfo: this.meetingInfo })
      );

      if (response?.success) {
        this.isTranscribing = true;
        this.updateButtonState();
        this.overlay?.classList.add('visible');

        if (import.meta.env.DEV) {
          console.log('[MeetingTranscriber] Recording started successfully');
        }
      } else {
        throw new Error(response?.error || 'Failed to start recording');
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[MeetingTranscriber] Failed to start recording:', error);
      }
      alert('文字起こしの開始に失敗しました');
    }
  }

  /**
   * 文字起こし停止
   */
  private async stopTranscription() {
    try {
      const response = await chrome.runtime.sendMessage(
        createMessage('STOP_RECORDING', {})
      );

      if (response?.success) {
        this.isTranscribing = false;
        this.updateButtonState();

        if (import.meta.env.DEV) {
          console.log('[MeetingTranscriber] Recording stopped successfully');
        }
      } else {
        throw new Error(response?.error || 'Failed to stop recording');
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[MeetingTranscriber] Failed to stop recording:', error);
      }
    }
  }

  /**
   * ボタンの表示状態を更新
   */
  private updateButtonState() {
    if (!this.controlButton) return;

    if (this.isTranscribing) {
      this.controlButton.textContent = '⏹️ 文字起こし停止';
      this.controlButton.classList.add('recording');
    } else {
      this.controlButton.textContent = '🎤 文字起こし開始';
      this.controlButton.classList.remove('recording');
    }
  }

  /**
   * メッセージハンドラ
   */
  private handleMessage(
    message: ExtensionMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: ExtensionMessageResponse) => void
  ): boolean {
    if (message.type === 'TRANSCRIPT_UPDATE' && 'data' in message) {
      this.updateTranscript(message.data);
      sendResponse({ success: true });
      return true;
    }
    return false;
  }

  /**
   * 文字起こし結果を表示
   */
  private updateTranscript(data: TranscriptUpdateData) {
    if (!this.overlay) return;

    const content = this.overlay.querySelector('#mt-transcript-content');
    if (!content) return;

    const segment = document.createElement('div');
    segment.className = 'mt-transcript-segment';

    const timestamp = document.createElement('div');
    timestamp.className = 'mt-transcript-timestamp';
    timestamp.textContent = new Date(data.timestamp).toLocaleTimeString('ja-JP');

    const text = document.createElement('div');
    text.className = 'mt-transcript-text';
    text.textContent = data.text;

    segment.appendChild(timestamp);
    segment.appendChild(text);

    content.appendChild(segment);

    // 自動スクロール
    content.scrollTop = content.scrollHeight;
  }

  /**
   * クリーンアップ
   */
  private cleanup() {
    // イベントリスナーを削除
    this.eventHandlers.forEach((handler, element) => {
      element.removeEventListener('click', handler as EventListener);
    });
    this.eventHandlers.clear();

    // UI要素を削除
    this.controlButton?.remove();
    this.overlay?.remove();
    this.controlButton = null;
    this.overlay = null;

    // リセット
    this.isTranscribing = false;
    this.meetingInfo = null;
  }

  /**
   * 破棄
   */
  destroy() {
    this.observer?.disconnect();
    this.cleanup();
  }
}

// 初期化
const detector = new TeamsMeetingDetector();

window.addEventListener('unload', () => {
  detector.destroy();
});

// 開発環境でグローバルに公開
if (import.meta.env.DEV) {
  (window as any).__teamsTranscriber = detector;
}
