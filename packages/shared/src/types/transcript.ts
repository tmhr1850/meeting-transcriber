/**
 * 文字起こしセグメント
 */
export interface TranscriptSegment {
  /** セグメントID */
  id: string;
  /** 会議ID */
  meetingId: string;
  /** 文字起こしテキスト */
  text: string;
  /** 開始時刻（会議開始からのミリ秒） */
  startTime: number;
  /** 終了時刻（会議開始からのミリ秒） */
  endTime: number;
  /** 話者ID */
  speakerId?: string;
  /** 話者名 */
  speakerName?: string;
  /** 言語コード */
  language?: string;
  /** 信頼度 (0.0-1.0) */
  confidence?: number;
  /** 編集済みフラグ */
  isEdited: boolean;
  /** 元のテキスト（編集前） */
  originalText?: string;
  /** 作成日時 (ISO 8601形式) */
  createdAt: string;
}

/**
 * AI生成の会議要約
 */
export interface MeetingSummary {
  /** 要約ID */
  id: string;
  /** 会議ID */
  meetingId: string;
  /** 要約テキスト */
  summary: string;
  /** キーポイント */
  keyPoints: string[];
  /** アクションアイテム */
  actionItems: ActionItem[];
  /** 決定事項 */
  decisions: string[];
  /** 次のステップ */
  nextSteps: string[];
  /** 使用したAIモデル */
  aiModel: string;
  /** 生成日時 (ISO 8601形式) */
  generatedAt: string;
}

/**
 * アクションアイテム
 */
export interface ActionItem {
  /** アクション内容 */
  description: string;
  /** 担当者 */
  assignee?: string;
  /** 期限 (ISO 8601日付形式: YYYY-MM-DD) */
  dueDate?: string;
  /** 優先度 */
  priority?: 'high' | 'medium' | 'low';
}
