# Meeting Transcriber

Tactiqクローン - 会議文字起こし & AI要約サービス

## コミュニケーション規約

**重要: このプロジェクトでは、Claudeは必ず日本語で返答してください。**

- コード内のコメント、docstring、コミットメッセージは日本語で記述
- Issue、PR、レビューコメントは日本語で記述
- ユーザーとのやり取りは全て日本語で行う
- 技術用語は英語のまま使用可（例: TypeScript, API, Worktree）

## プロジェクト概要

Google Meet、Zoom、Microsoft Teamsの会議をリアルタイムで文字起こしし、AIで要約・アクションアイテムを抽出するサービス。

## 技術スタック

- **Monorepo**: Turborepo + pnpm workspaces
- **Frontend**: Next.js 14 (App Router) + React 18 + TypeScript
- **Chrome Extension**: Manifest V3 + Vite + @crxjs/vite-plugin
- **Database**: PostgreSQL (Neon) + Prisma ORM
- **Authentication**: NextAuth.js v5
- **AI**: OpenAI Whisper API (文字起こし) + GPT-4 (要約)
- **UI**: Tailwind CSS + shadcn/ui

## ディレクトリ構成

```
meeting-transcriber/
├── apps/
│   ├── web/                 # Next.js Web App
│   │   ├── src/
│   │   │   ├── app/         # App Router
│   │   │   ├── components/  # UIコンポーネント
│   │   │   └── lib/         # ユーティリティ
│   │   └── prisma/          # Prismaスキーマ
│   └── extension/           # Chrome拡張機能
│       └── src/
│           ├── background/  # Service Worker
│           ├── content/     # Content Scripts
│           ├── offscreen/   # Offscreen Document
│           ├── sidepanel/   # Side Panel UI
│           └── popup/       # Popup UI
├── packages/
│   ├── shared/              # 共有型定義・定数
│   ├── ui/                  # 共有UIコンポーネント
│   ├── audio-processor/     # 音声処理ユーティリティ
│   ├── api-client/          # API通信クライアント
│   └── database/            # Prisma Client
└── .claude/
    ├── agents/              # サブエージェント定義
    └── skills/              # スキル定義
```

## サブエージェント

### @chrome-extension-developer
Chrome拡張（Manifest V3）の開発を担当。tabCapture、Content Scripts、Service Worker、Offscreen Documentの実装。

### @nextjs-developer
Next.js App Router、API Routes、NextAuth.js認証、UIコンポーネントの実装。

### @prisma-database-architect
Prismaスキーマ設計、マイグレーション、Neon PostgreSQL設定。

### @openai-integration-specialist
Whisper API文字起こし、GPT-4要約生成、AIチャット機能の実装。

### @audio-processing-engineer
Web Audio API、MediaRecorder、音声チャンク処理、話者識別の実装。

## 開発コマンド

```bash
# 依存関係インストール
pnpm install

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
```

## 環境変数

```env
# Database
DATABASE_URL=postgresql://...@ep-xxx.aws.neon.tech/meeting-transcriber?sslmode=require

# OpenAI
OPENAI_API_KEY=sk-...

# NextAuth
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000

# Google OAuth
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx

# Extension
VITE_API_URL=http://localhost:3000/api
EXTENSION_JWT_SECRET=your-extension-secret
```

## GitHub Issues

MVPタスクは全てGitHub Issuesで管理: https://github.com/tmhr1850/meeting-transcriber/issues

### 実装順序

1. **Phase 1**: 基盤構築 (#1-#4, #11, #41)
2. **Phase 2**: 認証・コア機能 (#5-#7, #12, #13, #16, #20, #31)
3. **Phase 3**: UI実装 (#9, #14, #15, #18, #19, #21-#24)
4. **Phase 4**: API実装 (#8, #10, #17, #25-#29)
5. **Phase 5**: 追加機能 (#30, #32-#34, #40)
6. **Phase 6**: テスト・デプロイ (#35-#39)

## スキル

### /chrome-extension
Chrome拡張開発ガイド。tabCapture、Offscreen Document、Content Scriptの実装例。

### /meeting-summary
会議要約生成ガイド。GPT-4プロンプト、アクションアイテム抽出。

### /transcription
Whisper API文字起こしガイド。音声フォーマット変換、チャンク処理。

## コーディング規約

- TypeScriptを使用し、型定義を必ず記述
- エラーハンドリングを丁寧に実装
- 関数には適切なJSDocコメントを記述
- セキュリティを最優先（APIキー、認証トークンの取り扱い）
- 音声データは処理後に速やかに削除

## 参考リンク

- [Tactiq](https://tactiq.io/) - 参考サービス
- [Chrome Extension Manifest V3](https://developer.chrome.com/docs/extensions/mv3/)
- [OpenAI Whisper API](https://platform.openai.com/docs/guides/speech-to-text)
- [Neon PostgreSQL](https://neon.tech/docs)
- [NextAuth.js](https://authjs.dev/)
