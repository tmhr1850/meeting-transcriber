# Meeting Transcriber

Google Meet、Zoom、Microsoft Teamsの会議をリアルタイムで文字起こしし、AIで要約・アクションアイテムを抽出するサービス（Tactiqクローン）

## 主な機能

- 🎙️ リアルタイム文字起こし（OpenAI Whisper API）
- 🤖 AI要約・アクションアイテム抽出（GPT-4）
- 🔍 全文検索
- 📊 会議管理ダッシュボード
- 🔐 Google OAuth認証
- 📤 音声ファイルアップロード
- 📝 エクスポート機能（Markdown/PDF）

## 技術スタック

- **Monorepo**: Turborepo + pnpm workspaces
- **Frontend**: Next.js 14 (App Router) + React 18 + TypeScript
- **Chrome Extension**: Manifest V3 + Vite + @crxjs/vite-plugin
- **Database**: PostgreSQL (Neon) + Prisma ORM
- **Authentication**: NextAuth.js v5
- **AI**: OpenAI Whisper API (文字起こし) + GPT-4 (要約)
- **UI**: Tailwind CSS + shadcn/ui

## ⚠️ 重要な制限事項

### 音声ファイルサイズ制限

- **最大ファイルサイズ: 25MB**（OpenAI Whisper APIの制限）
- 25MBを超えるファイルは処理できません
- 対応フォーマット: WebM, MP3, MP4, WAV, OGG

### 処理時間制限（Vercel）

- 無料プラン: 10秒
- Proプラン: 60秒
- 長時間の音声ファイルは処理がタイムアウトする可能性があります
- **本番環境**: バックグラウンドジョブキュー（Inngest、BullMQ等）の使用を推奨

### レート制限

⚠️ **現在未実装**
- DoS攻撃を防ぐため、本番環境では必ずレート制限を実装してください
- 推奨ライブラリ: `@upstash/ratelimit`, `@vercel/edge`

## セットアップ

### 1. 依存関係のインストール

```bash
pnpm install
```

### 2. 環境変数の設定

`apps/web/.env`ファイルを作成し、以下の環境変数を設定してください:

```env
# Database
DATABASE_URL="postgresql://user:password@host/database?sslmode=require"

# NextAuth
NEXTAUTH_SECRET="ランダムな文字列（openssl rand -base64 32で生成）"
NEXTAUTH_URL="http://localhost:3000"

# Google OAuth（https://console.cloud.google.com で取得）
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret"

# OpenAI API（https://platform.openai.com/api-keys で取得）
OPENAI_API_KEY="sk-proj-..."

# Chrome Extension
EXTENSION_JWT_SECRET="ランダムな文字列（openssl rand -base64 32で生成）"
```

### 3. データベースのセットアップ

```bash
cd apps/web
pnpm prisma migrate dev
pnpm prisma generate
```

### 4. 開発サーバーの起動

```bash
pnpm dev
```

- Web App: http://localhost:3000
- API: http://localhost:3000/api

## プロジェクト構成

```
meeting-transcriber/
├── apps/
│   ├── web/                 # Next.js Web App
│   │   ├── src/
│   │   │   ├── app/         # App Router
│   │   │   │   └── api/     # API Routes
│   │   │   ├── components/  # UIコンポーネント
│   │   │   └── lib/         # ユーティリティ・ヘルパー
│   │   └── prisma/          # Prismaスキーマ
│   └── extension/           # Chrome拡張機能（未実装）
├── packages/
│   ├── shared/              # 共有型定義・定数
│   ├── ui/                  # 共有UIコンポーネント
│   ├── audio-processor/     # 音声処理ユーティリティ
│   ├── api-client/          # API通信クライアント
│   └── database/            # Prisma Client
└── docs/                    # ドキュメント
    ├── api-spec.md          # API仕様書
    ├── architecture.md      # アーキテクチャ設計
    ├── database.md          # データベース設計
    └── ...
```

## 主要APIエンドポイント

### 音声ファイルアップロード

```bash
POST /api/upload
Content-Type: multipart/form-data

# フィールド:
# - audioFile: File（必須、25MB以下）
# - title: string（オプション）
# - language: string（オプション、デフォルト: 'ja'）
```

### 文字起こし

```bash
POST /api/transcription
Content-Type: multipart/form-data

# フィールド:
# - meetingId: string（必須）
# - audioFile: File（必須、25MB以下）
# - language: string（オプション）
```

詳細は[API仕様書](./docs/api-spec.md)を参照してください。

## 開発コマンド

```bash
# 開発サーバー起動（全パッケージ）
pnpm dev

# ビルド
pnpm build

# テスト
pnpm test

# Lint
pnpm lint

# 型チェック
pnpm typecheck

# Prismaマイグレーション
cd apps/web
pnpm prisma migrate dev

# Prisma Studio（データベースGUI）
cd apps/web
pnpm prisma studio
```

## デプロイ

### Vercelへのデプロイ

1. Vercelプロジェクトを作成
2. 環境変数を設定（上記の`.env`の内容）
3. プロジェクトをプッシュ

```bash
git push origin main
```

⚠️ **本番環境での注意事項**:
- レート制限を実装してください
- バックグラウンドジョブキューの導入を検討してください
- 環境変数が正しく設定されているか確認してください

### データベース（Neon PostgreSQL）

1. [Neon Console](https://console.neon.tech)でプロジェクトを作成
2. DATABASE_URLを取得
3. Prismaマイグレーションを実行

```bash
npx prisma migrate deploy
```

## トラブルシューティング

### エラー: "OPENAI_API_KEY環境変数が設定されていません"

`apps/web/.env`ファイルに`OPENAI_API_KEY`が設定されているか確認してください。

### エラー: "413 Payload Too Large"

アップロードしようとしているファイルが25MBを超えています。ファイルサイズを確認してください。

### エラー: "Database connection failed"

`DATABASE_URL`が正しく設定されているか、データベースが起動しているか確認してください。

## ライセンス

MIT

## コントリビューション

Issue、Pull Requestを歓迎します。

## 参考リンク

- [Tactiq](https://tactiq.io/) - 参考サービス
- [OpenAI Whisper API](https://platform.openai.com/docs/guides/speech-to-text)
- [Next.js 14 Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [NextAuth.js](https://authjs.dev/)
- [Neon PostgreSQL](https://neon.tech/docs)
