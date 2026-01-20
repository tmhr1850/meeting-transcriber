/**
 * Chunk Queue
 * 音声チャンクを順序通りにAPIに送信し、失敗時にリトライ処理を行うキュー管理
 */

import { api } from './api';
import type { ExtensionMessage } from '@meeting-transcriber/shared';

/**
 * キューアイテム
 */
interface QueueItem {
  chunk: ArrayBuffer;
  timestamp: number;
  chunkIndex: number;
  retryCount?: number;
}

/**
 * リトライオプション
 */
interface RetryOptions {
  maxRetries: number;
  initialDelayMs: number;
  useExponentialBackoff: boolean;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  initialDelayMs: 1000,
  useExponentialBackoff: true,
};

/**
 * デフォルトの音声チャンク期間（ミリ秒）
 * 実際の音声チャンク長に基づいて調整可能
 */
const DEFAULT_CHUNK_DURATION_MS = 5000;

/**
 * Chunk Queue クラス
 */
class ChunkQueue {
  private queue: QueueItem[] = [];
  private isProcessing = false;
  private meetingId: string | null = null;
  private retryOptions: RetryOptions = DEFAULT_RETRY_OPTIONS;

  /**
   * 会議IDを設定
   * @param id - 会議ID
   */
  setMeetingId(id: string): void {
    this.meetingId = id;
    console.log('[ChunkQueue] Meeting ID set:', id);
  }

  /**
   * リトライオプションを設定
   * @param options - リトライオプション
   */
  setRetryOptions(options: Partial<RetryOptions>): void {
    this.retryOptions = { ...DEFAULT_RETRY_OPTIONS, ...options };
  }

  /**
   * キューにチャンクを追加
   * @param item - キューアイテム
   */
  async enqueue(item: QueueItem): Promise<void> {
    this.queue.push({ ...item, retryCount: 0 });
    console.log(`[ChunkQueue] Enqueued chunk ${item.chunkIndex}, queue length: ${this.queue.length}`);

    if (!this.isProcessing) {
      await this.process();
    }
  }

  /**
   * キューを処理
   */
  private async process(): Promise<void> {
    if (!this.meetingId) {
      console.warn('[ChunkQueue] Cannot process queue: meeting ID not set');
      return;
    }

    this.isProcessing = true;
    console.log('[ChunkQueue] Processing started');

    while (this.queue.length > 0) {
      const item = this.queue.shift()!;

      try {
        console.log(`[ChunkQueue] Processing chunk ${item.chunkIndex}...`);

        const result = await api.sendAudioChunk({
          meetingId: this.meetingId,
          chunk: item.chunk,
          timestamp: item.timestamp,
          chunkIndex: item.chunkIndex,
        });

        // 文字起こし結果をBackground Scriptに送信
        const message: ExtensionMessage = {
          type: 'TRANSCRIPT_RECEIVED',
          data: {
            meetingId: this.meetingId,
            segment: {
              id: `chunk-${item.chunkIndex}`,
              meetingId: this.meetingId,
              text: result.text,
              startTime: item.timestamp,
              endTime: item.timestamp + DEFAULT_CHUNK_DURATION_MS,
              speakerId: result.speaker,
              speakerName: result.speaker || '不明',
              isEdited: false,
              createdAt: new Date().toISOString(),
            },
          },
        };

        try {
          await chrome.runtime.sendMessage(message);
        } catch (messageError) {
          console.error(`[ChunkQueue] Failed to send message for chunk ${item.chunkIndex}:`, messageError);
          // メッセージ送信エラーは致命的ではないので、処理を続行
        }

        console.log(`[ChunkQueue] Successfully processed chunk ${item.chunkIndex}`);

        // メモリ管理: 処理完了後にArrayBufferの参照をクリア
        (item as any).chunk = null;
      } catch (error) {
        console.error(`[ChunkQueue] Failed to process chunk ${item.chunkIndex}:`, error);

        // リトライ処理
        const retryCount = (item.retryCount || 0) + 1;

        if (retryCount < this.retryOptions.maxRetries) {
          // リトライする
          const delayMs = this.retryOptions.useExponentialBackoff
            ? this.retryOptions.initialDelayMs * Math.pow(2, retryCount - 1)
            : this.retryOptions.initialDelayMs;

          console.log(`[ChunkQueue] Retrying chunk ${item.chunkIndex} in ${delayMs}ms (attempt ${retryCount + 1}/${this.retryOptions.maxRetries})`);

          // キューの先頭に戻す
          this.queue.unshift({ ...item, retryCount });

          // 遅延
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        } else {
          console.error(`[ChunkQueue] Max retries exceeded for chunk ${item.chunkIndex}, skipping`);
          // エラーメッセージをBackground Scriptに送信
          try {
            await chrome.runtime.sendMessage({
              type: 'TRANSCRIPTION_ERROR',
              error: {
                chunkIndex: item.chunkIndex,
                message: error instanceof Error ? error.message : 'Unknown error',
              },
            });
          } catch (messageError) {
            console.error(`[ChunkQueue] Failed to send error message for chunk ${item.chunkIndex}:`, messageError);
          }

          // メモリ管理: リトライ失敗時もArrayBufferの参照をクリア
          (item as any).chunk = null;
        }
      }
    }

    this.isProcessing = false;
    console.log('[ChunkQueue] Processing completed');
  }

  /**
   * キューをクリア
   */
  clear(): void {
    this.queue = [];
    this.meetingId = null;
    this.isProcessing = false;
    console.log('[ChunkQueue] Queue cleared');
  }

  /**
   * キューの長さを取得
   * @returns キューの長さ
   */
  getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * 処理中かどうか
   * @returns 処理中の場合true
   */
  isQueueProcessing(): boolean {
    return this.isProcessing;
  }
}

export const chunkQueue = new ChunkQueue();
