/**
 * 必須環境変数を取得し、バリデーションを実施
 * @param key - 環境変数のキー
 * @param defaultValue - デフォルト値（オプション）
 * @returns 環境変数の値
 * @throws 環境変数が設定されていない、または本番環境でHTTPを使用している場合にエラーをスロー
 */
export function getRequiredEnv(key: string, defaultValue?: string): string {
  const value = (import.meta.env as Record<string, string | undefined>)[key] || defaultValue;

  if (!value) {
    throw new Error(`${key} environment variable is not set`);
  }

  // 本番環境ではHTTPSを強制
  if (!import.meta.env.DEV && value.startsWith('http://')) {
    throw new Error(`${key} must use HTTPS in production`);
  }

  return value;
}
