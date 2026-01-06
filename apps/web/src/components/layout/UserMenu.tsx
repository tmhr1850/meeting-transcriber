'use client';

import { Session } from 'next-auth';
import { signOut } from 'next-auth/react';
import { LogOut, User } from 'lucide-react';

interface UserMenuProps {
  user: Session['user'];
}

/**
 * ユーザーメニューコンポーネント
 * アバター、名前、ログアウトボタンを表示
 */
export function UserMenu({ user }: UserMenuProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        {user.image ? (
          <img
            src={user.image}
            alt={user.name || ''}
            className="w-8 h-8 rounded-full"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
            <User className="w-5 h-5 text-purple-600" />
          </div>
        )}
        <div className="text-sm">
          <div className="font-medium text-gray-700">{user.name}</div>
          <div className="text-xs text-gray-500">{user.email}</div>
        </div>
      </div>

      <button
        onClick={() => signOut()}
        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
        title="ログアウト"
      >
        <LogOut className="w-5 h-5" />
      </button>
    </div>
  );
}
