/**
 * Chrome拡張の定数定義
 */
export const EXTENSION_CONSTANTS = {
  /** Offscreen Document作成後の待機時間（ミリ秒） */
  OFFSCREEN_CREATION_DELAY: 100,

  /** メッセージ送信タイムアウト時間（ミリ秒） */
  MESSAGE_TIMEOUT: 5000,

  /** セグメントの最大保持数（メモリリーク対策） */
  MAX_SEGMENTS: 1000,

  /** AIクエリのコンテキスト制限（直近N件のセグメント） */
  CONTEXT_LIMIT: 50,

  /** 自動スクロールの閾値（ピクセル） */
  AUTO_SCROLL_THRESHOLD: 50,
} as const;
