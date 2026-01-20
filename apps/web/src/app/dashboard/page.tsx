/**
 * ダッシュボードページ
 *
 * ログイン後のメインページ
 * ユーザー情報とメニューを表示
 */

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { UserMenu } from '@/components/layout/UserMenu';

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-gray-900">Meeting Transcriber</h1>
          <UserMenu user={session.user} />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">
            ようこそ、{session.user.name}さん
          </h2>
          <p className="mt-2 text-gray-600">
            会議の文字起こしと要約を始めましょう
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="text-lg font-semibold text-gray-900">新しい会議</h3>
            <p className="mt-2 text-sm text-gray-600">
              音声ファイルをアップロードして文字起こし
            </p>
            <a
              href="/upload"
              className="mt-4 inline-block rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              ファイルをアップロード
            </a>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="text-lg font-semibold text-gray-900">過去の会議</h3>
            <p className="mt-2 text-sm text-gray-600">
              文字起こしした会議の履歴を確認
            </p>
            <a
              href="/meetings"
              className="mt-4 inline-block rounded-md bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
            >
              一覧を見る
            </a>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="text-lg font-semibold text-gray-900">設定</h3>
            <p className="mt-2 text-sm text-gray-600">
              アカウント設定やAPIキーの管理
            </p>
            <a
              href="/settings"
              className="mt-4 inline-block rounded-md bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
            >
              設定を開く
            </a>
          </div>
        </div>

        <div className="mt-8 rounded-lg bg-blue-50 p-6">
          <h3 className="text-lg font-semibold text-blue-900">
            Chrome拡張機能のインストール
          </h3>
          <p className="mt-2 text-sm text-blue-700">
            会議をリアルタイムで文字起こしするには、Chrome拡張機能をインストールしてください。
          </p>
          <button className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            拡張機能をインストール
          </button>
        </div>
      </main>
    </div>
  );
}
