# Upstash Redis セットアップガイド

このガイドでは、Meeting Transcriberアプリケーションでレート制限機能を使用するためのUpstash Redisのセットアップ方法を説明します。

## 概要

Meeting Transcriberは、APIエンドポイントへの過度なリクエストを防ぐためにレート制限機能を実装しています。本番環境では、Upstash Redisを使用した分散レート制限を行います。

## 開発環境

開発環境では、Upstash Redisの設定は**必須ではありません**。環境変数が未設定の場合、自動的にインメモリフォールバックが使用されます。

ただし、以下の点に注意してください。

- インメモリレート制限は、アプリケーション再起動時にリセットされます
- 複数のサーバーインスタンス間で状態を共有できません
- 本番環境での使用は推奨されません

## 本番環境

本番環境では、Upstash Redisの設定を**強く推奨**します。

## Upstash Redisのセットアップ手順

### 1. Upstashアカウントの作成

1. [Upstash Console](https://console.upstash.com/)にアクセス
2. GitHubまたはGoogleアカウントでサインアップ
3. アカウントを作成（無料プランで開始可能）

### 2. Redisデータベースの作成

1. Upstash Consoleにログイン
2. 「Redis」タブを選択
3. 「Create Database」をクリック
4. 以下の設定を入力:
   - **Name**: `meeting-transcriber-ratelimit`（任意）
   - **Type**: `Regional`を選択
   - **Region**: 最も近いリージョンを選択（例: `ap-northeast-1` for Tokyo）
   - **Eviction**: `noeviction`を選択（推奨）
5. 「Create」をクリック

### 3. 認証情報の取得

データベースが作成されたら、以下の手順で認証情報を取得します。

1. 作成したデータベースをクリックして詳細ページを開く
2. 「REST API」タブを選択
3. 以下の情報をコピー:
   - **UPSTASH_REDIS_REST_URL**: `https://xxx-xxx-xxxxx.upstash.io`
   - **UPSTASH_REDIS_REST_TOKEN**: `AXXXXxxxxxxxxxxxxxxxxxxxxxxx`

### 4. 環境変数の設定

取得した認証情報を環境変数に設定します。

#### ローカル開発環境

`apps/web/.env.local`ファイルを作成し、以下を追加:

```env
UPSTASH_REDIS_REST_URL=https://xxx-xxx-xxxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXXXXxxxxxxxxxxxxxxxxxxxxxxx
```

#### 本番環境（Vercel）

1. Vercelプロジェクトの設定ページにアクセス
2. 「Environment Variables」セクションを開く
3. 以下の環境変数を追加:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
4. 「Production」環境にチェックを入れて保存

#### 本番環境（その他のプラットフォーム）

使用しているデプロイプラットフォームのドキュメントに従って、環境変数を設定してください。

## レート制限の設定

Meeting Transcriberでは、以下のエンドポイントにレート制限が適用されています。

### POST /api/upload

音声ファイルアップロード用エンドポイント

- **制限**: 10リクエスト/時間
- **識別子**: `upload:{userId}`
- **目的**: 過度なストレージ使用を防ぐ

### POST /api/transcription

音声文字起こし用エンドポイント

- **制限**: 5リクエスト/時間
- **識別子**: `transcription:{userId}`
- **目的**: OpenAI API使用量を制御し、コストを抑える

## 動作確認

### 開発環境での確認

1. アプリケーションを起動:

```bash
pnpm dev
```

2. コンソールログを確認:
   - Upstash Redisが設定されている場合: `✓ Upstash Redisレート制限を使用します`
   - 未設定の場合: `⚠️ Upstash Redis未設定。インメモリレート制限を使用します（本番環境では非推奨）`

### レート制限のテスト

APIエンドポイントに対して、制限を超えるリクエストを送信してテストできます。

```bash
# 10回以上リクエストを送信
for i in {1..12}; do
  curl -X POST http://localhost:3000/api/upload \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -F "file=@test.wav"
  echo "Request $i"
done
```

11回目以降のリクエストで`429 Too Many Requests`レスポンスが返されることを確認してください。

## レスポンスヘッダー

レート制限が適用されたエンドポイントは、以下のヘッダーを返します。

```http
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1609459200000
```

- `X-RateLimit-Limit`: 制限の上限値
- `X-RateLimit-Remaining`: 残りのリクエスト数
- `X-RateLimit-Reset`: 制限がリセットされる時刻（Unixタイムスタンプ、ミリ秒）

## トラブルシューティング

### エラー: `401 Unauthorized`

Upstash Redisの認証情報が正しくない可能性があります。

1. Upstash Consoleで認証情報を再確認
2. 環境変数が正しく設定されているか確認
3. アプリケーションを再起動

### エラー: `Connection timeout`

ネットワークの問題またはUpstash Redisのリージョン設定が不適切な可能性があります。

1. ネットワーク接続を確認
2. 最も近いリージョンに変更
3. ファイアウォール設定を確認

### レート制限が機能しない

1. Upstash Redisが正しく設定されているか確認
2. コンソールログでレート制限の使用状況を確認
3. ブラウザのキャッシュをクリアして再テスト

## 料金プラン

Upstashは、以下の料金プランを提供しています。

### 無料プラン

- **リクエスト**: 10,000リクエスト/日
- **ストレージ**: 256MB
- **帯域幅**: 200MB/日

Meeting Transcriberの開発環境やスモールスケールの本番環境には十分です。

### 有料プラン

大規模な本番環境では、使用量に応じて有料プランへのアップグレードを検討してください。

詳細は[Upstash Pricing](https://upstash.com/pricing)を参照してください。

## セキュリティのベストプラクティス

1. **環境変数を.gitignoreに追加**: `.env.local`ファイルを`.gitignore`に追加し、リポジトリにコミットしない
2. **認証情報のローテーション**: 定期的に認証情報をローテーションする
3. **最小権限の原則**: 必要最小限の権限のみを付与
4. **監視とアラート**: Upstash Consoleで使用状況を監視し、異常なトラフィックを検出

## 参考リンク

- [Upstash Documentation](https://docs.upstash.com/)
- [Upstash Rate Limiting](https://upstash.com/docs/redis/features/ratelimiting)
- [@upstash/ratelimit GitHub](https://github.com/upstash/ratelimit)
