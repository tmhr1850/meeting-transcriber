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

/**
 * トランスクリプトのセグメント型定義
 */
interface Segment {
  id: string;
  speaker: string;
  text: string;
  timestamp: string;
}

/**
 * Chrome拡張機能からのメッセージ型定義
 */
interface ChromeMessage {
  type:
    | 'RECORDING_STATE'
    | 'TRANSCRIPTION_RESULT'
    | 'DURATION_UPDATE'
    | 'AI_RESPONSE';
  isRecording?: boolean;
  segment?: Segment;
  duration?: number;
  response?: string;
}

export function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [duration, setDuration] = useState(0);
  const [aiQuery, setAiQuery] = useState('');
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
   * Chrome拡張機能からのメッセージリスナー
   * リアルタイムで録音状態、文字起こし結果、経過時間を受信
   */
  useEffect(() => {
    const listener = (message: ChromeMessage) => {
      switch (message.type) {
        case 'RECORDING_STATE':
          if (message.isRecording !== undefined) {
            setIsRecording(message.isRecording);
          }
          break;
        case 'TRANSCRIPTION_RESULT':
          if (message.segment) {
            setSegments((prev) => [...prev, message.segment]);
            // 新しいセグメントが追加されたら自動スクロール
            setTimeout(scrollToBottom, 100);
          }
          break;
        case 'DURATION_UPDATE':
          if (message.duration !== undefined) {
            setDuration(message.duration);
          }
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
   */
  const toggleRecording = () => {
    chrome.runtime.sendMessage({
      type: isRecording ? 'STOP_CAPTURE' : 'START_CAPTURE',
    });
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
   */
  const handleAiQuery = () => {
    if (aiQuery.trim() === '') return;

    chrome.runtime.sendMessage({
      type: 'AI_QUERY',
      query: aiQuery,
      context: segments,
    });
    setAiQuery('');
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
          variant={isRecording ? 'destructive' : 'default'}
          aria-label={isRecording ? '録音を停止' : '録音を開始'}
        >
          {isRecording ? '⏹ 停止' : '🎙 録音開始'}
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
        />
        <Button onClick={handleAiQuery} aria-label="クエリ送信">
          送信
        </Button>
      </div>
    </div>
  );
}
