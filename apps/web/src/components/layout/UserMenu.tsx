/**
 * ユーザーメニューコンポーネント
 *
 * ログイン済みユーザーの情報を表示し、
 * ログアウトやプロフィール設定へのリンクを提供
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { signOut } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import type { Session } from 'next-auth';
import { LogOut, User, Settings } from 'lucide-react';

interface UserMenuProps {
  user: Session['user'];
}

/**
 * ユーザーメニューコンポーネント
 */
export function UserMenu({ user }: UserMenuProps) {
  const session = { user } as Session;
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
   * エラーハンドリングを含む
   */
  const handleSignOut = async () => {
    try {
      await signOut({
        callbackUrl: '/login',
      });
    } catch (error) {
      console.error('ログアウトに失敗しました:', error);
      // TODO: トースト通知などでユーザーに通知
      alert('ログアウトに失敗しました。もう一度お試しください。');
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 rounded-full bg-white p-1 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {session.user.image ? (
          <Image
            src={session.user.image}
            alt={session.user.name || 'ユーザーアバター'}
            width={32}
            height={32}
            className="rounded-full"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100">
            <User className="h-5 w-5 text-purple-600" />
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
            <Link
              href="/settings"
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              role="menuitem"
            >
              <Settings className="h-4 w-4" />
              設定
            </Link>
            <Link
              href="/meetings"
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              role="menuitem"
            >
              会議一覧
            </Link>
          </div>

          <div className="border-t border-gray-100">
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
              role="menuitem"
            >
              <LogOut className="h-4 w-4" />
              ログアウト
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
