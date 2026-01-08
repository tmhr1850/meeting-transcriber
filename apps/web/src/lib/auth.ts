/**
 * NextAuth.js v5 設定
 *
 * Google OAuthを使用した認証設定
 * Prisma Adapterを使用してデータベースと連携
 *
 * 環境変数:
 * - GOOGLE_CLIENT_ID
 * - GOOGLE_CLIENT_SECRET
 * - NEXTAUTH_SECRET
 */

import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@meeting-transcriber/database';

/**
 * 環境変数の検証
 * 本番環境では必須の環境変数が設定されていることを確認
 */
const hasGoogleCredentials =
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET;

if (!hasGoogleCredentials) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Google OAuth credentials are required in production');
  }
  console.warn(
    'Warning: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are not set. Authentication will not work.'
  );
}

/**
 * NextAuth.js v5設定
 */
const nextAuth = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    // 環境変数が設定されている場合のみGoogleプロバイダーを追加
    ...(hasGoogleCredentials
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            authorization: {
              params: {
                prompt: 'consent',
                access_type: 'offline',
                response_type: 'code',
              },
            },
          }),
        ]
      : []),
  ],
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    /**
     * セッションコールバック
     * セッションにユーザーIDを追加
     */
    session: async ({ session, user }) => {
      if (session?.user && user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  session: {
    strategy: 'database' as const,
    maxAge: 30 * 24 * 60 * 60, // 30日
    updateAge: 24 * 60 * 60, // 24時間
  },
  debug: process.env.NODE_ENV === 'development',
});

export const handlers = nextAuth.handlers;
export const signIn = nextAuth.signIn;
export const signOut = nextAuth.signOut;
export const auth = nextAuth.auth;
export const { GET, POST } = handlers;
