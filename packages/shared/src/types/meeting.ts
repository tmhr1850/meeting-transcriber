import type { Platform } from '../constants/platforms';
import type { MeetingStatus } from '../constants/meeting';

export type { Platform, MeetingStatus };

/**
 * 会議セッションのメタデータとステータス追跡
 */
export interface Meeting {
  /** 会議の一意識別子 */
  id: string;
  /** 所有ユーザーID */
  userId: string;
  /** 会議タイトル */
  title: string;
  /** プラットフォーム種別 */
  platform: Platform;
  /** 会議ステータス */
  status: MeetingStatus;
  /** 開始時刻 (ISO 8601形式) */
  startTime: string;
  /** 終了時刻 (ISO 8601形式) */
  endTime?: string;
  /** 会議時間（秒） */
  durationSeconds?: number;
  /** 参加者数 */
  participantCount?: number;
  /** 作成日時 (ISO 8601形式) */
  createdAt: string;
  /** 更新日時 (ISO 8601形式) */
  updatedAt: string;
}
