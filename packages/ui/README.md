# @meeting-transcriber/ui

shadcn/uiベースの共有UIコンポーネントライブラリ

## 概要

このパッケージは、Meeting Transcriberプロジェクト全体で使用する共通UIコンポーネントを提供します。Web App (`apps/web`) とChrome拡張機能 (`apps/extension`) の両方から利用可能です。

## インストール

このパッケージはmonorepo内のワークスペースパッケージです。他のワークスペースから利用するには、package.jsonに以下を追加してください：

```json
{
  "dependencies": {
    "@meeting-transcriber/ui": "workspace:*"
  }
}
```

## コンポーネント一覧

### Button
録音ボタン、アクションボタン等に使用する汎用的なボタンコンポーネント

```tsx
import { Button } from '@meeting-transcriber/ui';

<Button variant="default" size="lg">録音開始</Button>
<Button variant="destructive">削除</Button>
<Button variant="outline" size="sm">キャンセル</Button>
```

**バリアント**: `default`, `destructive`, `outline`, `secondary`, `ghost`, `link`
**サイズ**: `default`, `sm`, `lg`, `icon`

### Input
検索、AIチャット入力等に使用する汎用的な入力フィールド

```tsx
import { Input } from '@meeting-transcriber/ui';

<Input type="text" placeholder="会議を検索..." />
```

### Card
会議カード等のコンテンツをカード形式で表示

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@meeting-transcriber/ui';

<Card>
  <CardHeader>
    <CardTitle>会議タイトル</CardTitle>
    <CardDescription>2024-01-20 10:00</CardDescription>
  </CardHeader>
  <CardContent>
    <p>会議の内容...</p>
  </CardContent>
  <CardFooter>
    <Button>詳細を見る</Button>
  </CardFooter>
</Card>
```

### Avatar
話者アイコン等のアバター表示に使用

```tsx
import { Avatar, AvatarImage, AvatarFallback } from '@meeting-transcriber/ui';

<Avatar>
  <AvatarImage src="/user.jpg" alt="User Name" />
  <AvatarFallback>UN</AvatarFallback>
</Avatar>
```

### Badge
ステータス表示（録音中、処理中、完了等）に使用

```tsx
import { Badge } from '@meeting-transcriber/ui';

<Badge variant="success">録音中</Badge>
<Badge variant="warning">処理中</Badge>
<Badge variant="default">完了</Badge>
```

**バリアント**: `default`, `secondary`, `destructive`, `outline`, `success`, `warning`

### DropdownMenu
会議の操作メニュー、ユーザーメニュー等に使用

```tsx
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from '@meeting-transcriber/ui';

<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost">メニュー</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem>編集</DropdownMenuItem>
    <DropdownMenuItem>削除</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### ScrollArea
トランスクリプトのスクロール表示等に使用

```tsx
import { ScrollArea } from '@meeting-transcriber/ui';

<ScrollArea className="h-[600px] w-full">
  <div className="space-y-4">
    {transcripts.map((item) => (
      <TranscriptItem key={item.id} {...item} />
    ))}
  </div>
</ScrollArea>
```

### Skeleton
ローディング状態を表示するスケルトンスクリーン

```tsx
import { Skeleton } from '@meeting-transcriber/ui';

<div className="space-y-2">
  <Skeleton className="h-4 w-[250px]" />
  <Skeleton className="h-4 w-[200px]" />
</div>
```

### Tooltip
ボタンやアイコンにホバー時のヘルプテキストを表示

```tsx
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@meeting-transcriber/ui';

<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <Button variant="ghost" size="icon">
        <InfoIcon />
      </Button>
    </TooltipTrigger>
    <TooltipContent>
      <p>詳細情報</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

### TranscriptItem (カスタムコンポーネント)
トランスクリプト（文字起こし）の各アイテムを表示
タイムスタンプ、話者、発言内容を含む

```tsx
import { TranscriptItem } from '@meeting-transcriber/ui';

<TranscriptItem
  timestamp="00:05:23"
  speaker="田中太郎"
  text="本日の議題について説明します。"
  avatarFallback="田中"
  highlighted={false}
/>
```

**Props**:
- `timestamp`: タイムスタンプ（例: "00:05:23"）
- `speaker`: 話者名
- `text`: 発言内容
- `avatarUrl?`: 話者のアバター画像URL（オプション）
- `avatarFallback?`: 話者のイニシャル（アバター画像がない場合のフォールバック）
- `highlighted?`: ハイライト表示するかどうか

## ユーティリティ

### cn
Tailwind CSSのクラス名を結合するユーティリティ関数

```tsx
import { cn } from '@meeting-transcriber/ui';

<div className={cn('base-class', isActive && 'active-class', className)} />
```

## 開発

```bash
# ビルド
pnpm build

# 型チェック
pnpm typecheck

# Lint
pnpm lint
```

## スタイリング

このパッケージはTailwind CSSを使用しています。使用する側のプロジェクトで、以下のCSS変数を定義する必要があります：

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96.1%;
  --secondary-foreground: 222.2 47.4% 11.2%;
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 210 40% 96.1%;
  --accent-foreground: 222.2 47.4% 11.2%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 222.2 84% 4.9%;
  --radius: 0.5rem;
}
```

## ライセンス

MIT
