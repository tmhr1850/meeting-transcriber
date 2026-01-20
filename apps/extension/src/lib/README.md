# Storage ユーティリティ

Chrome Storage APIを使用した状態管理ユーティリティ。

## 概要

このモジュールは、Chrome拡張機能の状態、ユーザー情報、認証トークン、設定を管理するための便利な関数を提供します。

## インポート

```typescript
import {
  getState,
  setState,
  resetState,
  getUser,
  setUser,
  getAuthToken,
  setAuthToken,
  getSettings,
  setSettings,
  onStateChange,
  onUserChange,
  onSettingsChange,
  type Settings,
} from './lib/storage';
```

## 使用方法

### 状態管理 (chrome.storage.local)

```typescript
// 状態を取得
const state = await getState();
console.log(state.isRecording); // false

// 状態を更新（部分更新）
await setState({
  isRecording: true,
  currentTabId: 123,
});

// 状態をリセット
await resetState();

// 状態変更を監視
const unsubscribe = onStateChange((newState, oldState) => {
  console.log('状態が変更されました:', newState);
});

// 監視を解除
unsubscribe();
```

### ユーザー情報管理 (chrome.storage.local)

```typescript
// ユーザー情報を取得
const user = await getUser();
if (user) {
  console.log(user.email, user.name);
}

// ユーザー情報を保存
await setUser({
  id: 'user-123',
  email: 'user@example.com',
  name: 'John Doe',
  image: 'https://example.com/avatar.jpg',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

// ユーザー情報を削除（ログアウト）
await setUser(null);

// ユーザー情報変更を監視
const unsubscribeUser = onUserChange((newUser, oldUser) => {
  if (newUser) {
    console.log('ログインしました:', newUser.email);
  } else {
    console.log('ログアウトしました');
  }
});
```

### 認証トークン管理 (chrome.storage.local)

```typescript
// トークンを取得
const token = await getAuthToken();

// トークンを保存
await setAuthToken('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');

// トークンを削除
await setAuthToken(null);
```

### 設定管理 (chrome.storage.sync)

```typescript
// 設定を取得
const settings = await getSettings();
console.log(settings.language); // 'ja'
console.log(settings.chunkDuration); // 5000

// 設定を更新（部分更新）
await setSettings({
  autoRecord: true,
  language: 'en',
});

// 設定変更を監視
const unsubscribeSettings = onSettingsChange((newSettings, oldSettings) => {
  console.log('設定が変更されました:', newSettings);
});
```

## 型定義

### ExtensionState

```typescript
interface ExtensionState {
  isRecording: boolean;
  currentTabId: number | null;
  currentMeeting: Meeting | null;
  recordingStartedAt: number | null;
}
```

### User

```typescript
interface User {
  id: string;
  email: string;
  name?: string;
  image?: string;
  createdAt: string;
  updatedAt: string;
}
```

### Settings

```typescript
interface Settings {
  autoRecord: boolean;
  language: 'ja' | 'en';
  chunkDuration: number;
}
```

## ストレージの種類

- **chrome.storage.local**: 状態、ユーザー情報、認証トークン（デバイス固有）
- **chrome.storage.sync**: 設定（複数デバイス間で同期）

## エラーハンドリング

全ての関数は適切なエラーハンドリングを実装しており、エラーが発生した場合は:

1. コンソールにエラーログを出力
2. 読み取り関数はデフォルト値を返す
3. 書き込み関数は例外をスロー

```typescript
try {
  await setState({ isRecording: true });
} catch (error) {
  console.error('状態の保存に失敗しました', error);
}
```

## 注意事項

- 状態変更リスナーは使用後に必ず解除してください（メモリリーク防止）
- chrome.storage.syncには容量制限があります（設定のみに使用）
- 認証トークンは機密情報として扱い、適切に管理してください
