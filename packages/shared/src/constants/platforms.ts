/**
 * プラットフォーム種別の定数
 */
export const PLATFORMS = {
  GOOGLE_MEET: 'google-meet',
  ZOOM: 'zoom',
  TEAMS: 'teams',
  UPLOAD: 'upload',
} as const;

/**
 * プラットフォーム型（PLATFORMS定数から派生）
 */
export type Platform = typeof PLATFORMS[keyof typeof PLATFORMS];

/**
 * プラットフォームごとのURL一覧
 */
export const PLATFORM_URLS: Record<Platform, readonly string[]> = {
  'google-meet': ['meet.google.com'],
  'zoom': ['zoom.us'],
  'teams': ['teams.microsoft.com', 'teams.live.com'],
  'upload': [], // アップロード形式はURL不要
} as const;
