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

## 参考リンク

- [Chrome Extension Manifest V3](https://developer.chrome.com/docs/extensions/mv3/)
- [tabCapture API](https://developer.chrome.com/docs/extensions/reference/tabCapture/)
- [Offscreen Documents](https://developer.chrome.com/docs/extensions/reference/offscreen/)
- [@crxjs/vite-plugin](https://crxjs.dev/vite-plugin/)
