/**
 * Headerコンポーネントのテスト
 */

import { describe, it, expect, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { Header } from '../Header';

// next/linkのモック
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
});

describe('Header', () => {
  it('セッションがある場合、ユーザーメニューが表示される', () => {
    // next-auth/reactのモック
    jest.spyOn(require('next-auth/react'), 'useSession').mockReturnValue({
      data: {
        user: {
          id: 'test-user-id',
          name: 'テストユーザー',
          email: 'test@example.com',
          image: null,
        },
      },
      status: 'authenticated',
    });

    render(<Header />);

    // ロゴが表示される
    expect(screen.getByText('Meeting Transcriber')).toBeInTheDocument();

    // 通知ボタンが表示される
    const notificationButton = screen.getByLabelText('通知');
    expect(notificationButton).toBeInTheDocument();

    // ユーザーメニューが表示される（UserMenuコンポーネント内のボタン）
    expect(screen.getByRole('button', { expanded: false })).toBeInTheDocument();
  });

  it('セッションがない場合、ログインボタンが表示される', () => {
    // next-auth/reactのモック
    jest.spyOn(require('next-auth/react'), 'useSession').mockReturnValue({
      data: null,
      status: 'unauthenticated',
    });

    render(<Header />);

    // ログインボタンが表示される
    expect(screen.getByText('ログイン')).toBeInTheDocument();
  });

  it('セッション読み込み中、ローディング表示される', () => {
    // next-auth/reactのモック
    jest.spyOn(require('next-auth/react'), 'useSession').mockReturnValue({
      data: null,
      status: 'loading',
    });

    const { container } = render(<Header />);

    // ローディングスピナーが表示される
    const loadingSpinner = container.querySelector('.animate-pulse');
    expect(loadingSpinner).toBeInTheDocument();
  });
});
