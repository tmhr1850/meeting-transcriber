/**
 * 会議ステータスの定数
 */
export const MEETING_STATUSES = {
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  PROCESSING: 'processing',
  FAILED: 'failed',
} as const;

/**
 * 会議ステータス型（MEETING_STATUSES定数から派生）
 */
export type MeetingStatus = typeof MEETING_STATUSES[keyof typeof MEETING_STATUSES];
