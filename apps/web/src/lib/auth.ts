import NextAuth from 'next-auth';
import type { Session } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import type { User } from '@prisma/client';
import { prisma } from './prisma';

/**
 * 環境変数の検証
 * 本番環境では必須の環境変数が設定されていることを確認
 */
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Google OAuth credentials are required in production');
  }
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
export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    session: async ({ session, user }: { session: Session; user: User }) => {
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
