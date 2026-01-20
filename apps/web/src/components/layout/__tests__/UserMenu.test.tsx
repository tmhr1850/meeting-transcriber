/**
 * UserMenuコンポーネントのテスト
 */

import { describe, it, expect, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UserMenu } from '../UserMenu';

// next-auth/reactのモック
const mockSignOut = jest.fn();
jest.mock('next-auth/react', () => ({
  signOut: mockSignOut,
}));

// next/linkのモック
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
});

// next/imageのモック
jest.mock('next/image', () => {
  return ({ src, alt }: { src: string; alt: string }) => {
    return <img src={src} alt={alt} />;
  };
});

describe('UserMenu', () => {
  const mockUser = {
    id: 'test-user-id',
    name: 'テストユーザー',
    email: 'test@example.com',
    image: null,
  };

  beforeEach(() => {
    mockSignOut.mockClear();
  });

  it('ユーザー情報が表示される', () => {
    render(<UserMenu user={mockUser} />);

    // メニューボタンをクリック
    const menuButton = screen.getByRole('button', { expanded: false });
    fireEvent.click(menuButton);

    // ユーザー名とメールアドレスが表示される
    expect(screen.getByText('テストユーザー')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('メニュー項目が表示される', () => {
    render(<UserMenu user={mockUser} />);

    // メニューボタンをクリック
    const menuButton = screen.getByRole('button');
    fireEvent.click(menuButton);

    // メニュー項目が表示される
    expect(screen.getByText('設定')).toBeInTheDocument();
    expect(screen.getByText('会議一覧')).toBeInTheDocument();
    expect(screen.getByText('ログアウト')).toBeInTheDocument();
  });

  it('ログアウトボタンをクリックするとsignOutが呼ばれる', async () => {
    mockSignOut.mockResolvedValue(undefined);

    render(<UserMenu user={mockUser} />);

    // メニューボタンをクリック
    const menuButton = screen.getByRole('button');
    fireEvent.click(menuButton);

    // ログアウトボタンをクリック
    const signOutButton = screen.getByText('ログアウト');
    fireEvent.click(signOutButton);

    // signOutが呼ばれることを確認
    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledWith({
        callbackUrl: '/login',
      });
    });
  });

  it('ログアウト失敗時にエラーハンドリングされる', async () => {
    // alertのモック
    const mockAlert = jest.spyOn(window, 'alert').mockImplementation(() => {});
    const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    mockSignOut.mockRejectedValue(new Error('ログアウトエラー'));

    render(<UserMenu user={mockUser} />);

    // メニューボタンをクリック
    const menuButton = screen.getByRole('button');
    fireEvent.click(menuButton);

    // ログアウトボタンをクリック
    const signOutButton = screen.getByText('ログアウト');
    fireEvent.click(signOutButton);

    // エラーログとアラートが表示される
    await waitFor(() => {
      expect(mockConsoleError).toHaveBeenCalledWith(
        'ログアウトに失敗しました:',
        expect.any(Error)
      );
      expect(mockAlert).toHaveBeenCalledWith(
        'ログアウトに失敗しました。もう一度お試しください。'
      );
    });

    mockAlert.mockRestore();
    mockConsoleError.mockRestore();
  });

  it('メニュー外をクリックするとメニューが閉じる', () => {
    render(<UserMenu user={mockUser} />);

    // メニューボタンをクリックして開く
    const menuButton = screen.getByRole('button');
    fireEvent.click(menuButton);

    // メニューが表示される
    expect(screen.getByText('設定')).toBeInTheDocument();

    // メニュー外をクリック
    fireEvent.mouseDown(document.body);

    // メニューが閉じる
    expect(screen.queryByText('設定')).not.toBeInTheDocument();
  });
});
