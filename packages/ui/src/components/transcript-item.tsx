import * as React from 'react';
import { cn } from '../lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from './avatar';

export interface TranscriptItemProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * タイムスタンプ（例: "00:05:23"）
   */
  timestamp: string;
  /**
   * 話者名
   */
  speaker: string;
  /**
   * 発言内容
   */
  text: string;
  /**
   * 話者のアバター画像URL（オプション）
   */
  avatarUrl?: string;
  /**
   * 話者のイニシャル（アバター画像がない場合のフォールバック）
   */
  avatarFallback?: string;
  /**
   * ハイライト表示するかどうか
   */
  highlighted?: boolean;
}

/**
 * TranscriptItemコンポーネント
 * トランスクリプト（文字起こし）の各アイテムを表示
 * タイムスタンプ、話者、発言内容を含む
 *
 * @example
 * ```tsx
 * <TranscriptItem
 *   timestamp="00:05:23"
 *   speaker="田中太郎"
 *   text="本日の議題について説明します。"
 *   avatarFallback="田中"
 * />
 * ```
 */
const TranscriptItem = React.forwardRef<HTMLDivElement, TranscriptItemProps>(
  (
    {
      className,
      timestamp,
      speaker,
      text,
      avatarUrl,
      avatarFallback,
      highlighted = false,
      ...props
    },
    ref
  ) => {
    // アバターのフォールバックテキストを生成（名前の最初の1-2文字）
    const fallbackText =
      avatarFallback || speaker.slice(0, 2).toUpperCase();

    return (
      <div
        ref={ref}
        className={cn(
          'flex gap-3 rounded-lg p-3 transition-colors hover:bg-accent/50',
          highlighted && 'bg-accent',
          className
        )}
        {...props}
      >
        {/* タイムスタンプ */}
        <div className="flex-shrink-0 w-16 text-xs text-muted-foreground pt-1">
          {timestamp}
        </div>

        {/* 話者アバター */}
        <Avatar className="flex-shrink-0 h-8 w-8">
          {avatarUrl && <AvatarImage src={avatarUrl} alt={speaker} />}
          <AvatarFallback className="text-xs">{fallbackText}</AvatarFallback>
        </Avatar>

        {/* 話者名と発言内容 */}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm mb-1">{speaker}</div>
          <div className="text-sm text-foreground whitespace-pre-wrap break-words">
            {text}
          </div>
        </div>
      </div>
    );
  }
);
TranscriptItem.displayName = 'TranscriptItem';

export { TranscriptItem };
