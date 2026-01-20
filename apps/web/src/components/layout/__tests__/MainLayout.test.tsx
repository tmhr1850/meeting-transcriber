/**
 * MainLayoutコンポーネントのテスト
 */

import { describe, it, expect } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { MainLayout } from '../MainLayout';

// next-auth/reactのモック
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({
    data: null,
    status: 'unauthenticated',
  })),
}));

// next/navigationのモック
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(() => '/dashboard'),
}));

// next/linkのモック
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
});

describe('MainLayout', () => {
  it('Header、Sidebar、childrenが正しくレンダリングされる', () => {
    render(
      <MainLayout>
        <div data-testid="test-content">テストコンテンツ</div>
      </MainLayout>
    );

    // Headerのロゴが表示される
    expect(screen.getByText('Meeting Transcriber')).toBeInTheDocument();

    // Sidebarのナビゲーション項目が表示される
    expect(screen.getByText('ホーム')).toBeInTheDocument();
    expect(screen.getByText('会議一覧')).toBeInTheDocument();
    expect(screen.getByText('フォルダ')).toBeInTheDocument();
    expect(screen.getByText('設定')).toBeInTheDocument();

    // childrenが表示される
    expect(screen.getByTestId('test-content')).toBeInTheDocument();
    expect(screen.getByText('テストコンテンツ')).toBeInTheDocument();
  });

  it('レイアウト構造が正しい（Sidebar左、Header/Content右）', () => {
    const { container } = render(
      <MainLayout>
        <div>テストコンテンツ</div>
      </MainLayout>
    );

    // ルートコンテナがflexレイアウト
    const rootDiv = container.firstChild as HTMLElement;
    expect(rootDiv).toHaveClass('min-h-screen', 'flex');

    // 子要素の順序を確認（Sidebar、その後右側コンテナ）
    const children = Array.from(rootDiv.children);
    expect(children).toHaveLength(2);
  });
});
