'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Search,
  Calendar,
  Share2,
  Sparkles,
  Settings,
  Archive,
  Upload,
  MessageSquare,
} from 'lucide-react';

const menuItems = [
  { href: '/search', label: '検索', icon: Search },
  { href: '/meetings', label: '私の会議', icon: Calendar },
  { href: '/shared', label: '私と共有', icon: Share2 },
  { href: '/ai-tools', label: 'AIツール', icon: Sparkles },
  { href: '/settings', label: '設定', icon: Settings },
  { href: '/archive', label: 'アーカイブ', icon: Archive },
  { href: '/upload', label: 'アップロード', icon: Upload },
  { href: '/ai-chat', label: 'AIチャット', icon: MessageSquare },
];

/**
 * サイドバーコンポーネント（Tactiq風UI）
 * 左側のナビゲーションメニュー
 */
export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b">
        <h1 className="text-xl font-bold text-purple-600">Meeting Transcriber</h1>
      </div>

      {/* Workspace */}
      <div className="p-4 border-b">
        <div className="text-sm font-medium">ワークスペース</div>
        <div className="text-xs text-gray-500">個人</div>
      </div>

      {/* Menu */}
      <nav className="flex-1 p-2 space-y-1">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href + item.label}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
                isActive
                  ? 'bg-purple-50 text-purple-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Spaces */}
      <div className="p-4 border-t">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">スペース</span>
          <button
            className="text-purple-600 hover:text-purple-700"
            aria-label="新しいスペースを追加"
            type="button"
          >
            +
          </button>
        </div>
      </div>
    </aside>
  );
}
