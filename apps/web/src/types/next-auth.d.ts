import 'next-auth';

/**
 * NextAuth.jsの型定義を拡張
 * Session.user.idを追加
 */
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}
