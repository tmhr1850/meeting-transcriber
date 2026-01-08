import type { ExtensionMessage } from '../types/extension';

/**
 * タイムアウト付きでメッセージを送信
 * @param message - 送信するメッセージ
 * @param timeoutMs - タイムアウト時間（ミリ秒）
 * @returns レスポンス
 * @throws タイムアウトまたはメッセージ送信失敗時にエラーをスロー
 */
export async function sendMessageWithTimeout<T>(
  message: ExtensionMessage,
  timeoutMs: number = 5000
): Promise<T> {
  return Promise.race([
    chrome.runtime.sendMessage(message),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Message timeout')), timeoutMs)
    ),
  ]);
}

/**
 * 型安全なメッセージを作成
 * @param type - メッセージタイプ
 * @param payload - メッセージのペイロード（typeフィールドを除く）
 * @returns 型安全なExtensionMessage
 */
export function createMessage<T extends ExtensionMessage['type']>(
  type: T,
  payload: Omit<Extract<ExtensionMessage, { type: T }>, 'type'>
): ExtensionMessage {
  return { type, ...payload } as ExtensionMessage;
}
