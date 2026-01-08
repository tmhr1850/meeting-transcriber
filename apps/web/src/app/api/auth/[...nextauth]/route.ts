/**
 * NextAuth.js API Route Handler
 *
 * /api/auth/* のすべてのリクエストを処理
 * - /api/auth/signin - ログイン
 * - /api/auth/signout - ログアウト
 * - /api/auth/callback/* - OAuthコールバック
 * - /api/auth/session - セッション取得
 * - /api/auth/providers - プロバイダー一覧
 */

export { GET, POST } from '@/lib/auth';
