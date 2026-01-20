import { Header } from './Header';
import { Sidebar } from './Sidebar';

interface MainLayoutProps {
  children: React.ReactNode;
}

/**
 * メインレイアウトコンポーネント
 * Header、Sidebar、メインコンテンツを組み合わせた共通レイアウト
 * Tactiq風のUI：Sidebarを左側に固定し、右側にHeaderとコンテンツを配置
 */
export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 bg-gray-50 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
