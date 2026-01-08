# Meeting Transcriber Web App

Next.js 14 (App Router) + NextAuth.js v5を使用したWebアプリケーション

## 実装内容

### Issue #6: NextAuth.js v5 Google OAuth認証

Google OAuthを使用した認証機能を実装しました。

#### 作成したファイル

1. **認証設定**: `src/lib/auth.ts`
   - NextAuth.js v5の設定
   - Google OAuthプロバイダー
   - Prisma Adapterによるデータベース連携
   - セッション管理（データベースストラテジー）

2. **Prisma Client**: `src/lib/prisma.ts`
   - Prisma Clientのシングルトンインスタンス
   - 開発環境での複数インスタンス作成を防止

3. **APIルート**: `src/app/api/auth/[...nextauth]/route.ts`
   - NextAuth.js APIハンドラー
   - `/api/auth/*` のすべてのエンドポイント

4. **型定義**: `src/types/next-auth.d.ts`
   - NextAuth.jsの型定義拡張
   - SessionにユーザーIDを追加

5. **Middleware**: `src/middleware.ts`
   - 認証が必要なルートの保護
   - 未認証ユーザーのログインページへのリダイレクト

6. **ログインページ**: `src/app/(auth)/login/page.tsx`
   - Googleログインボタン
   - Server Actionsを使用したログイン処理
   - エラーハンドリング

7. **認証レイアウト**: `src/app/(auth)/layout.tsx`
   - 認証ページ用のシンプルなレイアウト

8. **ダッシュボード**: `src/app/dashboard/page.tsx`
   - ログイン後のメインページ
   - ユーザー情報の表示

9. **ユーザーメニュー**: `src/components/layout/UserMenu.tsx`
   - ユーザー情報表示
   - ログアウト機能
   - ドロップダウンメニュー

10. **ルートレイアウト**: `src/app/layout.tsx`
    - アプリケーション全体のレイアウト

11. **ホームページ**: `src/app/page.tsx`
    - ログイン状態に応じたリダイレクト

## セットアップ

### 1. 依存関係のインストール

```bash
pnpm install
```

### 2. 環境変数の設定

`.env`ファイルを作成し、以下の環境変数を設定してください：

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/meeting_transcriber?schema=public"

# NextAuth
NEXTAUTH_SECRET="your-secret-key-change-this-in-production"
NEXTAUTH_URL="http://localhost:3000"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

### 3. Google OAuth設定

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. 新しいプロジェクトを作成
3. 「APIとサービス」→「認証情報」に移動
4. 「認証情報を作成」→「OAuthクライアントID」を選択
5. アプリケーションの種類: Webアプリケーション
6. 承認済みのリダイレクトURI: `http://localhost:3000/api/auth/callback/google`
7. クライアントIDとクライアントシークレットを取得

### 4. データベースのマイグレーション

```bash
pnpm prisma migrate dev
```

### 5. Prisma Clientの生成

```bash
pnpm prisma generate
```

## 開発

### 開発サーバーの起動

```bash
pnpm dev
```

アプリケーションは [http://localhost:3000](http://localhost:3000) で起動します。

### 型チェック

```bash
pnpm typecheck
```

### ビルド

```bash
pnpm build
```

## 認証フロー

1. ユーザーがログインページ (`/login`) にアクセス
2. 「Googleでログイン」ボタンをクリック
3. Google OAuth認証画面にリダイレクト
4. ユーザーがGoogleアカウントで認証
5. `/api/auth/callback/google` にリダイレクト
6. NextAuth.jsがセッションを作成
7. ダッシュボード (`/dashboard`) にリダイレクト

## 保護されたルート

以下のルートは認証が必要です：

- `/dashboard` - ダッシュボード
- `/meetings` - 会議一覧
- `/settings` - 設定
- `/transcriptions` - 文字起こし一覧

未認証のユーザーがアクセスしようとすると、自動的にログインページにリダイレクトされます。

## 技術スタック

- **Framework**: Next.js 14 (App Router)
- **Authentication**: NextAuth.js v5
- **Database**: PostgreSQL + Prisma ORM
- **Styling**: Tailwind CSS
- **Language**: TypeScript

## ディレクトリ構成

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx          # ログインページ
│   │   └── layout.tsx             # 認証レイアウト
│   ├── api/
│   │   └── auth/
│   │       └── [...nextauth]/
│   │           └── route.ts       # NextAuth APIハンドラー
│   ├── dashboard/
│   │   └── page.tsx               # ダッシュボード
│   ├── layout.tsx                 # ルートレイアウト
│   ├── page.tsx                   # ホームページ
│   └── globals.css                # グローバルCSS
├── components/
│   └── layout/
│       └── UserMenu.tsx           # ユーザーメニュー
├── lib/
│   ├── auth.ts                    # NextAuth設定
│   └── prisma.ts                  # Prisma Client
├── types/
│   └── next-auth.d.ts            # 型定義拡張
└── middleware.ts                  # 認証Middleware
```

## 次のステップ

- [ ] Chrome拡張機能の実装 (Issue #7)
- [ ] 会議一覧ページの実装
- [ ] 設定ページの実装
- [ ] Whisper API統合
- [ ] GPT-4要約機能の実装
