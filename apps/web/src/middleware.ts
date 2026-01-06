/**
 * Next.js Middleware
 *
 * 認証が必要なルートを保護する
 * NextAuth.js v5のミドルウェアを使用
 */

import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { Session } from 'next-auth';

/**
 * 認証が必要なパスのパターン
 */
const protectedPaths = ['/dashboard', '/meetings', '/settings', '/transcriptions'];

/**
 * 公開パス（認証不要）のパターン
 */
const publicPaths = ['/login', '/api/auth'];

/**
 * ミドルウェア
 * すべてのリクエストに対して実行される
 */
const middleware: any = auth((req: any) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  // 公開パスは認証チェックをスキップ
  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));
  if (isPublicPath) {
    return NextResponse.next();
  }

  // 保護されたパスへのアクセス時に未認証の場合はログインページにリダイレクト
  const isProtectedPath = protectedPaths.some((path) => pathname.startsWith(path));
  if (isProtectedPath && !isLoggedIn) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ログイン済みでログインページにアクセスした場合はダッシュボードにリダイレクト
  if (pathname === '/login' && isLoggedIn) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
});

export default middleware;

/**
 * ミドルウェアを適用するパスの設定
 */
export const config = {
  matcher: [
    /*
     * 以下を除くすべてのパスにマッチ:
     * - _next/static (静的ファイル)
     * - _next/image (画像最適化ファイル)
     * - favicon.ico (ファビコン)
     * - public フォルダ内のファイル
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
