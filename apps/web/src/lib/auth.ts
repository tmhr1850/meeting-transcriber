import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from './prisma';

/**
 * 環境変数の検証
 * 開発環境ではモックプロバイダーを使用、本番環境では実際の認証情報が必要
 */
const hasGoogleCredentials =
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET;

if (!hasGoogleCredentials) {
  // ビルド時や開発環境では警告のみ表示
  // 実際のランタイムでの認証時にエラーが発生
  console.warn(
    'Warning: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are not set. Authentication will not work.'
  );
}

/**
 * NextAuth.js v5設定
 * 環境変数:
 * - GOOGLE_CLIENT_ID
 * - GOOGLE_CLIENT_SECRET
 * - NEXTAUTH_SECRET
 */
const authConfig = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    // 環境変数が設定されている場合のみGoogleプロバイダーを追加
    ...(hasGoogleCredentials
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
  ],
  callbacks: {
    session: async ({ session, user }) => {
      if (session?.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
});

export const handlers = authConfig.handlers;
export const signIn: typeof authConfig.signIn = authConfig.signIn;
export const signOut: typeof authConfig.signOut = authConfig.signOut;
export const auth = authConfig.auth;
