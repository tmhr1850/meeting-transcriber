import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkRateLimit, getRateLimitHeaders, getRetryAfterSeconds } from '../rate-limit';

// Upstash Redisのモック
vi.mock('@upstash/redis', () => ({
  Redis: vi.fn(),
}));

vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: vi.fn().mockImplementation(() => ({
    limit: vi.fn().mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 9,
      reset: Date.now() + 3600000,
    }),
  })),
}));

describe('checkRateLimit', () => {
  // 環境変数を一時的に削除してインメモリモードでテスト
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    // Upstash Redis環境変数を削除してインメモリモードに
    process.env = { ...originalEnv };
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('制限内のリクエストを許可する', async () => {
    const result = await checkRateLimit('test-user-1', 10, '1 h');

    expect(result.success).toBe(true);
    expect(result.limit).toBe(10);
    expect(result.remaining).toBe(9);
    expect(result.reset).toBeGreaterThan(Date.now());
  });

  it('制限を超えたリクエストを拒否する', async () => {
    const identifier = 'test-user-2';
    const limit = 3;

    // 制限まで実行
    for (let i = 0; i < limit; i++) {
      const result = await checkRateLimit(identifier, limit, '1 h');
      expect(result.success).toBe(true);
    }

    // 制限超過
    const result = await checkRateLimit(identifier, limit, '1 h');
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('異なる識別子で独立してカウントする', async () => {
    const user1Result = await checkRateLimit('user-1', 5, '1 h');
    const user2Result = await checkRateLimit('user-2', 5, '1 h');

    expect(user1Result.success).toBe(true);
    expect(user2Result.success).toBe(true);
    expect(user1Result.remaining).toBe(4);
    expect(user2Result.remaining).toBe(4);
  });

  it('ウィンドウ時間を正しく解析する', async () => {
    const testCases = [
      { window: '1 s', expectedMs: 1000 },
      { window: '30 m', expectedMs: 30 * 60 * 1000 },
      { window: '2 h', expectedMs: 2 * 60 * 60 * 1000 },
      { window: '1 d', expectedMs: 24 * 60 * 60 * 1000 },
    ];

    for (const { window, expectedMs } of testCases) {
      const now = Date.now();
      const result = await checkRateLimit(`test-window-${window}`, 10, window);
      expect(result.success).toBe(true);

      // resetタイムスタンプが現在時刻 + ウィンドウ時間の範囲内にあることを確認
      const expectedReset = now + expectedMs;
      // 実行時間のズレを考慮して、より広い範囲で検証
      expect(result.reset).toBeGreaterThan(now);
      expect(result.reset).toBeLessThanOrEqual(expectedReset + 5000); // 5秒の誤差を許容
    }
  });

  it('エラー時にフェイルオープンする', async () => {
    // parseWindow関数がエラーをスローする無効なウィンドウ形式
    const result = await checkRateLimit('test-fail-open', 10, 'invalid');

    // フェイルオープン: エラー時もリクエストを許可
    expect(result.success).toBe(true);
    expect(result.limit).toBe(10);
    expect(result.remaining).toBe(10);
  });

  it('同じ識別子で連続してリクエストした場合、remainingが減少する', async () => {
    const identifier = 'test-user-3';
    const limit = 10;

    const result1 = await checkRateLimit(identifier, limit, '1 h');
    expect(result1.remaining).toBe(9);

    const result2 = await checkRateLimit(identifier, limit, '1 h');
    expect(result2.remaining).toBe(8);

    const result3 = await checkRateLimit(identifier, limit, '1 h');
    expect(result3.remaining).toBe(7);
  });
});

describe('getRateLimitHeaders', () => {
  it('正しいヘッダーを生成する', () => {
    const result = {
      success: true,
      limit: 10,
      remaining: 5,
      reset: 1704067200000,
    };

    const headers = getRateLimitHeaders(result);

    expect(headers).toEqual({
      'X-RateLimit-Limit': '10',
      'X-RateLimit-Remaining': '5',
      'X-RateLimit-Reset': '1704067200000',
    });
  });

  it('制限超過時のヘッダーを生成する', () => {
    const result = {
      success: false,
      limit: 10,
      remaining: 0,
      reset: 1704067200000,
    };

    const headers = getRateLimitHeaders(result);

    expect(headers).toEqual({
      'X-RateLimit-Limit': '10',
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': '1704067200000',
    });
  });
});

describe('getRetryAfterSeconds', () => {
  it('未来のタイムスタンプから正しい秒数を計算する', () => {
    const now = Date.now();
    const resetTimestamp = now + 3600000; // 1時間後

    const retryAfter = getRetryAfterSeconds(resetTimestamp);

    // 3600秒（1時間）前後であることを確認（実行時間の誤差を考慮）
    expect(retryAfter).toBeGreaterThanOrEqual(3599);
    expect(retryAfter).toBeLessThanOrEqual(3601);
  });

  it('過去のタイムスタンプの場合は0を返す', () => {
    const now = Date.now();
    const resetTimestamp = now - 1000; // 1秒前

    const retryAfter = getRetryAfterSeconds(resetTimestamp);

    expect(retryAfter).toBe(0);
  });

  it('現在時刻とほぼ同じ場合は0または1を返す', () => {
    const now = Date.now();
    const resetTimestamp = now + 100; // 100ミリ秒後

    const retryAfter = getRetryAfterSeconds(resetTimestamp);

    expect(retryAfter).toBeGreaterThanOrEqual(0);
    expect(retryAfter).toBeLessThanOrEqual(1);
  });

  it('秒数に切り上げる', () => {
    const now = Date.now();
    const resetTimestamp = now + 1500; // 1.5秒後

    const retryAfter = getRetryAfterSeconds(resetTimestamp);

    // 切り上げで2秒になる
    expect(retryAfter).toBe(2);
  });
});

describe('InMemoryRateLimiter（統合）', () => {
  it('ウィンドウ期限切れ後にカウントがリセットされる', async () => {
    const identifier = 'test-reset';
    const limit = 5;
    const window = '1 s'; // 1秒ウィンドウ

    // 制限まで実行
    for (let i = 0; i < limit; i++) {
      await checkRateLimit(identifier, limit, window);
    }

    // 制限超過を確認
    const resultBefore = await checkRateLimit(identifier, limit, window);
    expect(resultBefore.success).toBe(false);

    // 1秒待機
    await new Promise(resolve => setTimeout(resolve, 1100));

    // ウィンドウ期限切れ後は再度許可される
    const resultAfter = await checkRateLimit(identifier, limit, window);
    expect(resultAfter.success).toBe(true);
    expect(resultAfter.remaining).toBe(limit - 1);
  }, 3000); // タイムアウトを3秒に設定
});
