import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from './prisma';

/**
 * 環境変数の検証
 * 本番環境では必須の環境変数が設定されていることを確認
 */
const hasGoogleCredentials =
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET;

if (!hasGoogleCredentials) {
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
const nextAuthConfig = NextAuth({
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
      if (session?.user && user?.id) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
});

export const handlers: typeof nextAuthConfig.handlers = nextAuthConfig.handlers;
export const signIn: typeof nextAuthConfig.signIn = nextAuthConfig.signIn;
export const signOut: typeof nextAuthConfig.signOut = nextAuthConfig.signOut;
export const auth: typeof nextAuthConfig.auth = nextAuthConfig.auth;
