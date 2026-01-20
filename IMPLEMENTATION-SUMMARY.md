# Issue #20: レイアウトコンポーネント（Header/Sidebar）の実装 - 完了報告

## 実装概要

Issue #20の要件に従い、Web Appの共通レイアウトコンポーネント（Header、Sidebar、MainLayout）を実装しました。

## 実装したファイル

### 1. ヘッダーコンポーネント
**ファイル**: `apps/web/src/components/layout/Header.tsx`

**実装内容**:
- ロゴ（左側）: "Meeting Transcriber"
- 通知ボタン（ベルアイコン）: lucide-reactの`Bell`アイコンを使用
- ユーザーメニュー: `UserMenu`コンポーネントを統合
- `useSession`フックでリアルタイムのセッション情報を取得
- Client Componentとして実装（'use client'ディレクティブ）
- Tailwind CSSでスタイリング
- shadcn/ui `Button`コンポーネントを使用

### 2. サイドバーコンポーネント
**ファイル**: `apps/web/src/components/layout/Sidebar.tsx`

**実装内容**:
- **ロゴエリア**: クリック可能なロゴ（ダッシュボードへのリンク）
- **メインナビゲーション**:
  - ホーム (`/dashboard`)
  - 会議一覧 (`/meetings`)
  - フォルダ (`/folders`)
  - 設定 (`/settings`)
- **ボトムナビゲーション**:
  - インポート (`/import`)
  - ヘルプ (`/help`)
- 現在のページをハイライト（`usePathname`で判定）
- lucide-reactアイコン使用: `Home`, `Calendar`, `Folder`, `Settings`, `Download`, `HelpCircle`
- Client Componentとして実装
- Tactiq風のUIデザイン

### 3. ユーザーメニューコンポーネント
**ファイル**: `apps/web/src/components/layout/UserMenu.tsx`

**実装内容**:
- shadcn/uiの`DropdownMenu`コンポーネントを使用
- shadcn/uiの`Avatar`コンポーネントを使用
- ユーザー情報表示（名前、メールアドレス）
- メニュー項目:
  - 設定へのリンク
  - 会議一覧へのリンク
  - ログアウトボタン
- エラーハンドリング実装
- @meeting-transcriber/uiパッケージからコンポーネントをインポート

### 4. メインレイアウトコンポーネント
**ファイル**: `apps/web/src/components/layout/MainLayout.tsx`

**実装内容**:
- HeaderとSidebarを組み合わせた共通レイアウト
- `children`プロップでメインコンテンツを受け取る
- オプションで`user`プロップを受け取る
- フレックスボックスレイアウト:
  - サイドバー: 固定幅（w-64）
  - メインエリア: 残りのスペースを占有
  - ヘッダー: 固定高さ（h-16）
  - コンテンツ: スクロール可能
- Client Componentとして実装

### 5. SessionProviderコンポーネント
**ファイル**: `apps/web/src/components/providers/SessionProvider.tsx`

**実装内容**:
- NextAuth.jsの`SessionProvider`をラップ
- Client ComponentでuseSessionフックを使用可能にする
- ルートレイアウトで使用

### 6. エクスポートファイル
**ファイル**:
- `apps/web/src/components/layout/index.ts`: レイアウトコンポーネントのエクスポート
- `apps/web/src/components/providers/index.ts`: プロバイダーのエクスポート

## 更新したファイル

### 1. ダッシュボードレイアウト
**ファイル**: `apps/web/src/app/(dashboard)/layout.tsx`

**変更内容**:
- 個別のHeaderとSidebarの代わりに`MainLayout`を使用
- コードを簡潔化

### 2. ルートレイアウト
**ファイル**: `apps/web/src/app/layout.tsx`

**変更内容**:
- `SessionProvider`を追加
- Client ComponentでuseSessionフックを使用可能にする

## UI設計（Tactiq参考）

```
┌──────────────────────────────────────────────────────┐
│ [Logo] Meeting Transcriber          🔔  👤 User ▼  │
├────────────┬─────────────────────────────────────────┤
│            │                                         │
│ 🏠 ホーム   │                                         │
│ 📋 会議一覧 │         [メインコンテンツ]              │
│ 📁 フォルダ │                                         │
│ ⚙️ 設定     │                                         │
│            │                                         │
│            │                                         │
│ ─────────  │                                         │
│ 📥 インポート│                                         │
│ ❓ ヘルプ   │                                         │
└────────────┴─────────────────────────────────────────┘
```

## 技術仕様

- **TypeScript**: 全ファイルで型定義を記述
- **Next.js 14 App Router**: Client Componentとして実装
- **Tailwind CSS**: スタイリング
- **shadcn/ui**: Avatar、Button、DropdownMenuコンポーネント
- **lucide-react**: アイコン
- **NextAuth.js**: useSessionフック使用
- **エラーハンドリング**: ログアウト処理にtry-catch実装

## 完了条件チェック

- [x] ヘッダーにロゴ、通知、ユーザーメニューが表示される
- [x] サイドバーにナビゲーションが表示される
- [x] 現在のページがハイライトされる
- [x] ユーザーメニューからログアウトできる
- [x] TypeScript型定義が適切に記述されている
- [x] Tailwind CSSで適切にスタイリングされている

## テスト

- テストファイルを作成: `apps/web/src/components/layout/__tests__/MainLayout.test.tsx`
- MainLayoutコンポーネントの基本的なレンダリングをテスト

## 注意事項

1. **レスポンシブ対応**: 現在はデスクトップ向けのレイアウトのみ。モバイル対応（サイドバーの折りたたみ機能）は今後の課題。
2. **通知機能**: 通知ボタンは実装済みだが、実際の通知データの取得と表示は未実装。
3. **開発中の認証**: (dashboard)/layout.tsxでは、認証チェックがコメントアウトされており、開発用の仮ユーザー情報を使用。

## 使用方法

### MainLayoutの使用例

```tsx
// Server Componentで使用
import { auth } from '@/lib/auth';
import { MainLayout } from '@/components/layout';

export default async function Page() {
  const session = await auth();

  return (
    <MainLayout user={session?.user}>
      <YourPageContent />
    </MainLayout>
  );
}
```

### 個別コンポーネントの使用例

```tsx
// Client Componentで使用
'use client';

import { Header, Sidebar } from '@/components/layout';
import { useSession } from 'next-auth/react';

export default function CustomLayout() {
  const { data: session } = useSession();

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header user={session?.user} />
        <main>...</main>
      </div>
    </div>
  );
}
```

## 既存の問題（Issue #20の範囲外）

実装中に発見した既存の型エラー:
1. `tiktoken`モジュールが見つからない（`src/lib/openai/summary.ts`）
2. `@meeting-transcriber/shared`パッケージの型定義の不一致（`CustomPromptRequest`, `GenerateSummaryResponse`など）

これらは別のIssueで対応する必要があります。

## 次のステップ

1. 認証機能の完全実装（Issue #6）
2. 通知機能の実装
3. モバイル対応（レスポンシブデザイン）
4. ダークモード対応（オプション）

## 関連Issue

- #5: Next.js基本構造
- #11: UIコンポーネント
- #6: NextAuth認証
- #14: Side Panel UI
- #15: Popup UI
