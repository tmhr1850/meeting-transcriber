/**
 * Zoom Web Client用 Content Script
 * 会議の開始・終了を検出してService Workerに通知する
 */

import type { ExtensionMessage } from '@meeting-transcriber/shared';

/**
 * Zoom会議検出クラス
 */
class ZoomMeetingDetector {
  private isInMeeting = false;
  private meetingInfo: { id?: string; topic?: string } = {};
  private observer: MutationObserver | null = null;
  private urlCheckInterval: number | null = null;

  constructor() {
    this.init();
  }

  /**
   * 初期化処理
   */
  private init() {
    // Zoom Web Clientの読み込み完了を待つ
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.startObserving());
    } else {
      this.startObserving();
    }
  }

  /**
   * 監視を開始
   */
  private startObserving() {
    // 初回チェック
    this.checkMeetingState();

    // DOM変更を監視
    this.observer = new MutationObserver(() => {
      this.checkMeetingState();
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
    });

    // URL変更を監視（ZoomはSPAのため）
    let lastUrl = location.href;
    this.urlCheckInterval = window.setInterval(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        this.checkMeetingState();
      }
    }, 2000);
  }

  /**
   * 会議状態をチェック
   */
  private checkMeetingState() {
    const inMeeting = this.detectZoomMeeting();

    if (inMeeting !== this.isInMeeting) {
      this.isInMeeting = inMeeting;
      this.notifyStateChange(inMeeting);
    }
  }

  /**
   * Zoom会議中かどうかを検出
   */
  private detectZoomMeeting(): boolean {
    // 1. ビデオコンテナの存在確認（Zoom固有のクラス名を優先）
    const videoContainer = document.querySelector(
      '.video-container__inner, [class*="video-container"]'
    );

    // 2. コントロールバーの存在確認（Zoom固有のクラス名を優先）
    const controlBar = document.querySelector(
      '.meeting-client-inner__footer, [class*="footer-button-base"]'
    );

    // 3. 会議IDの取得（Zoom固有のクラス名を優先）
    const meetingIdElement = document.querySelector(
      '.meeting-info-container__meeting-id, [class*="meeting-id"]'
    );
    if (meetingIdElement) {
      this.meetingInfo.id = meetingIdElement.textContent?.trim();
    } else {
      // フォールバック: URLから会議IDを抽出
      const match = window.location.pathname.match(/\/(\d+)$/);
      if (match) {
        this.meetingInfo.id = match[1];
      }
    }

    // 4. 会議トピックの取得（Zoom固有のクラス名を優先）
    const topicElement = document.querySelector(
      '.meeting-topic-container, [class*="meeting-topic"]'
    );
    if (topicElement) {
      this.meetingInfo.topic = topicElement.textContent?.trim();
    } else {
      // フォールバック: ページタイトルから取得
      this.meetingInfo.topic = document.title;
    }

    return !!(videoContainer && controlBar);
  }

  /**
   * 状態変更をService Workerに通知
   */
  private notifyStateChange(inMeeting: boolean) {
    const message: ExtensionMessage = {
      type: inMeeting ? 'MEETING_DETECTED' : 'MEETING_ENDED',
      payload: {
        platform: 'zoom',
        url: window.location.href,
        meetingId: this.meetingInfo.id,
        title: this.meetingInfo.topic,
      },
    };

    chrome.runtime.sendMessage(message);

    if (import.meta.env.DEV) {
      console.log(`[ZoomMeetingDetector] Zoom meeting ${inMeeting ? 'detected' : 'ended'}`, {
        meetingId: this.meetingInfo.id,
        title: this.meetingInfo.topic,
      });
    }
  }

  /**
   * クリーンアップ
   */
  destroy() {
    this.observer?.disconnect();
    if (this.urlCheckInterval !== null) {
      window.clearInterval(this.urlCheckInterval);
    }
  }
}

// 初期化
const detector = new ZoomMeetingDetector();

// クリーンアップ
window.addEventListener('unload', () => {
  detector.destroy();
});

// 開発用: グローバルにエクスポート
if (import.meta.env.DEV) {
  (window as any).__zoomMeetingDetector = detector;
}
