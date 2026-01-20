/**
 * Side Panel App
 * リアルタイムで文字起こし結果を表示するサイドパネル
 */

import { useState, useEffect, useRef } from 'react';
import {
  TranscriptItem,
  Button,
  Input,
  ScrollArea,
} from '@meeting-transcriber/ui';
import type {
  TranscriptSegment,
  ExtensionMessage,
  ExtensionMessageResponse,
} from '@meeting-transcriber/shared';

/**
 * Side Panel表示用のセグメント
 */
interface DisplaySegment {
  id: string;
  speaker: string;
  text: string;
  timestamp: string; // "HH:MM:SS"形式の表示用タイムスタンプ
}

/**
 * セグメントの最大保持数（メモリリーク対策）
 */
const MAX_SEGMENTS = 1000;

/**
 * AIクエリのコンテキスト制限（直近N件のセグメントのみ）
 */
const CONTEXT_LIMIT = 50;

/**
 * TranscriptSegmentをDisplaySegmentに変換
 * @param segment - 文字起こしセグメント
 * @returns 表示用セグメント
 */
const toDisplaySegment = (segment: TranscriptSegment): DisplaySegment => {
  const elapsedSeconds = Math.floor(segment.startTime / 1000);
  const h = Math.floor(elapsedSeconds / 3600);
  const m = Math.floor((elapsedSeconds % 3600) / 60);
  const s = elapsedSeconds % 60;

  return {
    id: segment.id,
    speaker: segment.speakerName || '不明',
    text: segment.text,
    timestamp: `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`,
  };
};

export function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [segments, setSegments] = useState<DisplaySegment[]>([]);
  const [duration, setDuration] = useState(0);
  const [aiQuery, setAiQuery] = useState('');
  const [currentMeetingId, setCurrentMeetingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  /**
   * スクロール領域を最下部まで自動スクロール
   */
  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop =
        scrollContainerRef.current.scrollHeight;
    }
  };

  /**
   * 新しいセグメントが追加されたら自動スクロール
   */
  useEffect(() => {
    scrollToBottom();
  }, [segments]);

  /**
   * Chrome拡張機能からのメッセージリスナー
   * リアルタイムで録音状態、文字起こし結果、経過時間を受信
   */
  useEffect(() => {
    const listener = (message: ExtensionMessage) => {
      switch (message.type) {
        case 'RECORDING_STATE_UPDATE':
          setIsRecording(message.isRecording);
          if (message.meetingId) {
            setCurrentMeetingId(message.meetingId);
          }
          // 録音停止時にセグメントとdurationをクリア
          if (!message.isRecording) {
            setSegments([]);
            setDuration(0);
            setCurrentMeetingId(null);
          }
          break;

        case 'TRANSCRIPT_UPDATE':
          if (message.data?.segment) {
            const displaySegment = toDisplaySegment(message.data.segment);
            setSegments((prev) => {
              const updated = [...prev, displaySegment];
              // メモリリーク対策: 最大保持数を超えたら古いセグメントを削除
              return updated.length > MAX_SEGMENTS
                ? updated.slice(-MAX_SEGMENTS)
                : updated;
            });
          }
          break;

        case 'DURATION_UPDATE':
          setDuration(message.duration);
          break;

        case 'AI_RESPONSE':
          // AI応答は別途処理（将来的に実装）
          if (import.meta.env.DEV) {
            console.log('AI Response:', message.response);
          }
          break;
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  /**
   * 録音開始/停止ボタンのハンドラ
   * エラーハンドリングとローディング状態を含む
   */
  const toggleRecording = async () => {
    setIsLoading(true);
    try {
      const message: ExtensionMessage = isRecording
        ? { type: 'STOP_RECORDING' }
        : { type: 'START_RECORDING_FROM_SIDEPANEL' };

      const response = await chrome.runtime.sendMessage(message);

      if (response && !response.success) {
        console.error('録音操作に失敗:', response.error);
        // TODO: ユーザーにエラー通知（トースト等）
      }
    } catch (error) {
      console.error('メッセージ送信エラー:', error);
      // TODO: ユーザーにエラー通知
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 経過時間を HH:MM:SS 形式にフォーマット
   */
  const formatDuration = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m
      .toString()
      .padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  /**
   * AIクエリ送信ハンドラ
   * コンテキストサイズを制限し、エラーハンドリングを含む
   */
  const handleAiQuery = async () => {
    if (aiQuery.trim() === '' || !currentMeetingId) return;

    try {
      // 直近CONTEXT_LIMIT件のセグメントIDのみを送信
      const recentSegmentIds = segments
        .slice(-CONTEXT_LIMIT)
        .map((seg) => seg.id);

      const message: ExtensionMessage = {
        type: 'AI_QUERY',
        query: aiQuery,
        segmentIds: recentSegmentIds,
        meetingId: currentMeetingId,
      };

      const response = await chrome.runtime.sendMessage(message);

      if (response && !response.success) {
        console.error('AIクエリ送信に失敗:', response.error);
        // TODO: ユーザーにエラー通知
      } else {
        setAiQuery('');
      }
    } catch (error) {
      console.error('AIクエリ送信エラー:', error);
      // TODO: ユーザーにエラー通知
    }
  };

  /**
   * Enterキー押下でAIクエリ送信
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleAiQuery();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="p-4 border-b flex justify-between items-center bg-card">
        <h1 className="font-bold text-foreground">Meeting Transcriber</h1>
        <Button variant="ghost" size="sm" aria-label="設定">
          ⚙️
        </Button>
      </header>

      {/* Recording Status */}
      <div className="p-3 border-b flex items-center gap-2 bg-card">
        <Button
          onClick={toggleRecording}
          disabled={isLoading}
          variant={isRecording ? 'destructive' : 'default'}
          aria-label={isRecording ? '録音を停止' : '録音を開始'}
        >
          {isLoading
            ? '⏳ 処理中...'
            : isRecording
            ? '⏹ 停止'
            : '🎙 録音開始'}
        </Button>
        {isRecording && (
          <span className="text-sm text-muted-foreground">
            🔴 {formatDuration(duration)}
          </span>
        )}
      </div>

      {/* Transcript */}
      <ScrollArea className="flex-1">
        <div ref={scrollContainerRef} className="p-4 space-y-2">
          {segments.length === 0 ? (
            <p className="text-muted-foreground text-center mt-8">
              録音を開始すると文字起こしが表示されます
            </p>
          ) : (
            segments.map((segment) => (
              <TranscriptItem
                key={segment.id}
                speaker={segment.speaker}
                timestamp={segment.timestamp}
                text={segment.text}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* AI Query */}
      <div className="p-3 border-t flex gap-2 bg-card">
        <Input
          value={aiQuery}
          onChange={(e) => setAiQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="🤖 AIに聞く..."
          aria-label="AIクエリ入力"
          disabled={!currentMeetingId || segments.length === 0}
        />
        <Button
          onClick={handleAiQuery}
          aria-label="クエリ送信"
          disabled={!currentMeetingId || segments.length === 0 || aiQuery.trim() === ''}
        >
          送信
        </Button>
      </div>
    </div>
  );
}
