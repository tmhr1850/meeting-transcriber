import { useState, useEffect } from 'react';
import { Button, Avatar } from '@meeting-transcriber/ui';

interface User {
  email: string;
  name: string;
  image?: string;
}

/**
 * Popup UIコンポーネント
 * 拡張アイコンクリック時に表示される
 */
export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 認証状態を取得
    chrome.storage.local.get(['user'], (result) => {
      setUser(result.user || null);
      setIsLoading(false);
    });
  }, []);

  /**
   * Side Panelを開く
   */
  const openSidePanel = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        chrome.sidePanel.open({ tabId: tab.id });
      }
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('Failed to open side panel:', err);
      }
    }
  };

  /**
   * ダッシュボード（Web App）を開く
   */
  const openDashboard = () => {
    try {
      chrome.tabs.create({ url: import.meta.env.VITE_DASHBOARD_URL || 'http://localhost:3000' });
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('Failed to open dashboard:', err);
      }
    }
  };

  /**
   * 設定ページを開く
   */
  const openSettings = () => {
    try {
      chrome.runtime.openOptionsPage();
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('Failed to open settings:', err);
      }
    }
  };

  /**
   * ログインページを開く
   */
  const handleLogin = () => {
    try {
      const webUrl = import.meta.env.VITE_DASHBOARD_URL || 'http://localhost:3000';
      chrome.tabs.create({ url: `${webUrl}/auth/signin` });
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('Failed to open login page:', err);
      }
    }
  };

  /**
   * ログアウト処理
   */
  const handleLogout = async () => {
    try {
      await chrome.storage.local.remove(['user', 'authToken']);
      setUser(null);
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('Failed to logout:', err);
      }
    }
  };

  if (isLoading) {
    return <div className="w-64 p-4">読み込み中...</div>;
  }

  return (
    <div className="w-64 p-4">
      <h1 className="text-lg font-bold mb-4">Meeting Transcriber</h1>

      {/* User Info */}
      <div className="border rounded-lg p-3 mb-4">
        {user ? (
          <div className="flex items-center gap-3">
            <Avatar src={user.image} fallback={user.name?.[0] || '?'} />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{user.name}</p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
              <p className="text-xs text-green-600 mt-1">ログイン中</p>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-gray-500 mb-2">ログインしていません</p>
            <Button onClick={handleLogin} className="w-full">
              ログイン
            </Button>
          </div>
        )}
      </div>

      {/* Actions */}
      {user && (
        <div className="space-y-2">
          <Button variant="outline" className="w-full justify-start" onClick={openSidePanel}>
            📋 Side Panelを開く
          </Button>
          <Button variant="outline" className="w-full justify-start" onClick={openDashboard}>
            📁 会議一覧を見る
          </Button>
          <Button variant="outline" className="w-full justify-start" onClick={openSettings}>
            ⚙️ 設定
          </Button>
          <Button variant="ghost" className="w-full justify-start text-red-500" onClick={handleLogout}>
            ログアウト
          </Button>
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 pt-4 border-t text-center text-xs text-gray-400">
        v1.0.0
      </div>
    </div>
  );
}
