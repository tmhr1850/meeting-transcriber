/**
 * レート制限設定
 *
 * APIエンドポイントごとのレート制限値を定義します。
 * 環境変数で上書き可能です。
 *
 * @module config/rate-limits
 */

/**
 * レート制限設定の型定義
 */
export interface RateLimitConfig {
  /** 制限の上限値 */
  limit: number;
  /** ウィンドウ時間 */
  window: `${number} ms` | `${number} s` | `${number} m` | `${number} h` | `${number} d`;
}

/**
 * APIエンドポイントごとのレート制限設定
 *
 * 環境変数で上書き可能:
 * - RATE_LIMIT_UPLOAD: アップロードAPIの制限値（デフォルト: 10）
 * - RATE_LIMIT_TRANSCRIPTION: 文字起こしAPIの制限値（デフォルト: 5）
 * - RATE_LIMIT_WINDOW: レート制限のウィンドウ時間（デフォルト: 1 h）
 */
export const RATE_LIMITS = {
  /**
   * アップロードAPI: 10リクエスト/時間
   *
   * 音声ファイルのアップロードに対するレート制限。
   * ファイルサイズが大きいため、控えめな制限を設定しています。
   */
  UPLOAD: {
    limit: parseInt(process.env.RATE_LIMIT_UPLOAD || '10', 10),
    window: (process.env.RATE_LIMIT_WINDOW || '1 h') as RateLimitConfig['window'],
  } as const,

  /**
   * 文字起こしAPI: 5リクエスト/時間
   *
   * Whisper APIを使用した文字起こし処理に対するレート制限。
   * OpenAI APIの料金が発生するため、より厳しい制限を設定しています。
   */
  TRANSCRIPTION: {
    limit: parseInt(process.env.RATE_LIMIT_TRANSCRIPTION || '5', 10),
    window: (process.env.RATE_LIMIT_WINDOW || '1 h') as RateLimitConfig['window'],
  } as const,
} as const;

/**
 * レート制限設定のバリデーション
 *
 * 環境変数の値が不正な場合、警告を出力します。
 */
export function validateRateLimitConfig(): void {
  const uploadLimit = RATE_LIMITS.UPLOAD.limit;
  const transcriptionLimit = RATE_LIMITS.TRANSCRIPTION.limit;

  if (uploadLimit <= 0 || !Number.isInteger(uploadLimit)) {
    console.warn(
      `⚠️  RATE_LIMIT_UPLOADの値が不正です: ${uploadLimit}。デフォルト値(10)を使用します。`
    );
  }

  if (transcriptionLimit <= 0 || !Number.isInteger(transcriptionLimit)) {
    console.warn(
      `⚠️  RATE_LIMIT_TRANSCRIPTIONの値が不正です: ${transcriptionLimit}。デフォルト値(5)を使用します。`
    );
  }

  if (uploadLimit > 100 || transcriptionLimit > 100) {
    console.warn(
      '⚠️  レート制限値が大きすぎます。DoS攻撃のリスクが高まります。'
    );
  }
}

// アプリケーション起動時にバリデーションを実行
if (process.env.NODE_ENV !== 'test') {
  validateRateLimitConfig();
}
