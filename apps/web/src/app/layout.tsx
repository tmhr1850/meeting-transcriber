/**
 * ルートレイアウト
 *
 * すべてのページに共通のレイアウト
 */

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

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
      <body className={inter.className}>{children}</body>
    </html>
  );
}
