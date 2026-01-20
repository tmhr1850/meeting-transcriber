# Meeting Transcriber - Chrome Extension

Manifest V3に準拠したChrome拡張機能です。Google Meet、Zoom、Microsoft Teamsの会議音声をリアルタイムで文字起こしし、AI要約を生成します。

## 技術スタック

- **Manifest Version**: V3
- **Build Tool**: Vite + @crxjs/vite-plugin
- **Framework**: React 18 + TypeScript
- **Styling**: Tailwind CSS
- **Audio Capture**: tabCapture API + Offscreen Document

## ディレクトリ構成

```
src/
├── background/
│   └── index.ts              # Service Worker
├── content/
│   ├── google-meet/
│   │   └── index.ts          # Google Meet用Content Script
│   └── shared/
│       └── styles.css        # 共通スタイル
├── popup/
│   ├── index.html
│   ├── main.tsx
│   ├── App.tsx
│   └── styles.css            # Popup UI
├── sidepanel/
│   ├── index.html
│   ├── main.tsx
│   ├── App.tsx
│   └── styles.css            # Side Panel UI
└── offscreen/
    ├── index.html
    └── audio-recorder.ts     # 音声録音処理
```

## 開発環境のセットアップ

### 1. 依存パッケージのインストール

```bash
pnpm install
```

### 2. アイコンの準備

`public/icons/` に以下のPNGファイルを配置してください:

- `icon-16.png` (16x16px)
- `icon-48.png` (48x48px)
- `icon-128.png` (128x128px)
- `icon-recording.png` (録音中用、128x128px)

推奨: 紫色(#7c3aed)の"M"ロゴ

### 3. 環境変数の設定

`.env` ファイルを作成して、以下の環境変数を設定してください:

```env
VITE_API_URL=http://localhost:3000/api
VITE_DASHBOARD_URL=http://localhost:3000
```

### 4. ビルド

```bash
# 開発モード（ファイル監視）
pnpm dev

# 本番ビルド
pnpm build
```

ビルド成果物は `dist/` ディレクトリに出力されます。

### 5. Chromeに拡張機能を読み込む

1. Chrome を開いて `chrome://extensions` にアクセス
2. 右上の「デベロッパーモード」を有効化
3. 「パッケージ化されていない拡張機能を読み込む」をクリック
4. `dist/` フォルダを選択

## 主要機能

### Background Service Worker

- 録音状態の管理
- tabCapture APIによる音声ストリーム取得
- Offscreen Documentの制御
- メッセージングハブ

### Content Script (Google Meet)

- Google Meetページに録音ボタンを注入
- 会議情報の取得
- リアルタイム文字起こし結果の表示

### Offscreen Document

- MediaRecorder APIによる音声録音
- 音声チャンクの生成
- APIへのチャンク送信

### Popup UI

- 拡張機能の状態表示
- ダッシュボードへのリンク

### Side Panel UI

- リアルタイム文字起こし表示
- 会議要約の表示
- 録音コントロール

## 使用する Chrome API

- `chrome.storage` - 認証トークン・設定の保存
- `chrome.tabs` - タブ情報の取得
- `chrome.tabCapture` - タブ音声のキャプチャ
- `chrome.offscreen` - Offscreen Documentの制御
- `chrome.sidePanel` - サイドパネルUI
- `chrome.runtime` - メッセージング

## 今後の実装予定

- [x] 基本構造の構築
- [ ] Google Meet用Content Script完全実装 (Issue #9)
- [ ] Zoom用Content Script (Issue #18)
- [ ] Teams用Content Script (Issue #19)
- [ ] Offscreen Document音声録音 (Issue #13)
- [ ] Service Worker完全実装 (Issue #12)
- [ ] Side Panel UI完全実装 (Issue #14)
- [ ] Popup UI完全実装 (Issue #15)
- [ ] 音声チャンク送信・API連携 (Issue #17)

## セキュリティ考慮事項

### 認証トークンの管理

拡張機能では、ユーザーの認証トークンを安全に管理する必要があります。

#### トークンストレージ

- **保存場所**: `chrome.storage.local`を使用
- **暗号化**: Chrome拡張のストレージは、OSレベルの暗号化で保護されます
  - Windows: DPAPI (Data Protection API)
  - macOS: Keychain
  - Linux: gnome-keyring / kwallet
- **アクセス制限**: 同じ拡張機能IDのみがアクセス可能

#### トークンの取り扱い

```typescript
// 認証トークンの保存
await chrome.storage.local.set({ authToken: token });

// 認証トークンの取得
const result = await chrome.storage.local.get('authToken');
const token = result.authToken;

// 認証トークンの削除（ログアウト時）
await chrome.storage.local.remove('authToken');
```

#### セキュリティベストプラクティス

1. **トークンのライフサイクル管理**
   - トークンの有効期限を確認
   - 期限切れトークンの自動削除
   - リフレッシュトークンの実装

2. **Content Scriptへのトークン露出を避ける**
   - Content Scriptは信頼できないページコンテキストで実行される
   - Background Service Workerでトークンを管理
   - Content ScriptはBackground経由でAPIリクエスト

3. **通信の暗号化**
   - APIとの通信は必ずHTTPS使用
   - `VITE_API_URL`は本番環境では必ずHTTPSを指定

4. **パーミッションの最小化**
   - 必要最小限のパーミッションのみ使用
   - `host_permissions`は特定のドメインに限定

5. **音声データの取り扱い**
   - 録音した音声データは処理後速やかに削除
   - ローカルストレージに音声データを保存しない
   - APIへの送信はHTTPS経由のみ

### Content Security Policy (CSP)

Manifest V3では、デフォルトで厳格なCSPが適用されます:

```
script-src 'self';
object-src 'self';
```

これにより、インラインスクリプトやeval()の使用が制限され、XSS攻撃のリスクが軽減されます。

### 外部リソースの検証

- `web_accessible_resources`は必要最小限に限定
- 信頼できないサードパーティスクリプトの読み込みを避ける

## 参考リンク

- [Chrome Extension Manifest V3](https://developer.chrome.com/docs/extensions/mv3/)
- [tabCapture API](https://developer.chrome.com/docs/extensions/reference/tabCapture/)
- [Offscreen Documents](https://developer.chrome.com/docs/extensions/reference/offscreen/)
- [@crxjs/vite-plugin](https://crxjs.dev/vite-plugin/)
- [Chrome Extension Security](https://developer.chrome.com/docs/extensions/mv3/security/)
