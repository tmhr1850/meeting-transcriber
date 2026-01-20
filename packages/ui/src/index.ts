/**
 * @meeting-transcriber/ui
 * shadcn/uiベースの共有UIコンポーネントライブラリ
 */

// ユーティリティ
export { cn } from './lib/utils';

// コンポーネント
export { Avatar, AvatarImage, AvatarFallback } from './components/avatar';
export { Badge, badgeVariants } from './components/badge';
export { Button, buttonVariants } from './components/button';
export type { ButtonProps } from './components/button';
export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
} from './components/card';
export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
} from './components/dropdown-menu';
export { Input } from './components/input';
export type { InputProps } from './components/input';
export { ScrollArea, ScrollBar } from './components/scroll-area';
export { Skeleton } from './components/skeleton';
export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from './components/tooltip';
export { TranscriptItem } from './components/transcript-item';
export type { TranscriptItemProps } from './components/transcript-item';
