/**
 * ユーザー情報
 */
export interface User {
  /** ユーザーID */
  id: string;
  /** メールアドレス */
  email: string;
  /** 表示名 */
  name?: string;
  /** プロフィール画像URL */
  image?: string;
  /** 作成日時 (ISO 8601形式) */
  createdAt: string;
  /** 更新日時 (ISO 8601形式) */
  updatedAt: string;
}
