import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';

/**
 * ダッシュボードレイアウト
 * 認証が必要なページの共通レイアウト
 * サイドバーとヘッダーを含む
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // 未認証の場合はログインページへリダイレクト
  // TODO: 認証が実装されたら有効化
  // if (!session?.user) {
  //   redirect('/login');
  // }

  // 開発中のため仮のユーザー情報を使用
  const user = session?.user ?? {
    id: 'dev-user',
    name: '開発ユーザー',
    email: 'dev@example.com',
    image: null,
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header user={user} />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
