# Meeting Transcriber セットアップガイド

このドキュメントでは、Issue #6 (NextAuth.js認証) のセットアップ手順を説明します。

## 📋 チェックリスト

本番環境にデプロイする前に、以下の項目を確認してください：

- [ ] Prismaマイグレーションが正常に実行される
- [ ] Google Cloud Consoleで正しいリダイレクトURIが設定されている
- [ ] 本番環境の `NEXTAUTH_SECRET` が十分に強力（32文字以上）
- [ ] データベース接続プールが適切に設定されている
- [ ] HTTPS環境でのcookie設定が有効（`secure: true`）
- [ ] 基本的な認証フローの手動テストを実施

---

## 1. 環境変数の設定

### 1.1 `.env`ファイルの作成

```bash
cd apps/web
cp .env.example .env
```

### 1.2 必須環境変数の設定

#### DATABASE_URL

Neon PostgreSQLの接続URLを設定します。**接続プール設定を含めることを推奨**します。

```env
DATABASE_URL="postgresql://user:password@ep-xxx.aws.neon.tech/meeting-transcriber?sslmode=require&connection_limit=10&pool_timeout=20"
```

**接続プール設定の説明:**
- `connection_limit=10`: 同時接続数の上限（デフォルト: 無制限）
- `pool_timeout=20`: 接続待機のタイムアウト秒数

#### NEXTAUTH_SECRET

セッション暗号化用の**強力なシークレットキー**を生成します（32文字以上推奨）。

```bash
# macOS/Linux
openssl rand -base64 32

# 出力例
# xYz12345AbCdEfGh67890IjKlMnOpQrS=
```

生成された値を`.env`に設定：

```env
NEXTAUTH_SECRET="xYz12345AbCdEfGh67890IjKlMnOpQrS="
```

#### NEXTAUTH_URL

アプリケーションのベースURLを設定します。

```env
# 開発環境
NEXTAUTH_URL="http://localhost:3000"

# 本番環境（例）
NEXTAUTH_URL="https://your-domain.com"
```

#### Google OAuth認証情報

次のセクションで取得します。

---

## 2. Google Cloud Console の設定

### 2.1 プロジェクトの作成

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 新しいプロジェクトを作成（または既存のプロジェクトを選択）

### 2.2 OAuth同意画面の設定

1. **APIs & Services** > **OAuth consent screen** に移動
2. **User Type** で **External** を選択（個人開発の場合）
3. 必須項目を入力：
   - アプリ名: `Meeting Transcriber`
   - ユーザーサポートメール: あなたのメールアドレス
   - デベロッパーの連絡先情報: あなたのメールアドレス
4. **Save and Continue** をクリック

### 2.3 OAuth 2.0クライアントIDの作成

1. **APIs & Services** > **Credentials** に移動
2. **Create Credentials** > **OAuth client ID** をクリック
3. **Application type** で **Web application** を選択
4. **Authorized redirect URIs** に以下を追加：

   ```
   # 開発環境
   http://localhost:3000/api/auth/callback/google

   # 本番環境（例）
   https://your-domain.com/api/auth/callback/google
   ```

5. **Create** をクリック
6. 表示された **Client ID** と **Client Secret** をコピー

### 2.4 環境変数に設定

`.env`ファイルに追加：

```env
GOOGLE_CLIENT_ID="123456789-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx"
```

---

## 3. データベースのセットアップ

### 3.1 Neon PostgreSQLの作成

1. [Neon](https://neon.tech/) にアクセスしてアカウント作成
2. 新しいプロジェクトを作成
3. 接続文字列をコピー（`postgresql://...`で始まるURL）
4. 接続プール設定を追加して`.env`に設定（上記参照）

### 3.2 Prismaマイグレーションの実行

```bash
# packages/databaseディレクトリで実行
cd packages/database

# マイグレーションファイルを生成
pnpm db:migrate

# または直接Prisma CLIを使用
pnpm prisma migrate dev --name init
```

**期待される出力:**
```
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "meeting-transcriber", schema "public" at "ep-xxx.aws.neon.tech:5432"

Applying migration `20240106000000_init`

The following migration(s) have been created and applied from new schema changes:

migrations/
  └─ 20240106000000_init/
    └─ migration.sql

✔ Generated Prisma Client (5.x.x) to ./node_modules/@prisma/client
```

### 3.3 マイグレーションの確認

```bash
# マイグレーション状態を確認
pnpm prisma migrate status

# データベーススキーマを確認
pnpm prisma studio
```

---

## 4. Cookie設定の確認

### 4.1 開発環境

開発環境（HTTP）では、以下の設定が自動的に適用されます：

```typescript
cookies: {
  sessionToken: {
    name: 'next-auth.session-token',
    options: {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: false, // HTTP環境
    },
  },
}
```

### 4.2 本番環境（HTTPS）

本番環境では、以下の設定が自動的に適用されます：

```typescript
cookies: {
  sessionToken: {
    name: '__Secure-next-auth.session-token', // __Secure-プレフィックス
    options: {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: true, // HTTPS必須
    },
  },
}
```

**重要:** 本番環境では必ずHTTPSを使用してください。`secure: true`の場合、HTTPでは認証が動作しません。

---

## 5. 開発サーバーの起動

```bash
# プロジェクトルートから
pnpm dev

# または、apps/webディレクトリで
cd apps/web
pnpm dev
```

ブラウザで http://localhost:3000 を開きます。

---

## 6. 認証フローのテスト

### 6.1 基本的な認証フロー

1. **ログインページにアクセス**
   - http://localhost:3000/login を開く
   - 「Googleでログイン」ボタンが表示される

2. **Googleログインを実行**
   - ボタンをクリック
   - Googleアカウント選択画面が表示される
   - アカウントを選択してログイン

3. **ダッシュボードへリダイレクト**
   - ログイン成功後、http://localhost:3000/dashboard にリダイレクトされる
   - ユーザー名とメールアドレスが表示される

4. **保護されたルートのテスト**
   - ログイン済み状態で http://localhost:3000/meetings にアクセス → 正常にアクセス可能
   - ログアウト後、http://localhost:3000/meetings にアクセス → `/login?callbackUrl=/meetings` にリダイレクト

5. **callbackUrl機能のテスト**
   - ログアウト状態で http://localhost:3000/settings にアクセス
   - `/login?callbackUrl=/settings` にリダイレクトされる
   - ログイン後、`/settings` に自動的にリダイレクトされる

6. **ログアウト**
   - 右上のユーザーメニューをクリック
   - 「ログアウト」を選択
   - ログインページにリダイレクトされる

### 6.2 エラーハンドリングのテスト

1. **アクセス拒否**
   - Google OAuth画面で「キャンセル」をクリック
   - `/login?error=AccessDenied` にリダイレクトされ、エラーメッセージが表示される

2. **不正な認証情報**
   - `.env`ファイルの`GOOGLE_CLIENT_ID`を間違った値に変更
   - ログインを試みる
   - `/login?error=OAuthSignInError` にリダイレクトされる

---

## 7. 本番環境へのデプロイ

### 7.1 環境変数の設定

Vercel/Netlify等のプラットフォームで、以下の環境変数を設定：

```env
DATABASE_URL="postgresql://user:password@ep-xxx.aws.neon.tech/meeting-transcriber?sslmode=require&connection_limit=10&pool_timeout=20"
NEXTAUTH_SECRET="強力なランダム文字列（32文字以上）"
NEXTAUTH_URL="https://your-domain.com"
GOOGLE_CLIENT_ID="本番用のClient ID"
GOOGLE_CLIENT_SECRET="本番用のClient Secret"
OPENAI_API_KEY="sk-..."
EXTENSION_JWT_SECRET="強力なランダム文字列（32文字以上）"
```

### 7.2 Google OAuth リダイレクトURIの追加

Google Cloud Consoleで、本番環境のリダイレクトURIを追加：

```
https://your-domain.com/api/auth/callback/google
```

### 7.3 データベースマイグレーションの実行

```bash
# 本番環境のDATABASE_URLを使用してマイグレーション
cd packages/database
pnpm prisma migrate deploy
```

---

## 8. トラブルシューティング

### 問題: ログイン後にエラーが発生する

**原因:** データベースマイグレーションが実行されていない

**解決策:**
```bash
cd packages/database
pnpm db:migrate
```

### 問題: 「NEXTAUTH_SECRET is not set」エラー

**原因:** 環境変数が設定されていない

**解決策:**
```bash
# .envファイルにNEXTAUTH_SECRETを追加
echo "NEXTAUTH_SECRET=$(openssl rand -base64 32)" >> apps/web/.env
```

### 問題: Google OAuth画面で「redirect_uri_mismatch」エラー

**原因:** Google Cloud Consoleで設定したリダイレクトURIが間違っている

**解決策:**
1. Google Cloud Consoleで設定を確認
2. 正しいリダイレクトURIを追加：
   - 開発: `http://localhost:3000/api/auth/callback/google`
   - 本番: `https://your-domain.com/api/auth/callback/google`

### 問題: セッションが保存されない

**原因:** データベース接続エラー

**解決策:**
1. `DATABASE_URL`が正しいか確認
2. データベースマイグレーションが完了しているか確認
3. Prisma Clientを再生成：
   ```bash
   cd packages/database
   pnpm prisma generate
   ```

### 問題: ユーザーアバター画像が表示されない

**原因:** Next.js Image最適化設定が不足

**解決策:**
`apps/web/next.config.mjs`に以下を追加（既に追加済み）：

```javascript
images: {
  remotePatterns: [
    {
      protocol: 'https',
      hostname: 'lh3.googleusercontent.com',
      pathname: '/**',
    },
  ],
},
```

---

## 9. セキュリティチェックリスト

### 開発環境

- [ ] `.env`ファイルが`.gitignore`に含まれている
- [ ] テスト用の認証情報を使用している

### 本番環境

- [ ] `NEXTAUTH_SECRET`が32文字以上のランダム文字列
- [ ] `EXTENSION_JWT_SECRET`が32文字以上のランダム文字列
- [ ] HTTPSを使用している（`secure: true`）
- [ ] 環境変数がセキュアに管理されている（Vercel/Netlify環境変数等）
- [ ] Google OAuth認証情報が本番用のもの
- [ ] データベースが本番用（Neon本番環境等）
- [ ] データベース接続プールが適切に設定されている

---

## 10. 参考リンク

- [NextAuth.js v5 ドキュメント](https://authjs.dev/)
- [Prisma ドキュメント](https://www.prisma.io/docs)
- [Neon PostgreSQL ドキュメント](https://neon.tech/docs)
- [Google OAuth 2.0 ドキュメント](https://developers.google.com/identity/protocols/oauth2)
- [Next.js App Router ドキュメント](https://nextjs.org/docs/app)

---

**セットアップが完了したら、Issue #6のPRをマージしてください！** 🎉
