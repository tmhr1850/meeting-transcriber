/**
 * APIエラー情報
 */
export interface ApiError {
  /** エラーコード */
  code: string;
  /** エラーメッセージ */
  message: string;
  /** 追加の詳細情報 */
  details?: unknown;
}

/**
 * API レスポンス
 */
export interface ApiResponse<T> {
  /** 成功フラグ */
  success: boolean;
  /** レスポンスデータ */
  data?: T;
  /** エラー情報 */
  error?: ApiError;
}

/**
 * 文字起こしリクエスト
 */
export interface TranscriptionRequest {
  /** 会議ID */
  meetingId: string;
  /** 音声チャンク (ArrayBuffer または Blob) */
  audioChunk: ArrayBuffer | Blob;
  /** タイムスタンプ（会議開始からのミリ秒） */
  timestamp: number;
  /** 音声フォーマット (MIMEタイプ) */
  mimeType?: string;
}

/**
 * 文字起こしレスポンス
 */
export interface TranscriptionResponse {
  /** 文字起こしテキスト */
  text: string;
  /** タイムスタンプ（会議開始からのミリ秒） */
  timestamp: number;
  /** セグメントID */
  segmentId: string;
  /** 言語コード */
  language?: string;
  /** 信頼度 (0.0-1.0) */
  confidence?: number;
}
