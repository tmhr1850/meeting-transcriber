# 環境変数設定ガイド

このガイドでは、Meeting Transcriberの環境変数の設定方法を詳しく説明します。

## セットアップの流れ

1. `.env.example`ファイルをコピー
2. 各サービスのAPIキーを取得
3. `.env`ファイルに値を設定
4. アプリケーションを起動

## 1. .envファイルの作成

```bash
cp apps/web/.env.example apps/web/.env
```

## 2. 環境変数の設定

### DATABASE_URL（必須）

PostgreSQLデータベース接続文字列です。Neon PostgreSQLを使用します。

**取得方法:**

1. [Neon Console](https://console.neon.tech)にアクセス
2. 「Create Project」をクリック
3. プロジェクト名を「meeting-transcriber」に設定
4. リージョンを選択（推奨: Asia Pacific (Singapore)）
5. 作成後、「Connection String」をコピー
6. 末尾に`?sslmode=require`を追加

**例:**
```env
DATABASE_URL=postgresql://username:password@ep-blue-smoke-a1fbaqt8-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
```

**注意事項:**
- Neon無料プランの制限: 0.5GB、10時間のアクティブ時間/月
- 本番環境では有料プランの使用を推奨

---

### NEXTAUTH_SECRET（必須）

NextAuth.jsのセッション署名に使用するシークレットキーです。

**生成方法:**

```bash
openssl rand -base64 32
```

**例:**
```env
NEXTAUTH_SECRET=I6qTtANVh2bVzWiMltkPGAHr9DlqxKidf9XLaUWbi1I=
```

**注意事項:**
- 本番環境と開発環境で異なる値を使用してください
- 絶対に公開リポジトリにコミットしないでください

---

### NEXTAUTH_URL（必須）

アプリケーションのベースURLです。

**開発環境:**
```env
NEXTAUTH_URL=http://localhost:3000
```

**本番環境:**
```env
NEXTAUTH_URL=https://your-domain.com
```

---

### GOOGLE_CLIENT_ID、GOOGLE_CLIENT_SECRET（必須）

Google OAuth認証に使用するクライアント情報です。

**取得方法:**

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. プロジェクトを作成（まだない場合）
3. 「APIとサービス」→「認証情報」に移動
4. 「認証情報を作成」→「OAuth 2.0 クライアントID」をクリック
5. アプリケーションの種類: 「ウェブアプリケーション」を選択
6. 名前を入力（例: Meeting Transcriber）
7. 承認済みのリダイレクトURIに以下を追加:
   - 開発環境: `http://localhost:3000/api/auth/callback/google`
   - 本番環境: `https://your-domain.com/api/auth/callback/google`
8. 「作成」をクリック
9. 表示された「クライアントID」と「クライアントシークレット」をコピー

**例:**
```env
GOOGLE_CLIENT_ID=436600938334-xxxxxxxxxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx
```

**OAuth同意画面の設定:**

初回セットアップ時は、OAuth同意画面の設定も必要です:

1. 「OAuth同意画面」タブに移動
2. ユーザータイプ: 「外部」を選択
3. アプリ名、ユーザーサポートメール、デベロッパーの連絡先情報を入力
4. スコープの追加:
   - `userinfo.email`
   - `userinfo.profile`
5. テストユーザーを追加（開発中のみ）

---

### OPENAI_API_KEY（必須）

OpenAI APIのAPIキーです。Whisper API（文字起こし）とGPT-4（要約）に使用します。

**取得方法:**

1. [OpenAI Platform](https://platform.openai.com/)にアクセス
2. サインアップまたはログイン
3. 右上のアカウントメニューから「API keys」を選択
4. 「Create new secret key」をクリック
5. 名前を入力（例: meeting-transcriber）
6. 権限を選択（All推奨）
7. APIキーをコピー（⚠️ 一度しか表示されません）

**例:**
```env
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**重要な制限事項:**

| 項目 | 制限 |
|------|------|
| **ファイルサイズ** | **最大25MB**（Whisper API） |
| 料金（Whisper） | $0.006/分 |
| 料金（GPT-4） | 入力: $0.03/1K tokens、出力: $0.06/1K tokens |
| レート制限 | 組織のティアにより異なる |

**レート制限の確認:**

レート制限は組織のティア（Free, Tier 1-5）によって異なります:
- [Rate Limitsページ](https://platform.openai.com/account/limits)で確認可能
- 無料プランの場合、リクエスト数が制限されます
- 本番環境では有料プランの使用を推奨

**注意事項:**
- APIキーは絶対に公開しないでください
- 定期的にキーをローテーションしてください
- 使用量を監視し、予期しない課金を防いでください
- 環境変数が設定されていない場合、アプリケーションはエラーを返します

---

### EXTENSION_JWT_SECRET（必須）

Chrome拡張機能との通信に使用するJWT署名キーです。

**生成方法:**

```bash
openssl rand -base64 32
```

**例:**
```env
EXTENSION_JWT_SECRET=mu03NvnlosGE8cJPAOLfc/RXisrZ6nfos6Xx2ECXGn4=
```

**注意事項:**
- `NEXTAUTH_SECRET`とは異なる値を使用してください
- 拡張機能を使用しない場合でも、設定が必要です

---

## 3. 設定の確認

環境変数を設定後、以下のコマンドで確認できます:

```bash
cd apps/web
node -e "console.log(process.env.OPENAI_API_KEY ? '✓ OPENAI_API_KEY設定済み' : '✗ OPENAI_API_KEY未設定')"
```

## 4. データベースのセットアップ

環境変数を設定したら、Prismaマイグレーションを実行します:

```bash
cd apps/web
pnpm prisma migrate dev
pnpm prisma generate
```

成功すると、以下のメッセージが表示されます:

```
✔ Generated Prisma Client
```

## 5. 開発サーバーの起動

```bash
pnpm dev
```

成功すると:

```
▲ Next.js 14.x.x
- Local:        http://localhost:3000
- ready in xxx ms
```

http://localhost:3000 にアクセスして動作確認してください。

---

## トラブルシューティング

### エラー: "OPENAI_API_KEY環境変数が設定されていません"

**原因:** `.env`ファイルに`OPENAI_API_KEY`が設定されていない、または値が間違っています。

**解決方法:**
1. `apps/web/.env`ファイルを確認
2. `OPENAI_API_KEY=sk-proj-...`の形式で設定されているか確認
3. APIキーが有効か確認（[API Keysページ](https://platform.openai.com/api-keys)）

### エラー: "Database connection failed"

**原因:** `DATABASE_URL`が間違っているか、データベースが起動していません。

**解決方法:**
1. Neon Consoleでデータベースが起動しているか確認
2. `DATABASE_URL`の形式を確認（`postgresql://...?sslmode=require`）
3. ネットワーク接続を確認

### エラー: "Invalid Google OAuth configuration"

**原因:** Google OAuth設定が間違っているか、リダイレクトURIが設定されていません。

**解決方法:**
1. Google Cloud Consoleで認証情報を確認
2. リダイレクトURIに`http://localhost:3000/api/auth/callback/google`が追加されているか確認
3. OAuth同意画面が設定されているか確認

### エラー: "413 Payload Too Large"

**原因:** アップロードしようとしているファイルが25MBを超えています。

**解決方法:**
- ファイルサイズを25MB以下に圧縮
- または、ファイルを分割してアップロード
- Whisper APIの制限のため、現在25MB超のファイルはサポートされていません

---

## セキュリティのベストプラクティス

1. **環境変数を公開しない**
   - `.env`ファイルは`.gitignore`に追加されています
   - 絶対にコミットしないでください

2. **APIキーを定期的にローテーション**
   - 少なくとも3ヶ月に1回はAPIキーを更新
   - 漏洩の疑いがある場合は即座に無効化

3. **本番環境と開発環境で異なる値を使用**
   - データベース、APIキー、シークレットキーは全て別の値を使用

4. **レート制限を実装**
   - ⚠️ 現在未実装（Issue #XXで対応予定）
   - 本番環境では必ず実装してください

5. **環境変数の管理**
   - Vercelなどのホスティングサービスでは、管理画面から環境変数を設定
   - ローカルでは`.env`ファイルで管理

---

## 参考リンク

- [Neon PostgreSQL Documentation](https://neon.tech/docs)
- [NextAuth.js Configuration](https://authjs.dev/getting-started/installation)
- [Google Cloud Console](https://console.cloud.google.com/)
- [OpenAI Platform](https://platform.openai.com/)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
