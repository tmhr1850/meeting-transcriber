/**
 * ユーザーメニューコンポーネント
 *
 * ログイン済みユーザーの情報を表示し、
 * ログアウトやプロフィール設定へのリンクを提供
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { signOut } from 'next-auth/react';
import type { Session } from 'next-auth';

interface UserMenuProps {
  session: Session;
}

/**
 * ユーザーメニューコンポーネント
 */
export function UserMenu({ session }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // メニュー外をクリックしたら閉じる
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  /**
   * ログアウト処理
   */
  const handleSignOut = async () => {
    await signOut({
      callbackUrl: '/login',
    });
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 rounded-full bg-white p-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {session.user.image ? (
          <img
            className="h-8 w-8 rounded-full"
            src={session.user.image}
            alt={session.user.name || 'ユーザーアバター'}
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white">
            {session.user.name?.charAt(0).toUpperCase() || 'U'}
          </div>
        )}
      </button>

      {isOpen && (
        <div
          className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
          role="menu"
          aria-orientation="vertical"
        >
          <div className="px-4 py-3">
            <p className="text-sm font-medium text-gray-900">
              {session.user.name || 'ユーザー名なし'}
            </p>
            <p className="truncate text-sm text-gray-500">
              {session.user.email || 'メールアドレスなし'}
            </p>
          </div>

          <div className="border-t border-gray-100">
            <a
              href="/settings"
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              role="menuitem"
            >
              設定
            </a>
            <a
              href="/dashboard"
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              role="menuitem"
            >
              ダッシュボード
            </a>
            <a
              href="/meetings"
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              role="menuitem"
            >
              会議一覧
            </a>
          </div>

          <div className="border-t border-gray-100">
            <button
              onClick={handleSignOut}
              className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
              role="menuitem"
            >
              ログアウト
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
