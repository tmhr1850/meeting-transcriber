import { Session } from 'next-auth';
import { UserMenu } from './UserMenu';

interface HeaderProps {
  user: Session['user'];
}

/**
 * ヘッダーコンポーネント
 * ユーザー情報とメニューを表示
 */
export function Header({ user }: HeaderProps) {
  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold text-gray-800">ダッシュボード</h2>
      </div>

      <div className="flex items-center gap-4">
        <UserMenu user={user} />
      </div>
    </header>
  );
}
