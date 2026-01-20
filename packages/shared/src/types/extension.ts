import type { Platform } from '../constants/platforms';
import type { TranscriptSegment } from './transcript';
import type { Meeting } from './meeting';

/**
 * 会議情報（Content Scriptから取得）
 */
export interface MeetingInfo {
  /** プラットフォーム種別 */
  platform: Platform;
  /** 会議ID */
  meetingId: string;
  /** 会議タイトル */
  title: string;
  /** 会議URL */
  url: string;
}

/**
 * 録音状態
 */
export interface RecordingState {
  /** 録音中かどうか */
  isRecording: boolean;
  /** 現在の会議ID */
  currentMeetingId: string | null;
  /** 録音中のタブID */
  currentTabId: number | null;
  /** 録音開始時刻（タイムスタンプ） */
  startTime: number | null;
}

/**
 * Chrome拡張の状態管理用インターフェース
 */
export interface ExtensionState {
  /** 録音中かどうか */
  isRecording: boolean;
  /** 現在録音中のタブID */
  currentTabId: number | null;
  /** 現在の会議情報 */
  currentMeeting: Meeting | null;
  /** 録音開始時刻（タイムスタンプ） */
  recordingStartedAt: number | null;
}

/**
 * 文字起こし更新データ
 */
export interface TranscriptUpdateData {
  /** 会議ID */
  meetingId: string;
  /** 文字起こしセグメント */
  segment: TranscriptSegment;
}

/**
 * Chrome拡張メッセージ型
 * Background、Content Script、Offscreen、Popup、Side Panel間の通信に使用
 */
export type ExtensionMessage =
  // Content Script -> Background: 会議検出通知
  | {
      type: 'MEETING_DETECTED';
      payload: {
        platform: Platform;
        url: string;
        meetingId?: string;
        title?: string;
      };
    }
  // Content Script -> Background: 会議終了通知
  | {
      type: 'MEETING_ENDED';
      payload: {
        platform: Platform;
        url: string;
        meetingId?: string;
        title?: string;
      };
    }
  // Content Script -> Background: 録音開始リクエスト
  | {
      type: 'START_RECORDING';
      meetingInfo: MeetingInfo;
    }
  // Popup/Side Panel -> Background: 録音停止リクエスト
  | {
      type: 'STOP_RECORDING';
    }
  // Popup/Side Panel -> Background: ステータス取得リクエスト
  | {
      type: 'GET_STATUS';
    }
  // Offscreen -> Background: 文字起こし結果受信
  | {
      type: 'TRANSCRIPT_RECEIVED';
      data: TranscriptUpdateData;
    }
  // Background -> Content Script: 文字起こし更新通知
  | {
      type: 'TRANSCRIPT_UPDATE';
      data: TranscriptUpdateData;
    }
  // Background -> Offscreen: 録音開始指示
  | {
      type: 'OFFSCREEN_START_RECORDING';
      target: 'offscreen';
      data: {
        streamId: string;
        meetingInfo: MeetingInfo;
      };
    }
  // Background -> Offscreen: 録音停止指示
  | {
      type: 'OFFSCREEN_STOP_RECORDING';
      target: 'offscreen';
    }
  // Side Panel -> Content Script: Side Panelからの録音開始リクエスト
  | {
      type: 'START_RECORDING_FROM_SIDEPANEL';
    }
  // Background -> Side Panel: 録音状態更新通知
  | {
      type: 'RECORDING_STATE_UPDATE';
      isRecording: boolean;
      meetingId?: string;
    }
  // Background -> Side Panel: 経過時間更新通知
  | {
      type: 'DURATION_UPDATE';
      duration: number; // 録音開始からの秒数
    }
  // Side Panel -> Background: AIクエリ
  | {
      type: 'AI_QUERY';
      query: string;
      segmentIds: string[]; // コンテキストとして使用するセグメントIDのリスト
      meetingId: string;
    }
  // Background -> Side Panel: AI応答
  | {
      type: 'AI_RESPONSE';
      response: string;
      query: string;
    };

/**
 * メッセージレスポンス型
 */
export type ExtensionMessageResponse<T extends ExtensionMessage = ExtensionMessage> =
  T extends { type: 'GET_STATUS' }
    ? RecordingState
    : T extends { type: 'START_RECORDING' } | { type: 'STOP_RECORDING' }
    ? { success: boolean; error?: string }
    : T extends { type: 'TRANSCRIPT_RECEIVED' } | { type: 'TRANSCRIPT_UPDATE' }
    ? { success: boolean }
    : T extends { type: 'AI_QUERY' }
    ? { success: boolean; error?: string }
    : { success: boolean; error?: string };
