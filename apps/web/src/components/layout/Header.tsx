'use client';

import Link from 'next/link';
import { Bell } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { UserMenu } from './UserMenu';

/**
 * ヘッダーコンポーネント
 * ロゴ、通知、ユーザーメニューを表示
 */
export function Header() {
  const { data: session } = useSession();

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      {/* Logo */}
      <Link href="/dashboard" className="flex items-center gap-2">
        <span className="text-xl font-bold text-purple-600">Meeting Transcriber</span>
      </Link>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button
          type="button"
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
          aria-label="通知"
        >
          <Bell className="h-5 w-5" />
        </button>

        {/* User Menu */}
        {session?.user && <UserMenu user={session.user} />}
      </div>
    </header>
  );
}
