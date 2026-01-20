import * as React from 'react';

import { cn } from '../lib/utils';

/**
 * Skeletonコンポーネント
 * ローディング状態を表示するスケルトンスクリーン
 *
 * @example
 * ```tsx
 * <div className="space-y-2">
 *   <Skeleton className="h-4 w-[250px]" />
 *   <Skeleton className="h-4 w-[200px]" />
 * </div>
 * ```
 */
function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted', className)}
      {...props}
    />
  );
}

export { Skeleton };
