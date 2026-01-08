/**
 * ログインページ
 *
 * Google OAuthを使用してログインする
 * Next.js 14 App Router + Server Actions
 */

import { signIn } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AuthError } from 'next-auth';

/**
 * Google OAuth ログインアクション
 *
 * @param formData - フォームデータ（callbackUrlを含む）
 */
async function handleGoogleSignIn(formData: FormData) {
  'use server';

  const callbackUrl = formData.get('callbackUrl') as string | null;

  try {
    await signIn('google', {
      redirectTo: callbackUrl || '/dashboard',
    });
  } catch (error) {
    // NextAuthがリダイレクトをスローするため、それ以外のエラーのみ処理
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'AccessDenied':
          return redirect('/login?error=AccessDenied');
        case 'OAuthSignInError':
          return redirect('/login?error=OAuthSignInError');
        default:
          return redirect('/login?error=Unknown');
      }
    }
    throw error;
  }
}

/**
 * ログインページコンポーネント
 */
export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; callbackUrl?: string };
}) {
  const errorMessages: Record<string, string> = {
    AccessDenied: 'アクセスが拒否されました。もう一度お試しください。',
    OAuthSignInError: 'Google認証中にエラーが発生しました。もう一度お試しください。',
    Unknown: '予期しないエラーが発生しました。もう一度お試しください。',
  };

  const error = searchParams.error ? errorMessages[searchParams.error] : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Meeting Transcriber
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            会議の文字起こしと要約をAIで自動化
          </p>
        </div>

        <div className="mt-8 space-y-6">
          {error && (
            <div
              className="rounded-md bg-red-50 p-4 text-sm text-red-800"
              role="alert"
            >
              {error}
            </div>
          )}

          <form action={handleGoogleSignIn}>
            {searchParams.callbackUrl && (
              <input type="hidden" name="callbackUrl" value={searchParams.callbackUrl} />
            )}
            <button
              type="submit"
              className="group relative flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <svg
                  className="h-5 w-5 text-gray-500"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
              </span>
              Googleでログイン
            </button>
          </form>

          <div className="mt-6">
            <p className="text-center text-xs text-gray-500">
              ログインすることで、
              <a href="/terms" className="font-medium text-indigo-600 hover:text-indigo-500">
                利用規約
              </a>
              と
              <a href="/privacy" className="font-medium text-indigo-600 hover:text-indigo-500">
                プライバシーポリシー
              </a>
              に同意したものとみなされます。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
