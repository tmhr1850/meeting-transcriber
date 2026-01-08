# テスト計画書

## 概要

Meeting Transcriberの品質を保証するため、ユニットテスト、統合テスト、E2Eテストの実装計画を策定します。

---

## テストフレームワークのセットアップ

### 推奨構成

```json
{
  "devDependencies": {
    "vitest": "^1.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "@testing-library/react": "^14.1.0",
    "@testing-library/jest-dom": "^6.1.0",
    "@testing-library/user-event": "^14.5.0",
    "msw": "^2.0.0",
    "playwright": "^1.40.0"
  }
}
```

### セットアップコマンド

```bash
# テスト依存関係のインストール
cd apps/web
pnpm add -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom @testing-library/user-event msw

# E2Eテスト用
pnpm add -D playwright @playwright/test
npx playwright install
```

---

## 1. ユニットテスト

### 対象

- `apps/web/src/lib/openai/whisper.ts`
- `apps/web/src/lib/openai/client.ts`
- バリデーションスキーマ
- ユーティリティ関数

### テストケース

#### 1.1 transcribeAudio()

**apps/web/src/lib/openai/__tests__/whisper.test.ts**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { transcribeAudio, mergeTranscriptionResults, retryWithExponentialBackoff } from '../whisper';
import OpenAI from 'openai';

// OpenAIクライアントのモック
vi.mock('../client', () => ({
  openai: {
    audio: {
      transcriptions: {
        create: vi.fn(),
      },
    },
  },
}));

describe('transcribeAudio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('正常系: 音声ファイルを文字起こしする', async () => {
    const mockFile = new File(['audio content'], 'test.mp3', { type: 'audio/mpeg' });
    const mockResponse = {
      text: 'こんにちは、テストです。',
      duration: 10.5,
      language: 'japanese',
      segments: [
        { id: 0, start: 0, end: 5, text: 'こんにちは、', no_speech_prob: 0.1 },
        { id: 1, start: 5, end: 10, text: 'テストです。', no_speech_prob: 0.05 },
      ],
    };

    vi.mocked(openai.audio.transcriptions.create).mockResolvedValue(mockResponse);

    const result = await transcribeAudio(mockFile, { language: 'ja' });

    expect(result.text).toBe('こんにちは、テストです。');
    expect(result.duration).toBe(10.5);
    expect(result.segments).toHaveLength(2);
    expect(openai.audio.transcriptions.create).toHaveBeenCalledWith({
      file: mockFile,
      model: 'whisper-1',
      language: 'ja',
      response_format: 'verbose_json',
    });
  });

  it('異常系: ファイルが25MBを超える場合はエラー', async () => {
    const largeFile = new File([new ArrayBuffer(26 * 1024 * 1024)], 'large.mp3', {
      type: 'audio/mpeg',
    });

    await expect(transcribeAudio(largeFile)).rejects.toThrow(
      '音声ファイルが大きすぎます'
    );
  });

  it('異常系: OpenAI APIエラー時にリトライ後にエラーをスロー', async () => {
    const mockFile = new File(['audio content'], 'test.mp3', { type: 'audio/mpeg' });

    vi.mocked(openai.audio.transcriptions.create).mockRejectedValue(
      new Error('API Error: Rate limit exceeded')
    );

    await expect(transcribeAudio(mockFile)).rejects.toThrow('API Error');
    // リトライ回数の確認（3回リトライ + 初回 = 4回）
    expect(openai.audio.transcriptions.create).toHaveBeenCalledTimes(4);
  });
});
```

#### 1.2 mergeTranscriptionResults()

```typescript
describe('mergeTranscriptionResults', () => {
  it('複数の文字起こし結果を統合する', () => {
    const results = [
      {
        text: '最初の部分。',
        duration: 10,
        segments: [{ id: 0, start: 0, end: 10, text: '最初の部分。', no_speech_prob: 0.1 }],
      },
      {
        text: '次の部分。',
        duration: 15,
        segments: [{ id: 0, start: 0, end: 15, text: '次の部分。', no_speech_prob: 0.05 }],
      },
    ];

    const merged = mergeTranscriptionResults(results);

    expect(merged.text).toBe('最初の部分。次の部分。');
    expect(merged.duration).toBe(25);
    expect(merged.segments).toHaveLength(2);
    // 2番目のセグメントの開始時刻が10秒オフセットされているか確認
    expect(merged.segments![1].start).toBe(10);
    expect(merged.segments![1].end).toBe(25);
  });

  it('空の配列を渡すと空の結果を返す', () => {
    const merged = mergeTranscriptionResults([]);

    expect(merged.text).toBe('');
    expect(merged.duration).toBe(0);
    expect(merged.segments).toEqual([]);
  });
});
```

#### 1.3 retryWithExponentialBackoff()

```typescript
describe('retryWithExponentialBackoff', () => {
  it('成功するまでリトライする', async () => {
    let attempts = 0;
    const fn = vi.fn(async () => {
      attempts++;
      if (attempts < 3) {
        throw new Error('Temporary error');
      }
      return 'success';
    });

    const result = await retryWithExponentialBackoff(fn, 3);

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('最大リトライ回数を超えるとエラーをスロー', async () => {
    const fn = vi.fn(async () => {
      throw new Error('Persistent error');
    });

    await expect(retryWithExponentialBackoff(fn, 3)).rejects.toThrow('Persistent error');
    expect(fn).toHaveBeenCalledTimes(4); // 初回 + 3回リトライ
  });
});
```

#### 1.4 バリデーションスキーマ

```typescript
describe('uploadRequestSchema', () => {
  it('有効なファイルを受け入れる', () => {
    const validFile = new File(['content'], 'test.mp3', { type: 'audio/mpeg' });
    const result = uploadRequestSchema.safeParse({
      audioFile: validFile,
      title: 'テスト会議',
      language: 'ja',
    });

    expect(result.success).toBe(true);
  });

  it('25MBを超えるファイルを拒否する', () => {
    const largeFile = new File([new ArrayBuffer(26 * 1024 * 1024)], 'large.mp3', {
      type: 'audio/mpeg',
    });
    const result = uploadRequestSchema.safeParse({
      audioFile: largeFile,
    });

    expect(result.success).toBe(false);
    expect(result.error?.errors[0].message).toContain('25MB');
  });

  it('サポートされていないフォーマットを拒否する', () => {
    const invalidFile = new File(['content'], 'test.txt', { type: 'text/plain' });
    const result = uploadRequestSchema.safeParse({
      audioFile: invalidFile,
    });

    expect(result.success).toBe(false);
    expect(result.error?.errors[0].message).toContain('サポートされていない');
  });
});
```

---

## 2. 統合テスト

### 対象

- `POST /api/upload`
- `POST /api/transcription`
- 認証フロー
- データベース操作

### テストケース

#### 2.1 POST /api/upload 統合テスト

**apps/web/src/app/api/upload/__tests__/route.integration.test.ts**

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { POST } from '../route';
import { auth } from '@/lib/auth';
import { prisma } from '@meeting-transcriber/database';
import { transcribeAudio } from '@/lib/openai/whisper';

// モック
vi.mock('@/lib/auth');
vi.mock('@/lib/openai/whisper');

describe('POST /api/upload - 統合テスト', () => {
  const mockUserId = 'user-123';
  const mockMeetingId = 'meeting-456';

  beforeEach(() => {
    // 認証モックの設定
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId, email: 'test@example.com' },
    } as any);

    // transcribeAudioモックの設定
    vi.mocked(transcribeAudio).mockResolvedValue({
      text: 'テスト文字起こし',
      duration: 10,
      language: 'japanese',
      segments: [
        {
          id: 0,
          start: 0,
          end: 10,
          text: 'テスト文字起こし',
          no_speech_prob: 0.1,
        },
      ],
    });
  });

  afterEach(async () => {
    // テストデータのクリーンアップ
    if (mockMeetingId) {
      await prisma.transcriptSegment.deleteMany({
        where: { meetingId: mockMeetingId },
      });
      await prisma.meeting.deleteMany({
        where: { id: mockMeetingId },
      });
    }
    vi.clearAllMocks();
  });

  it('正常系: 音声ファイルをアップロードして文字起こしを実行', async () => {
    const formData = new FormData();
    const audioFile = new File(['audio content'], 'test.mp3', { type: 'audio/mpeg' });
    formData.append('audioFile', audioFile);
    formData.append('title', 'テスト会議');
    formData.append('language', 'ja');

    const request = new Request('http://localhost:3000/api/upload', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.meetingId).toBeDefined();
    expect(data.status).toBe('completed');

    // データベースに保存されたか確認
    const meeting = await prisma.meeting.findUnique({
      where: { id: data.meetingId },
      include: { segments: true },
    });

    expect(meeting).toBeDefined();
    expect(meeting?.status).toBe('COMPLETED');
    expect(meeting?.segments.length).toBeGreaterThan(0);
  });

  it('異常系: 認証なしの場合、401エラーを返す', async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const formData = new FormData();
    const audioFile = new File(['audio content'], 'test.mp3', { type: 'audio/mpeg' });
    formData.append('audioFile', audioFile);

    const request = new Request('http://localhost:3000/api/upload', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('認証が必要です');
  });

  it('異常系: 25MBを超えるファイルは413エラーを返す', async () => {
    const formData = new FormData();
    // 26MBのファイルを作成
    const largeFile = new File([new ArrayBuffer(26 * 1024 * 1024)], 'large.mp3', {
      type: 'audio/mpeg',
    });
    formData.append('audioFile', largeFile);

    const request = new Request('http://localhost:3000/api/upload', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(413);
    expect(data.error).toContain('音声ファイルが大きすぎます');
    expect(data.details).toContain('25MB');
  });

  it('異常系: サポートされていないフォーマットは400エラーを返す', async () => {
    const formData = new FormData();
    const invalidFile = new File(['text content'], 'test.txt', { type: 'text/plain' });
    formData.append('audioFile', invalidFile);

    const request = new Request('http://localhost:3000/api/upload', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('バリデーションエラー');
    expect(data.details[0].message).toContain('サポートされていない');
  });

  it('異常系: Whisper APIエラー時は500エラーを返す', async () => {
    vi.mocked(transcribeAudio).mockRejectedValue(new Error('API Error'));

    const formData = new FormData();
    const audioFile = new File(['audio content'], 'test.mp3', { type: 'audio/mpeg' });
    formData.append('audioFile', audioFile);

    const request = new Request('http://localhost:3000/api/upload', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('アップロード処理に失敗しました');

    // エラー時に会議のステータスがFAILEDになっているか確認
    // （この部分は実装によって異なる）
  });
});
```

#### 2.2 POST /api/transcription 統合テスト

```typescript
describe('POST /api/transcription - 統合テスト', () => {
  it('正常系: 既存の会議に対して文字起こしを実行', async () => {
    // 事前に会議を作成
    const meeting = await prisma.meeting.create({
      data: {
        userId: mockUserId,
        title: 'テスト会議',
        platform: 'UPLOAD',
        status: 'PENDING',
      },
    });

    const formData = new FormData();
    const audioFile = new File(['audio content'], 'test.mp3', { type: 'audio/mpeg' });
    formData.append('meetingId', meeting.id);
    formData.append('audioFile', audioFile);
    formData.append('language', 'ja');

    const request = new Request('http://localhost:3000/api/transcription', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('異常系: 存在しない会議IDは404エラーを返す', async () => {
    const formData = new FormData();
    const audioFile = new File(['audio content'], 'test.mp3', { type: 'audio/mpeg' });
    formData.append('meetingId', 'non-existent-id');
    formData.append('audioFile', audioFile);

    const request = new Request('http://localhost:3000/api/transcription', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('会議が見つかりません');
  });

  it('異常系: 他人の会議にアクセスすると403エラーを返す', async () => {
    // 別のユーザーの会議を作成
    const otherUserMeeting = await prisma.meeting.create({
      data: {
        userId: 'other-user-id',
        title: '他人の会議',
        platform: 'UPLOAD',
        status: 'PENDING',
      },
    });

    const formData = new FormData();
    const audioFile = new File(['audio content'], 'test.mp3', { type: 'audio/mpeg' });
    formData.append('meetingId', otherUserMeeting.id);
    formData.append('audioFile', audioFile);

    const request = new Request('http://localhost:3000/api/transcription', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('この会議にアクセスする権限がありません');

    // クリーンアップ
    await prisma.meeting.delete({ where: { id: otherUserMeeting.id } });
  });
});
```

---

## 3. E2Eテスト（Playwright）

### セットアップ

**playwright.config.ts**

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### テストケース

**tests/e2e/upload.spec.ts**

```typescript
import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('音声ファイルアップロード', () => {
  test.beforeEach(async ({ page }) => {
    // ログイン処理
    await page.goto('/api/auth/signin');
    // Google OAuthのモックまたは実際のログイン
  });

  test('小さいファイル(1MB)の文字起こしが完了する', async ({ page }) => {
    await page.goto('/upload');

    // ファイル選択
    const fileInput = page.locator('input[type="file"]');
    const testFilePath = path.join(__dirname, 'fixtures', 'test-audio-1mb.mp3');
    await fileInput.setInputFiles(testFilePath);

    // タイトル入力
    await page.fill('input[name="title"]', 'E2Eテスト会議');

    // アップロード
    await page.click('button[type="submit"]');

    // 処理完了を待つ
    await expect(page.locator('text=文字起こしが完了しました')).toBeVisible({
      timeout: 30000,
    });

    // 会議詳細ページへ遷移
    await page.click('text=会議を表示');

    // 文字起こし結果が表示されるか確認
    await expect(page.locator('[data-testid="transcript-segment"]')).toHaveCount(
      1,
      { timeout: 5000 }
    );
  });

  test('進捗表示が正しく更新される', async ({ page }) => {
    await page.goto('/upload');

    const fileInput = page.locator('input[type="file"]');
    const testFilePath = path.join(__dirname, 'fixtures', 'test-audio-5mb.mp3');
    await fileInput.setInputFiles(testFilePath);

    await page.click('button[type="submit"]');

    // 進捗バーが表示される
    await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible();

    // 進捗が0%から100%まで更新される
    await expect(page.locator('text=0%')).toBeVisible();
    await expect(page.locator('text=100%')).toBeVisible({ timeout: 30000 });
  });

  test('エラー時にステータスが正しく更新される', async ({ page }) => {
    // 25MBを超えるファイルをアップロード
    await page.goto('/upload');

    const fileInput = page.locator('input[type="file"]');
    const largeFilePath = path.join(__dirname, 'fixtures', 'test-audio-30mb.mp3');
    await fileInput.setInputFiles(largeFilePath);

    await page.click('button[type="submit"]');

    // エラーメッセージが表示される
    await expect(page.locator('text=ファイルサイズが大きすぎます')).toBeVisible();
    await expect(page.locator('text=25MBまで')).toBeVisible();
  });
});
```

---

## 4. テストカバレッジ目標

| カテゴリ | 目標カバレッジ |
|---------|--------------|
| ライン | 80%以上 |
| ブランチ | 75%以上 |
| 関数 | 85%以上 |

---

## 5. CI/CDでのテスト実行

### GitHub Actions設定例

**.github/workflows/test.yml**

```yaml
name: Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Run unit tests
        run: pnpm test:unit

      - name: Run integration tests
        run: pnpm test:integration
        env:
          DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}

      - name: Run E2E tests
        run: pnpm test:e2e
        env:
          DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
```

---

## 6. 実装スケジュール

### Phase 1: ユニットテスト（優先度: High）

- [ ] テストフレームワークのセットアップ（Vitest）
- [ ] `transcribeAudio()`のテスト
- [ ] `mergeTranscriptionResults()`のテスト
- [ ] `retryWithExponentialBackoff()`のテスト
- [ ] バリデーションスキーマのテスト

**見積もり**: 4-6時間

### Phase 2: 統合テスト（優先度: High）

- [ ] テストデータベースのセットアップ
- [ ] `POST /api/upload`の統合テスト
- [ ] `POST /api/transcription`の統合テスト
- [ ] 認証・認可のテスト
- [ ] エラーハンドリングのテスト

**見積もり**: 6-8時間

### Phase 3: E2Eテスト（優先度: Medium）

- [ ] Playwrightのセットアップ
- [ ] ファイルアップロードのE2Eテスト
- [ ] 進捗表示のテスト
- [ ] エラー表示のテスト

**見積もり**: 4-6時間

### Phase 4: CI/CD統合（優先度: Medium）

- [ ] GitHub Actionsの設定
- [ ] カバレッジレポートの設定
- [ ] テスト結果の可視化

**見積もり**: 2-3時間

**合計見積もり**: 16-23時間

---

## 7. まとめ

このテスト計画により、Meeting Transcriberの品質を保証し、リグレッションを防ぐことができます。Issue #8のマージ後、優先度の高いユニットテストと統合テストから実装を開始することを推奨します。
