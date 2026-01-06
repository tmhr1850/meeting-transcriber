/**
 * NextAuth.js v5 設定
 *
 * Google OAuthを使用した認証設定
 * Prisma Adapterを使用してデータベースと連携
 */

import NextAuth, { DefaultSession, type NextAuthConfig } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
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
 * NextAuth設定
 */
const config = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
        },
      },
    }),
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
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
    /**
     * 認証コールバック
     * 認証が成功した場合はtrueを返す
     */
    async authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const isOnAuthPage = request.nextUrl.pathname.startsWith('/login');

      if (isOnAuthPage) {
        if (isLoggedIn) {
          return Response.redirect(new URL('/dashboard', request.nextUrl));
        }
        return true;
      }

      return isLoggedIn;
    },
  },
  session: {
    strategy: 'database' as const,
    maxAge: 30 * 24 * 60 * 60, // 30日
    updateAge: 24 * 60 * 60, // 24時間
  },
  debug: process.env.NODE_ENV === 'development',
} satisfies NextAuthConfig;

const nextAuth = NextAuth(config);

export const handlers = nextAuth.handlers;
export const auth = nextAuth.auth;
export const signIn = nextAuth.signIn;
export const signOut = nextAuth.signOut;
export const { GET, POST } = handlers;
