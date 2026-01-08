# 環境変数セットアップガイド

Meeting Transcriberアプリケーションの環境変数設定ガイドです。

## 概要

このガイドでは、開発環境と本番環境での環境変数の設定方法を説明します。

## 環境変数一覧

### 必須環境変数

#### Database

```env
DATABASE_URL=postgresql://...@ep-xxx.aws.neon.tech/meeting-transcriber?sslmode=require
```

- **説明**: PostgreSQLデータベースの接続URL
- **取得方法**: [Neon](https://neon.tech/)でデータベースを作成
- **ローカル**: 開発用データベースのURLを設定
- **本番**: 本番用データベースのURLを設定

#### OpenAI

```env
OPENAI_API_KEY=sk-...
```

- **説明**: OpenAI APIの認証キー
- **取得方法**: [OpenAI Platform](https://platform.openai.com/api-keys)でAPIキーを作成
- **ローカル**: 開発用APIキーを設定
- **本番**: 本番用APIキーを設定（使用量制限に注意）

#### NextAuth

```env
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000
```

- **NEXTAUTH_SECRET**: NextAuth.jsのセッション暗号化に使用する秘密鍵
  - **生成方法**: `openssl rand -base64 32` で生成
  - **ローカル**: 任意の秘密鍵
  - **本番**: 強力なランダム文字列を使用
- **NEXTAUTH_URL**: アプリケーションのベースURL
  - **ローカル**: `http://localhost:3000`
  - **本番**: `https://your-domain.com`

#### Google OAuth

```env
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
```

- **説明**: Google OAuthの認証情報
- **取得方法**: [Google Cloud Console](https://console.cloud.google.com/)でOAuth 2.0クライアントIDを作成
  1. プロジェクトを作成
  2. 「APIとサービス」→「認証情報」を開く
  3. 「認証情報を作成」→「OAuth 2.0クライアントID」を選択
  4. アプリケーションの種類で「ウェブアプリケーション」を選択
  5. 承認済みのリダイレクトURIを設定:
     - ローカル: `http://localhost:3000/api/auth/callback/google`
     - 本番: `https://your-domain.com/api/auth/callback/google`

### オプション環境変数

#### Upstash Redis（レート制限用）

```env
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx
```

- **説明**: レート制限機能で使用するRedisの認証情報
- **取得方法**: [Upstash Console](https://console.upstash.com/)でRedisデータベースを作成
- **ローカル**: **未設定でも動作**（インメモリフォールバック）
- **本番**: **設定を強く推奨**（分散レート制限に必要）

詳細は[Upstashセットアップガイド](./upstash-setup.md)を参照してください。

#### Chrome拡張機能用

```env
VITE_API_URL=http://localhost:3000/api
EXTENSION_JWT_SECRET=your-extension-secret
```

- **VITE_API_URL**: WebアプリのAPIエンドポイントURL
  - **ローカル**: `http://localhost:3000/api`
  - **本番**: `https://your-domain.com/api`
- **EXTENSION_JWT_SECRET**: 拡張機能とWeb間の通信認証に使用する秘密鍵
  - **生成方法**: `openssl rand -base64 32` で生成

## セットアップ手順

### ローカル開発環境

#### 1. リポジトリをクローン

```bash
git clone https://github.com/tmhr1850/meeting-transcriber.git
cd meeting-transcriber
```

#### 2. 依存関係をインストール

```bash
pnpm install
```

#### 3. 環境変数ファイルを作成

```bash
# Webアプリ用
cp apps/web/.env.example apps/web/.env.local

# Chrome拡張用（必要に応じて）
cp apps/extension/.env.example apps/extension/.env.local
```

#### 4. 環境変数を編集

`.env.local`ファイルを開いて、各環境変数を設定します。

```bash
# Webアプリ
nano apps/web/.env.local
```

最低限、以下の環境変数を設定してください。

- `DATABASE_URL`
- `OPENAI_API_KEY`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

**注意**: `UPSTASH_REDIS_REST_URL`と`UPSTASH_REDIS_REST_TOKEN`は開発環境では**オプション**です。

#### 5. データベースをセットアップ

```bash
# Prismaマイグレーションを実行
pnpm --filter @meeting-transcriber/web prisma migrate dev

# Prisma Clientを生成
pnpm --filter @meeting-transcriber/web prisma generate
```

#### 6. 開発サーバーを起動

```bash
pnpm dev
```

アプリケーションが`http://localhost:3000`で起動します。

### 本番環境（Vercel）

#### 1. Vercelプロジェクトを作成

```bash
# Vercel CLIをインストール（初回のみ）
npm i -g vercel

# プロジェクトをデプロイ
vercel
```

#### 2. 環境変数を設定

Vercel Dashboard → プロジェクト → Settings → Environment Variables

以下の環境変数を追加します。

| 変数名 | 値 | 環境 |
|---|---|---|
| `DATABASE_URL` | PostgreSQL接続URL | Production, Preview, Development |
| `OPENAI_API_KEY` | OpenAI APIキー | Production, Preview |
| `NEXTAUTH_SECRET` | ランダム文字列 | Production, Preview, Development |
| `NEXTAUTH_URL` | `https://your-domain.com` | Production |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | Production, Preview, Development |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | Production, Preview, Development |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis URL | Production, Preview |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis Token | Production, Preview |

**重要**: 本番環境では`UPSTASH_REDIS_REST_URL`と`UPSTASH_REDIS_REST_TOKEN`の設定を**強く推奨**します。

#### 3. デプロイ

```bash
vercel --prod
```

### 本番環境（その他のプラットフォーム）

使用するプラットフォームのドキュメントに従って、環境変数を設定してください。

- **Railway**: Settings → Variables
- **Render**: Environment → Environment Variables
- **AWS/GCP/Azure**: 各プラットフォームの環境変数設定機能を使用

## セキュリティのベストプラクティス

### 1. 環境変数の管理

- `.env.local`ファイルを`.gitignore`に追加（デフォルトで追加済み）
- 環境変数をリポジトリにコミットしない
- 本番環境とローカル環境で異なる値を使用

### 2. APIキーの保護

- APIキーは定期的にローテーション
- 使用量の監視とアラート設定
- 最小権限の原則を適用

### 3. 秘密鍵の生成

強力なランダム文字列を生成してください。

```bash
# NEXTAUTH_SECRETを生成
openssl rand -base64 32

# EXTENSION_JWT_SECRETを生成
openssl rand -base64 32
```

### 4. データベース接続

- データベースURLにSSLモードを使用（`?sslmode=require`）
- IPホワイトリストを設定（可能な場合）
- 読み取り専用ユーザーを分離（必要に応じて）

## トラブルシューティング

### エラー: `DATABASE_URL`が未定義

**原因**: `DATABASE_URL`が環境変数に設定されていない

**解決策**:
1. `.env.local`ファイルを確認
2. `DATABASE_URL`が正しく設定されているか確認
3. アプリケーションを再起動

### エラー: NextAuth configuration error

**原因**: `NEXTAUTH_SECRET`または`NEXTAUTH_URL`が未設定

**解決策**:
1. `.env.local`ファイルに`NEXTAUTH_SECRET`を追加
2. `NEXTAUTH_URL`を正しいURLに設定
3. アプリケーションを再起動

### エラー: Google OAuth authentication failed

**原因**: Google OAuth設定が不正

**解決策**:
1. Google Cloud Consoleで認証情報を確認
2. リダイレクトURIが正しく設定されているか確認
3. `GOOGLE_CLIENT_ID`と`GOOGLE_CLIENT_SECRET`が正しいか確認

### レート制限が動作しない

**原因**: Upstash Redisが設定されていない、またはインメモリフォールバックを使用している

**解決策**:
1. [Upstashセットアップガイド](./upstash-setup.md)を参照
2. `UPSTASH_REDIS_REST_URL`と`UPSTASH_REDIS_REST_TOKEN`を設定
3. アプリケーションを再起動
4. コンソールログで「✓ Upstash Redisレート制限を使用します」を確認

## 参考リンク

- [Neon PostgreSQL](https://neon.tech/docs)
- [OpenAI API](https://platform.openai.com/docs)
- [NextAuth.js](https://authjs.dev/)
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [Upstash Redis](https://upstash.com/docs/redis)
- [Vercel Environment Variables](https://vercel.com/docs/environment-variables)
