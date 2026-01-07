/**
 * グローバル型定義
 * Vite環境変数とChrome拡張APIの型定義
 */

/// <reference types="vite/client" />
/// <reference types="chrome" />

/**
 * Vite環境変数の型拡張
 */
interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
