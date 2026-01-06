/**
 * 音声処理の設定定数
 */
export const AUDIO_CONFIG = {
  /** 音声チャンクの処理間隔（ミリ秒） */
  CHUNK_DURATION_MS: 5000,
  /** サンプリングレート（Hz） - Whisper APIの推奨値 */
  SAMPLE_RATE: 16000,
  /** 音声チャンネル数（モノラル） */
  CHANNELS: 1,
  /** ビットレート（bps） */
  BIT_RATE: 128000,
  /** 最小チャンクサイズ（バイト） */
  MIN_CHUNK_SIZE: 1024,
  /** チャンク間のオーバーラップ時間（ミリ秒） */
  OVERLAP_DURATION_MS: 500,
} as const;
