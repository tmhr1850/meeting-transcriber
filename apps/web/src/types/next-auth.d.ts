/**
 * NextAuth.js 型定義の拡張
 *
 * セッションとJWTトークンの型を拡張して、
 * アプリケーション固有の情報を含められるようにする
 */

import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  /**
   * セッション型の拡張
   */
  interface Session {
    user: {
      /** ユーザーID */
      id: string;
    } & DefaultSession['user'];
  }

  /**
   * ユーザー型の拡張
   */
  interface User {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    emailVerified?: Date | null;
  }
}

declare module 'next-auth/jwt' {
  /**
   * JWT型の拡張
   */
  interface JWT {
    /** ユーザーID */
    id: string;
  }
}
