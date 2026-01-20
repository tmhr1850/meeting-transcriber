/**
 * APIエラー情報
 */
export interface ApiError {
  /** エラーコード */
  code: string;
  /** エラーメッセージ */
  message: string;
  /** 追加の詳細情報 */
  details?: Record<string, unknown>;
}

/**
 * API レスポンス
 */
export interface ApiResponse<T> {
  /** 成功フラグ */
  success: boolean;
  /** レスポンスデータ */
  data?: T;
  /** エラー情報 */
  error?: ApiError;
}

/**
 * 文字起こしリクエスト
 */
export interface TranscriptionRequest {
  /** 会議ID */
  meetingId: string;
  /** 音声チャンク (ArrayBuffer または Blob) */
  audioChunk: ArrayBuffer | Blob;
  /** タイムスタンプ（会議開始からのミリ秒） */
  timestamp: number;
  /** 音声フォーマット (MIMEタイプ) */
  mimeType?: string;
}

/**
 * 文字起こしレスポンス
 */
export interface TranscriptionResponse {
  /** 文字起こしテキスト */
  text: string;
  /** タイムスタンプ（会議開始からのミリ秒） */
  timestamp: number;
  /** セグメントID */
  segmentId: string;
  /** 話者ID */
  speaker?: string;
  /** 言語コード */
  language?: string;
  /** 信頼度 (0.0-1.0) */
  confidence?: number;
}

/**
 * 要約生成リクエスト
 */
export interface GenerateSummaryRequest {
  /** 強制的に再生成するか */
  force?: boolean;
}

/**
 * 要約生成レスポンス
 */
export interface GenerateSummaryResponse {
  /** 要約データ */
  summary: {
    /** 要約文 */
    summary: string;
    /** キーポイント */
    keyPoints: string[];
    /** アクションアイテム */
    actionItems: Array<{
      task: string;
      assignee?: string;
      dueDate?: string;
    }>;
    /** 決定事項 */
    decisions: string[];
    /** 次のステップ */
    nextSteps: string[];
  };
  /** 生成日時 */
  generatedAt: string;
}

/**
 * カスタムプロンプトリクエスト
 */
export interface CustomPromptRequest {
  /** ユーザーの質問 */
  question: string;
}

/**
 * カスタムプロンプトレスポンス
 */
export interface CustomPromptResponse {
  /** AIの回答 */
  answer: string;
  /** 処理日時 */
  processedAt: string;
}
