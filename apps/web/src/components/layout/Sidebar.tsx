'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Calendar, Folder, Settings, Download, HelpCircle } from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'ホーム', icon: Home },
  { href: '/meetings', label: '会議一覧', icon: Calendar },
  { href: '/folders', label: 'フォルダ', icon: Folder },
  { href: '/settings', label: '設定', icon: Settings },
];

const bottomItems = [
  { href: '/import', label: 'インポート', icon: Download },
  { href: '/help', label: 'ヘルプ', icon: HelpCircle },
];

/**
 * サイドバーコンポーネント（Tactiq風UI）
 * 左側のナビゲーションメニュー
 */
export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col">
      {/* Main Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          // アクティブ判定：完全一致または子パスの場合
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Navigation */}
      <div className="p-4 border-t border-gray-200 space-y-1">
        {bottomItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </Link>
        ))}
      </div>
    </aside>
  );
}
