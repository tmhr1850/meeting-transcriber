/**
 * Sidebarコンポーネントのテスト
 */

import { describe, it, expect, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { Sidebar } from '../Sidebar';

// next/linkのモック
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
});

describe('Sidebar', () => {
  it('すべてのナビゲーション項目が表示される', () => {
    // next/navigationのモック
    jest.spyOn(require('next/navigation'), 'usePathname').mockReturnValue('/dashboard');

    render(<Sidebar />);

    // メインナビゲーション
    expect(screen.getByText('ホーム')).toBeInTheDocument();
    expect(screen.getByText('会議一覧')).toBeInTheDocument();
    expect(screen.getByText('フォルダ')).toBeInTheDocument();
    expect(screen.getByText('設定')).toBeInTheDocument();

    // ボトムナビゲーション
    expect(screen.getByText('インポート')).toBeInTheDocument();
    expect(screen.getByText('ヘルプ')).toBeInTheDocument();
  });

  it('現在のページがハイライトされる', () => {
    // next/navigationのモック
    jest.spyOn(require('next/navigation'), 'usePathname').mockReturnValue('/meetings');

    const { container } = render(<Sidebar />);

    // 会議一覧リンクを取得
    const meetingsLink = screen.getByText('会議一覧').closest('a');
    expect(meetingsLink).toHaveClass('bg-blue-100', 'text-blue-700');

    // 他のリンクはハイライトされていない
    const homeLink = screen.getByText('ホーム').closest('a');
    expect(homeLink).not.toHaveClass('bg-blue-100');
  });

  it('子パスでもハイライトされる', () => {
    // next/navigationのモック（/meetings/123など）
    jest.spyOn(require('next/navigation'), 'usePathname').mockReturnValue('/meetings/123');

    render(<Sidebar />);

    // 会議一覧リンクがハイライトされる
    const meetingsLink = screen.getByText('会議一覧').closest('a');
    expect(meetingsLink).toHaveClass('bg-blue-100', 'text-blue-700');
  });

  it('リンクのhrefが正しい', () => {
    jest.spyOn(require('next/navigation'), 'usePathname').mockReturnValue('/dashboard');

    render(<Sidebar />);

    expect(screen.getByText('ホーム').closest('a')).toHaveAttribute('href', '/dashboard');
    expect(screen.getByText('会議一覧').closest('a')).toHaveAttribute('href', '/meetings');
    expect(screen.getByText('フォルダ').closest('a')).toHaveAttribute('href', '/folders');
    expect(screen.getByText('設定').closest('a')).toHaveAttribute('href', '/settings');
    expect(screen.getByText('インポート').closest('a')).toHaveAttribute('href', '/import');
    expect(screen.getByText('ヘルプ').closest('a')).toHaveAttribute('href', '/help');
  });
});
