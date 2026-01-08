/**
 * 開発環境専用のロガーユーティリティ
 * 本番環境ではログを出力しない
 */
export const logger = {
  /**
   * デバッグログを出力
   * @param args - ログに出力する引数
   */
  debug: (...args: unknown[]) => {
    if (import.meta.env.DEV) console.log('[DEBUG]', ...args);
  },

  /**
   * エラーログを出力
   * @param args - ログに出力する引数
   */
  error: (...args: unknown[]) => {
    if (import.meta.env.DEV) console.error('[ERROR]', ...args);
  },

  /**
   * 警告ログを出力
   * @param args - ログに出力する引数
   */
  warn: (...args: unknown[]) => {
    if (import.meta.env.DEV) console.warn('[WARN]', ...args);
  },

  /**
   * 情報ログを出力
   * @param args - ログに出力する引数
   */
  info: (...args: unknown[]) => {
    if (import.meta.env.DEV) console.info('[INFO]', ...args);
  },
};
