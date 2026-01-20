/**
 * レート制限機能
 *
 * Upstash Redisを使用してAPIのレート制限を実装
 * OpenAI APIコストの急増を防ぐためのセーフガード
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Upstash Redis接続（環境変数が設定されている場合のみ有効化）
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

/**
 * 要約生成APIのレート制限
 *
 * 設定: 1時間あたり5回まで
 * ユーザーIDベースで制限
 */
export const summaryRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '1 h'),
      prefix: 'ratelimit:summary',
      analytics: true, // レート制限の分析を有効化
    })
  : null;

/**
 * カスタムプロンプトAPIのレート制限
 *
 * 設定: 1時間あたり10回まで
 * ユーザーIDベースで制限
 */
export const askRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '1 h'),
      prefix: 'ratelimit:ask',
      analytics: true,
    })
  : null;

/**
 * レート制限チェックのヘルパー関数
 *
 * @param identifier - ユーザーID
 * @param limiter - 使用するレート制限インスタンス
 * @returns レート制限に達しているか、残りの試行回数、リセット時刻
 */
export async function checkRateLimit(
  identifier: string,
  limiter: Ratelimit | null
): Promise<{
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}> {
  // Redis が設定されていない場合は制限なし（開発環境用）
  if (!limiter) {
    console.warn('レート制限が無効化されています（Upstash Redisが設定されていません）');
    return {
      success: true,
      limit: Number.MAX_SAFE_INTEGER,
      remaining: Number.MAX_SAFE_INTEGER,
      reset: Date.now() + 3600000, // 1時間後
    };
  }

  // レート制限チェック
  const result = await limiter.limit(identifier);

  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  };
}
