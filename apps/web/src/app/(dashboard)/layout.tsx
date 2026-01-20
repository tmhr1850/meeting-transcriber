import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { MainLayout } from '@/components/layout';

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

  return <MainLayout>{children}</MainLayout>;
}
