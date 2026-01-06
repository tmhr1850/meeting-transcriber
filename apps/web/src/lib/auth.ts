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

import NextAuth, { type DefaultSession } from 'next-auth';
import type { Session } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import type { User } from '@prisma/client';
import { prisma } from './prisma';

/**
 * 型定義の拡張
 * セッションにユーザーIDを含める
 */
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
    } & DefaultSession['user'];
  }
}

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
export const { handlers, signIn, signOut, auth } = NextAuth({
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
    session: async ({ session, user }: { session: Session; user: User }) => {
      if (session?.user) {
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

export const { GET, POST } = handlers;
