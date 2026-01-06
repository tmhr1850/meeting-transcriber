import { redirect } from 'next/navigation';

/**
 * ルートページ
 * ログイン済みユーザーは/meetingsへリダイレクト
 * 未ログインユーザーは/loginへリダイレクト
 */
export default function HomePage() {
  // TODO: 認証状態を確認してリダイレクト
  // 現在は開発中のため/meetingsへリダイレクト
  redirect('/meetings');
}
