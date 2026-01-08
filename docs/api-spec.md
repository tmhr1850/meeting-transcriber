# API仕様書

## 認証

すべてのAPIは認証が必要です（`/api/auth/*`を除く）。

### ヘッダー

```
Authorization: Bearer <token>
```

- Web App: NextAuth.jsセッション
- Chrome Extension: JWT（`/api/auth/extension`で発行）

---

## 会議API

### POST /api/meetings

会議を作成

**Request**
```json
{
  "title": "プロジェクトMTG",
  "platform": "google-meet",
  "url": "https://meet.google.com/xxx-xxxx-xxx"
}
```

**Response** `201 Created`
```json
{
  "id": "clxxxxxxxxx",
  "title": "プロジェクトMTG",
  "platform": "GOOGLE_MEET",
  "url": "https://meet.google.com/xxx-xxxx-xxx",
  "status": "RECORDING",
  "createdAt": "2024-01-15T10:00:00.000Z"
}
```

---

### GET /api/meetings

会議一覧を取得

**Query Parameters**
| パラメータ | 型 | 説明 |
|-----------|-----|------|
| q | string | 検索キーワード |
| platform | string | google-meet / zoom / teams / upload |
| from | string | 開始日（ISO 8601） |
| to | string | 終了日（ISO 8601） |
| page | number | ページ番号（デフォルト: 1） |
| limit | number | 取得件数（デフォルト: 20） |

**Response** `200 OK`
```json
{
  "meetings": [
    {
      "id": "clxxxxxxxxx",
      "title": "プロジェクトMTG",
      "platform": "GOOGLE_MEET",
      "status": "COMPLETED",
      "duration": 2700,
      "createdAt": "2024-01-15T10:00:00.000Z"
    }
  ],
  "total": 100,
  "page": 1,
  "perPage": 20
}
```

---

### GET /api/meetings/:id

会議詳細を取得

**Response** `200 OK`
```json
{
  "id": "clxxxxxxxxx",
  "title": "プロジェクトMTG",
  "platform": "GOOGLE_MEET",
  "url": "https://meet.google.com/xxx-xxxx-xxx",
  "status": "COMPLETED",
  "duration": 2700,
  "summary": "本会議では...",
  "keyPoints": ["予算は500万円で確定", "リリース日は3月末"],
  "actionItems": [
    {
      "task": "要件定義書の作成",
      "assignee": "田中",
      "deadline": "1月20日",
      "priority": "high",
      "completed": false
    }
  ],
  "decisions": ["開発言語はTypeScriptに決定"],
  "nextSteps": ["1月22日に進捗確認MTGを実施"],
  "segments": [
    {
      "id": "clxxxxxxxxx",
      "speaker": "田中",
      "text": "今日の議題は...",
      "timestamp": "2024-01-15T10:00:15.000Z",
      "confidence": 0.95
    }
  ],
  "createdAt": "2024-01-15T10:00:00.000Z"
}
```

---

### PATCH /api/meetings/:id

会議を更新

**Request**
```json
{
  "title": "新しいタイトル"
}
```

**Response** `200 OK`
```json
{
  "id": "clxxxxxxxxx",
  "title": "新しいタイトル",
  ...
}
```

---

### DELETE /api/meetings/:id

会議を削除

**Response** `204 No Content`

---

### POST /api/meetings/:id/end

会議を終了

**Response** `200 OK`
```json
{
  "id": "clxxxxxxxxx",
  "status": "COMPLETED",
  "duration": 2700
}
```

---

## 文字起こしAPI

### POST /api/transcription

音声ファイルを文字起こしし、データベースに保存

**⚠️ 制限事項**
- **最大ファイルサイズ**: 25MB（OpenAI Whisper APIの制限）
- 25MBを超えるファイルは`413 Payload Too Large`エラーを返します
- 対応フォーマット: WebM, MP3, MP4, WAV, OGG

**Request** `multipart/form-data`
| フィールド | 型 | 説明 |
|-----------|-----|------|
| meetingId | string | 会議ID（必須） |
| audioFile | File | 音声ファイル（必須、25MB以下） |
| language | string | 言語コード（オプション、デフォルト: 'ja'） |

**Response** `200 OK`
```json
{
  "success": true,
  "text": "今日の議題は3つあります...",
  "duration": 125.5,
  "segmentCount": 42,
  "language": "japanese"
}
```

**エラーレスポンス例**

413 Payload Too Large:
```json
{
  "error": "音声ファイルが大きすぎます",
  "details": "現在は25MBまでのファイルのみサポートしています。ファイルサイズ: 32.45MB"
}
```

400 Bad Request:
```json
{
  "error": "バリデーションエラー",
  "details": [
    {
      "field": "audioFile",
      "message": "audioFileは必須です"
    }
  ]
}
```

---

### POST /api/transcribe

音声チャンクを文字起こし（リアルタイム処理用）

**⚠️ 制限事項**
- **最大チャンクサイズ**: 25MB（OpenAI Whisper APIの制限）

**Request** `multipart/form-data`
| フィールド | 型 | 説明 |
|-----------|-----|------|
| meetingId | string | 会議ID |
| audio | File | 音声ファイル（WebM/WAV、25MB以下） |
| timestamp | number | タイムスタンプ（ms） |
| chunkIndex | number | チャンク番号 |

**Response** `200 OK`
```json
{
  "segmentId": "clxxxxxxxxx",
  "text": "今日の議題は3つあります...",
  "speaker": "Speaker 1",
  "timestamp": "00:00:15",
  "confidence": 0.95
}
```

---

## 要約API

### POST /api/meetings/:id/summary

AI要約を生成

**Response** `200 OK`
```json
{
  "summary": "本会議では、2024年Q1のプロジェクト計画について議論しました...",
  "keyPoints": [
    "予算は500万円で確定",
    "リリース日は3月末"
  ],
  "actionItems": [
    {
      "task": "要件定義書の作成",
      "assignee": "田中",
      "deadline": "1月20日",
      "priority": "high"
    }
  ],
  "decisions": [
    "開発言語はTypeScriptに決定"
  ],
  "nextSteps": [
    "1月22日に進捗確認MTGを実施"
  ]
}
```

---

### GET /api/meetings/:id/summary

既存の要約を取得

**Response** `200 OK`
```json
{
  "summary": "...",
  "keyPoints": [...],
  "actionItems": [...],
  "decisions": [...],
  "nextSteps": [...]
}
```

---

## AIチャットAPI

### POST /api/meetings/:id/chat

会議内容についてAIに質問

**Request**
```json
{
  "message": "この会議で決まった予算はいくらですか？"
}
```

**Response** `text/event-stream`（SSE）
```
data: {"content": "この会議で"}
data: {"content": "決まった予算は"}
data: {"content": "500万円です。"}
data: [DONE]
```

---

## アップロードAPI

### POST /api/upload

音声ファイルをアップロードし、文字起こしを実行

**⚠️ 制限事項**
- **最大ファイルサイズ**: 25MB（OpenAI Whisper APIの制限）
- 25MBを超えるファイルは`413 Payload Too Large`エラーを返します
- 対応フォーマット: WebM, MP3, MP4, WAV, OGG
- **処理時間制限**: Vercel無料プラン: 10秒、Proプラン: 60秒
  - 長時間の音声ファイルは処理がタイムアウトする可能性があります
  - 本番環境ではバックグラウンドジョブキュー（Inngest、BullMQ等）の使用を推奨

**Request** `multipart/form-data`
| フィールド | 型 | 説明 |
|-----------|-----|------|
| audioFile | File | 音声ファイル（必須、25MB以下） |
| title | string | 会議タイトル（オプション、デフォルト: '音声ファイルのアップロード'） |
| language | string | 言語コード（オプション、デフォルト: 'ja'） |

**Response** `200 OK`
```json
{
  "success": true,
  "meetingId": "clxxxxxxxxx",
  "status": "completed",
  "message": "音声ファイルのアップロードと文字起こしが完了しました。"
}
```

**エラーレスポンス例**

413 Payload Too Large:
```json
{
  "error": "音声ファイルが大きすぎます",
  "details": "現在は25MBまでのファイルのみサポートしています。ファイルサイズ: 32.45MB"
}
```

400 Bad Request:
```json
{
  "error": "バリデーションエラー",
  "details": [
    {
      "field": "audioFile",
      "message": "サポートされていない音声形式です"
    }
  ]
}
```

---

### GET /api/upload/:meetingId/status

アップロード処理状況を確認

**Response** `200 OK`
```json
{
  "status": "processing",
  "progress": 75,
  "segmentsProcessed": 15,
  "totalSegments": 20
}
```

---

## リアルタイム配信API

### GET /api/meetings/:id/stream

トランスクリプトのリアルタイム配信（SSE）

**Response** `text/event-stream`
```
data: {"type": "connected"}
data: {"type": "new_segment", "segment": {"id": "...", "text": "...", "speaker": "..."}}
: heartbeat
data: {"type": "new_segment", "segment": {...}}
```

---

## エクスポートAPI

### GET /api/meetings/:id/export

会議をエクスポート

**Query Parameters**
| パラメータ | 型 | 説明 |
|-----------|-----|------|
| format | string | markdown / pdf |

**Response**
- `text/markdown` または `application/pdf`
- `Content-Disposition: attachment; filename="タイトル.md"`

---

## 検索API

### GET /api/search

トランスクリプト全文検索

**Query Parameters**
| パラメータ | 型 | 説明 |
|-----------|-----|------|
| q | string | 検索キーワード（2文字以上） |

**Response** `200 OK`
```json
{
  "results": [
    {
      "segmentId": "clxxxxxxxxx",
      "meetingId": "clxxxxxxxxx",
      "meetingTitle": "プロジェクトMTG",
      "text": "予算は500万円を想定しています...",
      "speaker": "田中",
      "timestamp": "00:05:30",
      "highlight": "予算は<mark>500万円</mark>を想定しています..."
    }
  ],
  "total": 25
}
```

---

## 認証API（拡張機能用）

### GET /api/auth/extension

拡張機能用トークンを発行

**Response** `200 OK`
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "clxxxxxxxxx",
    "email": "user@example.com",
    "name": "田中太郎",
    "image": "https://..."
  }
}
```

---

## エラーレスポンス

### 形式

```json
{
  "error": "エラーメッセージ",
  "code": "ERROR_CODE"
}
```

### ステータスコード

| コード | 説明 |
|--------|------|
| 400 | Bad Request - リクエストが不正 |
| 401 | Unauthorized - 認証が必要 |
| 403 | Forbidden - アクセス権限なし |
| 404 | Not Found - リソースが存在しない |
| 413 | Payload Too Large - ファイルサイズ超過 |
| 429 | Too Many Requests - レート制限 |
| 500 | Internal Server Error - サーバーエラー |
