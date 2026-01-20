# レート制限実装の提案（Issue提案）

## 概要

現在、`POST /api/upload`と`POST /api/transcription`エンドポイントにレート制限が実装されていません。DoS攻撃やリソースの乱用を防ぐため、レート制限の実装が必要です。

## 現状の問題点

### セキュリティリスク

1. **DoS攻撃のリスク**
   - 無制限のリクエストが可能
   - サーバーリソースを枯渇させる可能性

2. **コスト増大のリスク**
   - OpenAI API（Whisper）の使用量が無制限
   - 意図しない大量の課金が発生する可能性

3. **サービス品質の低下**
   - 正当なユーザーがサービスを利用できなくなる可能性

### 該当コード

**apps/web/src/app/api/upload/route.ts** (line 78-86):
```typescript
export async function POST(request: NextRequest) {
  // TODO: レート制限の実装
  // 例: @upstash/ratelimit を使用
  // const ratelimit = new Ratelimit({
  //   redis: Redis.fromEnv(),
  //   limiter: Ratelimit.slidingWindow(10, "1 h"), // 1時間に10リクエスト
  // });
  // const { success } = await ratelimit.limit(session.user.id);
  // if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
```

**apps/web/src/app/api/transcription/route.ts** (line 43-51):
```typescript
export async function POST(request: NextRequest) {
  // TODO: レート制限の実装
  // 例: @upstash/ratelimit を使用
  // const ratelimit = new Ratelimit({
  //   redis: Redis.fromEnv(),
  //   limiter: Ratelimit.slidingWindow(5, "1 h"), // 1時間に5リクエスト
  // });
  // const { success } = await ratelimit.limit(session.user.id);
  // if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
```

---

## 提案する実装方法

### 方法1: Upstash Rate Limit（推奨）

**メリット:**
- Vercelとの統合が簡単
- Redisベースで高速
- 無料プランあり（10,000リクエスト/日）
- Next.js Middlewareと統合可能

**実装例:**

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Redisクライアントの初期化
const redis = Redis.fromEnv();

// レート制限の設定
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 h'), // 1時間に10リクエスト
  analytics: true, // 分析機能を有効化
});

// APIルートでの使用
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  // レート制限チェック
  const { success, limit, reset, remaining } = await ratelimit.limit(
    `upload:${session.user.id}`
  );

  if (!success) {
    return NextResponse.json(
      {
        error: 'リクエスト制限に達しました',
        details: `1時間に${limit}リクエストまでです。${Math.ceil((reset - Date.now()) / 1000 / 60)}分後にリトライしてください。`,
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': new Date(reset).toISOString(),
        },
      }
    );
  }

  // 通常の処理...
}
```

**必要な環境変数:**
```env
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx
```

**セットアップ手順:**
1. [Upstash Console](https://console.upstash.com/)でRedisデータベースを作成
2. REST APIのURLとトークンを取得
3. `.env`ファイルに追加
4. パッケージをインストール: `pnpm add @upstash/ratelimit @upstash/redis`

---

### 方法2: Vercel Edge Config + KV（Vercelのみ）

**メリット:**
- Vercelネイティブのソリューション
- Edge Functionsで動作
- 低レイテンシ

**デメリット:**
- Vercelに依存
- ローカル開発が難しい

**実装例:**

```typescript
import { kv } from '@vercel/kv';

async function checkRateLimit(userId: string, limit: number, windowMs: number) {
  const key = `ratelimit:${userId}`;
  const now = Date.now();
  const windowStart = now - windowMs;

  // 現在のウィンドウ内のリクエスト数を取得
  const requests = await kv.zrange(key, windowStart, now, { byScore: true });

  if (requests.length >= limit) {
    return { success: false, remaining: 0 };
  }

  // 新しいリクエストを記録
  await kv.zadd(key, { score: now, member: `${now}-${Math.random()}` });
  await kv.expire(key, Math.ceil(windowMs / 1000));

  return { success: true, remaining: limit - requests.length - 1 };
}
```

---

### 方法3: インメモリレート制限（開発・テスト用）

**メリット:**
- 外部サービス不要
- セットアップが簡単

**デメリット:**
- サーバーレス環境では動作しない（各リクエストで状態がリセット）
- 本番環境では使用不可

**実装例:**

```typescript
// ⚠️ 開発・テスト用のみ。本番環境では使用しないでください
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(userId: string, limit: number, windowMs: number) {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);

  if (!entry || entry.resetTime < now) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + windowMs });
    return { success: true, remaining: limit - 1 };
  }

  if (entry.count >= limit) {
    return { success: false, remaining: 0 };
  }

  entry.count++;
  return { success: true, remaining: limit - entry.count };
}
```

---

## 推奨レート制限値

### POST /api/upload

| ユーザータイプ | 制限 | 理由 |
|---------------|------|------|
| 無料ユーザー | 10リクエスト/時間 | コスト管理、リソース保護 |
| 無料ユーザー | 50リクエスト/日 | 日次制限 |
| 有料ユーザー | 50リクエスト/時間 | より柔軟な使用 |

### POST /api/transcription

| ユーザータイプ | 制限 | 理由 |
|---------------|------|------|
| 無料ユーザー | 5リクエスト/時間 | より厳しい制限（手動トリガー） |
| 有料ユーザー | 20リクエスト/時間 | 十分な余裕 |

### その他のAPI

| エンドポイント | 制限 | 理由 |
|---------------|------|------|
| GET /api/meetings | 100リクエスト/時間 | 読み取り専用、軽量 |
| POST /api/meetings/:id/summary | 10リクエスト/時間 | GPT-4使用、コスト高 |
| POST /api/meetings/:id/chat | 20リクエスト/時間 | GPT-4使用 |

---

## 実装タスク

### Phase 1: 基本実装

- [ ] Upstashアカウントの作成とRedis設定
- [ ] `@upstash/ratelimit`パッケージのインストール
- [ ] レート制限ミドルウェアの作成
- [ ] `POST /api/upload`にレート制限を追加
- [ ] `POST /api/transcription`にレート制限を追加
- [ ] 環境変数の設定（`UPSTASH_REDIS_REST_URL`、`UPSTASH_REDIS_REST_TOKEN`）
- [ ] `.env.example`の更新
- [ ] ドキュメントの更新

### Phase 2: エラーハンドリング

- [ ] 429エラーレスポンスの標準化
- [ ] レート制限ヘッダーの追加（`X-RateLimit-*`）
- [ ] フロントエンドでのエラー表示
- [ ] リトライロジックの実装（クライアント側）

### Phase 3: 監視・分析

- [ ] レート制限違反のログ記録
- [ ] Upstash Analyticsの有効化
- [ ] アラート設定（異常な使用パターンの検出）
- [ ] ダッシュボードでの使用状況表示

### Phase 4: 高度な機能

- [ ] ユーザータイプ別の制限（無料/有料）
- [ ] IPアドレスベースの制限（認証前）
- [ ] 動的レート制限（負荷に応じて調整）
- [ ] ホワイトリスト機能（特定ユーザーの除外）

---

## 見積もり

### 開発時間

- Phase 1（基本実装）: 4-6時間
- Phase 2（エラーハンドリング）: 2-3時間
- Phase 3（監視・分析）: 3-4時間
- Phase 4（高度な機能）: 6-8時間

**合計**: 15-21時間

### コスト（Upstash）

- 無料プラン: 10,000リクエスト/日（個人プロジェクト向け）
- Payg（従量課金）: 10,000リクエストあたり$0.20
- Pro: $280/月（100万リクエスト含む）

---

## テスト計画

### ユニットテスト

```typescript
describe('Rate Limiting', () => {
  it('制限内のリクエストを許可する', async () => {
    // テストコード
  });

  it('制限を超えたリクエストを拒否する', async () => {
    // テストコード
  });

  it('正しいレート制限ヘッダーを返す', async () => {
    // テストコード
  });

  it('ウィンドウがリセットされた後、リクエストを許可する', async () => {
    // テストコード
  });
});
```

### 統合テスト

- 連続リクエストでの動作確認
- 異なるユーザーの独立性確認
- タイムアウト後のリセット確認

### 負荷テスト

- 同時リクエストでの動作確認
- Redisのパフォーマンス確認

---

## マイグレーション計画

### ステップ1: 開発環境での実装

1. Upstash Redisのセットアップ
2. コードの実装
3. ローカルテスト

### ステップ2: ステージング環境でのテスト

1. ステージング環境へのデプロイ
2. 機能テスト
3. 負荷テスト

### ステップ3: 本番環境へのロールアウト

1. レート制限を緩めに設定（監視モード）
2. 1週間の監視期間
3. 適切な制限値に調整
4. フルロールアウト

---

## 参考リンク

- [Upstash Rate Limit Documentation](https://upstash.com/docs/redis/sdks/ratelimit-ts/overview)
- [Vercel KV Documentation](https://vercel.com/docs/storage/vercel-kv)
- [HTTP 429 Too Many Requests](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/429)
- [Rate Limiting Best Practices](https://blog.logrocket.com/rate-limiting-node-js/)

---

## Issue作成用テンプレート

以下のテンプレートを使用してGitHub Issueを作成してください:

```markdown
## 概要

`POST /api/upload`と`POST /api/transcription`エンドポイントにレート制限を実装し、DoS攻撃やリソースの乱用を防ぐ。

## 背景

現在、レート制限が実装されていないため、以下のリスクがあります:
- DoS攻撃のリスク
- OpenAI APIの使用量が無制限でコスト増大のリスク
- サービス品質の低下

## タスク

- [ ] Upstash Redisのセットアップ
- [ ] `@upstash/ratelimit`パッケージのインストール
- [ ] `POST /api/upload`にレート制限を追加（10リクエスト/時間）
- [ ] `POST /api/transcription`にレート制限を追加（5リクエスト/時間）
- [ ] 429エラーレスポンスの実装
- [ ] レート制限ヘッダーの追加
- [ ] 環境変数の設定ガイドを更新
- [ ] テストの追加

## 技術的詳細

推奨実装: Upstash Rate Limit（`@upstash/ratelimit`）
- 無料プラン: 10,000リクエスト/日
- Vercelとの統合が簡単
- 詳細: [rate-limiting-proposal.md](./docs/rate-limiting-proposal.md)

## 見積もり

4-6時間（基本実装のみ）

## 優先度

**High** - セキュリティリスクとコスト管理のため、Issue #8のマージ前またはマージ直後に実装すべき

## 関連Issue

#8 (Whisper API連携の実装)
```

---

## まとめ

レート制限の実装は、セキュリティとコスト管理の観点から必須です。Upstash Rate Limitを使用した実装を推奨します。Issue #8のマージ前またはマージ直後に実装することを強く推奨します。
