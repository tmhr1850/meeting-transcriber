/**
 * 認証レイアウト
 *
 * ログインページなど、認証関連ページのレイアウト
 * シンプルなレイアウトで、ヘッダーやフッターは含まない
 */

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ログイン | Meeting Transcriber',
  description: '会議の文字起こしと要約をAIで自動化',
};

/**
 * 認証レイアウトコンポーネント
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  );
}
