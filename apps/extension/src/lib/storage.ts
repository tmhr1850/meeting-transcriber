import { ExtensionState, User, Meeting } from '@meeting-transcriber/shared';

/**
 * Chrome Storage APIのキー定数
 */
const STORAGE_KEYS = {
  STATE: 'extensionState',
  USER: 'user',
  AUTH_TOKEN: 'authToken',
  SETTINGS: 'settings',
  CURRENT_MEETING: 'currentMeeting',
} as const;

/**
 * 初期状態
 */
const initialState: ExtensionState = {
  isRecording: false,
  currentTabId: null,
  currentMeeting: null,
  recordingStartedAt: null,
};

/**
 * 拡張機能の状態を取得
 * @returns 現在の状態（存在しない場合は初期状態）
 */
export async function getState(): Promise<ExtensionState> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.STATE);
    return result[STORAGE_KEYS.STATE] || initialState;
  } catch (error) {
    console.error('[Storage] 状態の取得に失敗:', error);
    return initialState;
  }
}

/**
 * 拡張機能の状態を更新（部分更新）
 * @param partial - 更新する状態の一部
 */
export async function setState(partial: Partial<ExtensionState>): Promise<void> {
  try {
    const current = await getState();
    const newState = { ...current, ...partial };
    await chrome.storage.local.set({
      [STORAGE_KEYS.STATE]: newState,
    });
  } catch (error) {
    console.error('[Storage] 状態の更新に失敗:', error);
    throw error;
  }
}

/**
 * 拡張機能の状態を初期状態にリセット
 */
export async function resetState(): Promise<void> {
  try {
    await chrome.storage.local.set({
      [STORAGE_KEYS.STATE]: initialState,
    });
  } catch (error) {
    console.error('[Storage] 状態のリセットに失敗:', error);
    throw error;
  }
}

/**
 * ユーザー情報を取得
 * @returns ユーザー情報（存在しない場合はnull）
 */
export async function getUser(): Promise<User | null> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.USER);
    return result[STORAGE_KEYS.USER] || null;
  } catch (error) {
    console.error('[Storage] ユーザー情報の取得に失敗:', error);
    return null;
  }
}

/**
 * ユーザー情報を保存または削除
 * @param user - ユーザー情報（nullの場合は削除）
 */
export async function setUser(user: User | null): Promise<void> {
  try {
    if (user) {
      await chrome.storage.local.set({ [STORAGE_KEYS.USER]: user });
    } else {
      await chrome.storage.local.remove(STORAGE_KEYS.USER);
    }
  } catch (error) {
    console.error('[Storage] ユーザー情報の保存に失敗:', error);
    throw error;
  }
}

/**
 * 認証トークンを取得
 * @returns 認証トークン（存在しない場合はnull）
 */
export async function getAuthToken(): Promise<string | null> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.AUTH_TOKEN);
    return result[STORAGE_KEYS.AUTH_TOKEN] || null;
  } catch (error) {
    console.error('[Storage] 認証トークンの取得に失敗:', error);
    return null;
  }
}

/**
 * 認証トークンを保存または削除
 * @param token - 認証トークン（nullの場合は削除）
 */
export async function setAuthToken(token: string | null): Promise<void> {
  try {
    if (token) {
      await chrome.storage.local.set({ [STORAGE_KEYS.AUTH_TOKEN]: token });
    } else {
      await chrome.storage.local.remove(STORAGE_KEYS.AUTH_TOKEN);
    }
  } catch (error) {
    console.error('[Storage] 認証トークンの保存に失敗:', error);
    throw error;
  }
}

/**
 * 拡張機能の設定
 */
export interface Settings {
  /** 自動録音を有効にするか */
  autoRecord: boolean;
  /** 使用言語 */
  language: 'ja' | 'en';
  /** 音声チャンクの長さ（ミリ秒） */
  chunkDuration: number;
}

/**
 * デフォルト設定
 */
const defaultSettings: Settings = {
  autoRecord: false,
  language: 'ja',
  chunkDuration: 5000,
};

/**
 * 設定を取得
 * @returns 現在の設定（存在しない場合はデフォルト設定）
 */
export async function getSettings(): Promise<Settings> {
  try {
    const result = await chrome.storage.sync.get(STORAGE_KEYS.SETTINGS);
    return { ...defaultSettings, ...result[STORAGE_KEYS.SETTINGS] };
  } catch (error) {
    console.error('[Storage] 設定の取得に失敗:', error);
    return defaultSettings;
  }
}

/**
 * 設定を更新（部分更新）
 * @param settings - 更新する設定の一部
 */
export async function setSettings(settings: Partial<Settings>): Promise<void> {
  try {
    const current = await getSettings();
    const newSettings = { ...current, ...settings };
    await chrome.storage.sync.set({
      [STORAGE_KEYS.SETTINGS]: newSettings,
    });
  } catch (error) {
    console.error('[Storage] 設定の更新に失敗:', error);
    throw error;
  }
}

/**
 * 状態変更リスナーを登録
 * @param callback - 状態変更時に呼ばれるコールバック関数
 * @returns リスナーを解除する関数
 */
export function onStateChange(
  callback: (newState: ExtensionState, oldState: ExtensionState) => void
): () => void {
  const listener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
    if (STORAGE_KEYS.STATE in changes) {
      const change = changes[STORAGE_KEYS.STATE];
      callback(
        change.newValue || initialState,
        change.oldValue || initialState
      );
    }
  };

  chrome.storage.local.onChanged.addListener(listener);

  // リスナー解除用の関数を返す
  return () => {
    chrome.storage.local.onChanged.removeListener(listener);
  };
}

/**
 * ユーザー情報変更リスナーを登録
 * @param callback - ユーザー情報変更時に呼ばれるコールバック関数
 * @returns リスナーを解除する関数
 */
export function onUserChange(
  callback: (newUser: User | null, oldUser: User | null) => void
): () => void {
  const listener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
    if (STORAGE_KEYS.USER in changes) {
      const change = changes[STORAGE_KEYS.USER];
      callback(
        change.newValue || null,
        change.oldValue || null
      );
    }
  };

  chrome.storage.local.onChanged.addListener(listener);

  return () => {
    chrome.storage.local.onChanged.removeListener(listener);
  };
}

/**
 * 設定変更リスナーを登録
 * @param callback - 設定変更時に呼ばれるコールバック関数
 * @returns リスナーを解除する関数
 */
export function onSettingsChange(
  callback: (newSettings: Settings, oldSettings: Settings) => void
): () => void {
  const listener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
    if (STORAGE_KEYS.SETTINGS in changes) {
      const change = changes[STORAGE_KEYS.SETTINGS];
      callback(
        { ...defaultSettings, ...change.newValue },
        { ...defaultSettings, ...change.oldValue }
      );
    }
  };

  chrome.storage.sync.onChanged.addListener(listener);

  return () => {
    chrome.storage.sync.onChanged.removeListener(listener);
  };
}
