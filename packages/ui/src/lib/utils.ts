import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Tailwind CSSのクラス名を結合するユーティリティ関数
 * clsxとtailwind-mergeを組み合わせて、条件付きクラス名と競合解決を実現
 *
 * @param inputs - クラス名の配列
 * @returns 結合されたクラス名文字列
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
