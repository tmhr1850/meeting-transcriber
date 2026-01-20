/**
 * レート制限ミドルウェア
 *
 * Upstash Redisを使用したレート制限機能を提供します。
 * 環境変数が未設定の場合は、インメモリフォールバックを使用します（開発環境用）。
 *
 * @module rate-limit
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

/**
 * レート制限の結果
 */
export interface RateLimitResult {
  /** リクエストが許可されたかどうか */
  success: boolean;
  /** 制限の上限値 */
  limit: number;
  /** 残りのリクエスト数 */
  remaining: number;
  /** 制限がリセットされる時刻（ミリ秒） */
  reset: number;
  /** 現在のリクエストがペンディング状態かどうか */
  pending?: Promise<unknown>;
}

/**
 * 開発環境用のインメモリレート制限クラス
 *
 * 本番環境では使用せず、Upstash Redisを使用してください。
 * このクラスはアプリケーション再起動時にリセットされます。
 */
class InMemoryRateLimiter {
  private cache = new Map<string, { count: number; resetTime: number }>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // 10分ごとに期限切れエントリをクリーンアップ
    this.cleanupInterval = setInterval(() => this.cleanup(), 10 * 60 * 1000);
  }

  /**
   * レート制限をチェック
   *
   * @param identifier - 識別子（ユーザーIDなど）
   * @param limit - 制限の上限値
   * @param windowMs - ウィンドウ時間（ミリ秒）
   * @returns レート制限の結果
   */
  async limit(
    identifier: string,
    limit: number,
    windowMs: number
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const entry = this.cache.get(identifier);

    // キャッシュエントリが存在しないか、期限切れの場合は新規作成
    if (!entry || entry.resetTime < now) {
      this.cache.set(identifier, { count: 1, resetTime: now + windowMs });
      return {
        success: true,
        limit,
        remaining: limit - 1,
        reset: now + windowMs,
      };
    }

    // 制限に達している場合
    if (entry.count >= limit) {
      return {
        success: false,
        limit,
        remaining: 0,
        reset: entry.resetTime,
      };
    }

    // カウントを増やす
    entry.count++;
    return {
      success: true,
      limit,
      remaining: limit - entry.count,
      reset: entry.resetTime,
    };
  }

  /**
   * 定期的に期限切れのエントリをクリーンアップ
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (value.resetTime < now) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * クリーンアップタイマーを停止（テスト用）
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

// Upstash Redisの設定確認とレート制限インスタンスの初期化
// Ratelimitインスタンスのキャッシュ（メモリリーク対策）
const rateLimiterCache = new Map<string, Ratelimit>();
// 共有Redis接続（接続プーリング）
let sharedRedis: Redis | null = null;
// InMemoryRateLimiterのシングルトンインスタンス（メモリリーク対策）
let inMemoryInstance: InMemoryRateLimiter | null = null;

if (
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN
) {
  // 本番環境: Upstash Redisを使用
  sharedRedis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  console.log('✓ Upstash Redisレート制限を使用します');
} else {
  // 開発環境: インメモリフォールバック
  console.warn(
    '⚠️  Upstash Redis未設定。インメモリレート制限を使用します（本番環境では非推奨）'
  );
  console.warn(
    '   設定方法: UPSTASH_REDIS_REST_URLとUPSTASH_REDIS_REST_TOKENを環境変数に設定してください'
  );
}

/**
 * Ratelimitインスタンスを取得（キャッシュ機能付き）
 *
 * メモリリークを防ぐため、limit/windowの組み合わせごとにインスタンスをキャッシュします。
 *
 * @param limit - 制限の上限値
 * @param window - ウィンドウ時間
 * @returns Ratelimitインスタンス
 */
function getRateLimiter(limit: number, window: string): Ratelimit {
  const key = `${limit}:${window}`;

  if (!rateLimiterCache.has(key)) {
    if (!sharedRedis) {
      throw new Error('Upstash Redis is not initialized');
    }

    rateLimiterCache.set(key, new Ratelimit({
      redis: sharedRedis,
      limiter: Ratelimit.slidingWindow(
        limit,
        window as `${number} ms` | `${number} s` | `${number} m` | `${number} h` | `${number} d`
      ),
      analytics: true,
      prefix: 'meeting-transcriber',
    }));
  }

  return rateLimiterCache.get(key)!;
}

/**
 * ウィンドウ文字列をミリ秒に変換
 *
 * @param window - ウィンドウ文字列（例: '1 h', '30 m', '60 s'）
 * @returns ミリ秒
 */
function parseWindow(window: string): number {
  const match = window.match(/^(\d+)\s*([smhd])$/);
  if (!match) {
    throw new Error(`Invalid window format: ${window}`);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    default:
      throw new Error(`Unknown time unit: ${unit}`);
  }
}

/**
 * レート制限をチェック
 *
 * @param identifier - 識別子（ユーザーID、IPアドレスなど）
 * @param limit - 制限の上限値
 * @param window - ウィンドウ時間（例: '1 h', '30 m', '60 s'）
 * @returns レート制限の結果
 *
 * @example
 * ```typescript
 * const result = await checkRateLimit('user:123', 10, '1 h');
 * if (!result.success) {
 *   return NextResponse.json(
 *     { error: 'Too many requests' },
 *     { status: 429, headers: {
 *       'X-RateLimit-Limit': result.limit.toString(),
 *       'X-RateLimit-Remaining': result.remaining.toString(),
 *       'X-RateLimit-Reset': result.reset.toString(),
 *     }}
 *   );
 * }
 * ```
 */
export async function checkRateLimit(
  identifier: string,
  limit: number,
  window: string
): Promise<RateLimitResult> {
  try {
    if (!sharedRedis) {
      // インメモリの場合: シングルトンインスタンスを使用
      const inMemoryRateLimiter = getInMemoryRateLimiter();
      const windowMs = parseWindow(window);
      return await inMemoryRateLimiter.limit(identifier, limit, windowMs);
    } else {
      // Upstash Ratelimitの場合は、キャッシュされたインスタンスを使用
      // メモリリーク対策: 毎回新しいインスタンスを作成せず、再利用する
      const customRateLimiter = getRateLimiter(limit, window);
      const result = await customRateLimiter.limit(identifier);

      return {
        success: result.success,
        limit: result.limit,
        remaining: result.remaining,
        reset: result.reset,
        pending: result.pending,
      };
    }
  } catch (error) {
    // エラーが発生した場合は、リクエストを許可する（フェイルオープン）
    console.error('レート制限チェック中にエラーが発生しました:', error);

    // フェイルオープン時のデフォルトリセット時間（1時間後）
    let resetTime = Date.now() + 3600000; // 1時間
    try {
      resetTime = Date.now() + parseWindow(window);
    } catch {
      // parseWindowでもエラーが発生した場合はデフォルト値を使用
    }

    return {
      success: true,
      limit,
      remaining: limit,
      reset: resetTime,
    };
  }
}

/**
 * InMemoryRateLimiterのシングルトンインスタンスを取得
 *
 * 複数のインスタンスが作成されることを防ぎ、メモリリークを防止します。
 * プロセス終了時に自動的にクリーンアップされます。
 *
 * @returns InMemoryRateLimiterインスタンス
 */
function getInMemoryRateLimiter(): InMemoryRateLimiter {
  if (!inMemoryInstance) {
    inMemoryInstance = new InMemoryRateLimiter();

    // プロセス終了時のクリーンアップ（開発環境のHot Reload対策）
    if (typeof process !== 'undefined') {
      const cleanup = () => {
        if (inMemoryInstance) {
          inMemoryInstance.destroy();
          inMemoryInstance = null;
        }
      };

      process.on('beforeExit', cleanup);
      process.on('SIGINT', cleanup);
      process.on('SIGTERM', cleanup);
    }
  }

  return inMemoryInstance;
}

/**
 * Retry-After秒数を計算
 *
 * レート制限超過時に、次のリクエストまでの待機時間を秒数で返します。
 *
 * @param resetTimestamp - レート制限がリセットされる時刻（ミリ秒）
 * @returns Retry-After秒数（最小値: 0）
 */
export function getRetryAfterSeconds(resetTimestamp: number): number {
  return Math.max(0, Math.ceil((resetTimestamp - Date.now()) / 1000));
}

/**
 * レート制限ヘッダーを生成
 *
 * @param result - レート制限の結果
 * @returns レート制限ヘッダー
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.reset.toString(),
  };
}
