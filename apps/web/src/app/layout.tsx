/**
 * ルートレイアウト
 *
 * すべてのページに共通のレイアウト
 */

import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Meeting Transcriber',
  description: '会議の文字起こしと要約をAIで自動化',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
