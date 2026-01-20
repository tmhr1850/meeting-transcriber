/**
 * Extension Utilities
 * 汎用的なユーティリティ関数
 */

/**
 * ミリ秒をHH:MM:SS形式にフォーマット
 * @param milliseconds - ミリ秒
 * @returns HH:MM:SS形式の文字列
 */
export function formatTimestamp(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * 秒数をHH:MM:SS形式にフォーマット
 * @param seconds - 秒数
 * @returns HH:MM:SS形式の文字列
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * バイト数を読みやすい形式にフォーマット
 * @param bytes - バイト数
 * @param decimals - 小数点以下の桁数
 * @returns フォーマットされた文字列
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * DateオブジェクトをISO 8601形式の文字列に変換
 * @param date - Dateオブジェクト
 * @returns ISO 8601形式の文字列
 */
export function toISOString(date: Date): string {
  return date.toISOString();
}

/**
 * ISO 8601形式の文字列をDateオブジェクトに変換
 * @param isoString - ISO 8601形式の文字列
 * @returns Dateオブジェクト
 */
export function fromISOString(isoString: string): Date {
  return new Date(isoString);
}

/**
 * 遅延処理
 * @param ms - ミリ秒
 * @returns Promise
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * リトライ処理
 * @param fn - リトライする関数
 * @param options - リトライオプション
 * @returns Promiseの結果
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelayMs?: number;
    useExponentialBackoff?: boolean;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    useExponentialBackoff = true,
  } = options;

  let lastError: Error | unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries) {
        const delayMs = useExponentialBackoff
          ? initialDelayMs * Math.pow(2, attempt)
          : initialDelayMs;

        console.log(`[Retry] Attempt ${attempt + 1}/${maxRetries + 1} failed, retrying in ${delayMs}ms...`);
        await delay(delayMs);
      }
    }
  }

  throw lastError;
}
