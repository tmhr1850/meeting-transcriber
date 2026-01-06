import { AUDIO_CONFIG } from '@meeting-transcriber/shared';

/**
 * AudioChunker設定オプション
 */
export interface ChunkerOptions {
  /** 各音声チャンクの長さ（ミリ秒、デフォルト: 5000ms） */
  chunkDuration?: number;
  /** 処理前の最小チャンクサイズ（バイト、デフォルト: 1024バイト） */
  minChunkSize?: number;
  /** チャンク間のオーバーラップ時間（デフォルト: 500ms） */
  overlapDuration?: number;
  /** チャンク準備完了時に呼び出されるコールバック */
  onChunk: (blob: Blob, timestamp: number) => void;
  /** エラー発生時に呼び出されるコールバック（オプション） */
  onError?: (error: Error) => void;
}

/**
 * AudioChunker handles capturing audio from a MediaStream and splitting it into
 * time-based chunks for real-time transcription processing.
 *
 * Features:
 * - Captures audio in optimal format for Whisper API (WebM/Opus)
 * - Chunks audio into 5-second intervals with overlap
 * - Handles stream lifecycle and cleanup
 *
 * Important Notes:
 * - Sample rate control: MediaRecorder APIでは入力ストリームのネイティブサンプルレートが使用されます
 *   サンプルレート変換が必要な場合は、Web Audio APIを使用した別途リサンプリング処理を実装してください
 *
 * @example
 * ```typescript
 * const chunker = new AudioChunker({
 *   onChunk: (blob, timestamp) => {
 *     // Send blob to transcription API
 *     sendToWhisper(blob, timestamp);
 *   }
 * });
 *
 * chunker.start(mediaStream);
 * // ... later
 * chunker.stop();
 * ```
 */
export class AudioChunker {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private startTime: number = 0;
  private lastChunkTime: number = 0;
  private selectedMimeType: string = '';
  private options: {
    chunkDuration: number;
    minChunkSize: number;
    overlapDuration: number;
    onChunk: (blob: Blob, timestamp: number) => void;
    onError?: (error: Error) => void;
  };

  constructor(options: ChunkerOptions) {
    this.options = {
      chunkDuration: options.chunkDuration ?? AUDIO_CONFIG.CHUNK_DURATION_MS,
      minChunkSize: options.minChunkSize ?? AUDIO_CONFIG.MIN_CHUNK_SIZE,
      overlapDuration: options.overlapDuration ?? AUDIO_CONFIG.OVERLAP_DURATION_MS,
      onChunk: options.onChunk,
      onError: options.onError,
    };
  }

  /**
   * 提供されたMediaStreamから音声のキャプチャとチャンク化を開始
   * @param stream - キャプチャする音声のMediaStream
   * @throws サポートされている音声MIMEタイプが見つからない場合
   * @throws 録音が既に開始されている場合
   */
  start(stream: MediaStream): void {
    if (this.isRecording()) {
      throw new Error('録音は既に開始されています。stop()を呼び出してから再度start()してください。');
    }

    this.startTime = Date.now();
    this.lastChunkTime = this.startTime;
    this.chunks = [];

    const mimeType = this.getSupportedMimeType();
    this.selectedMimeType = mimeType;

    this.mediaRecorder = new MediaRecorder(stream, {
      mimeType,
      audioBitsPerSecond: AUDIO_CONFIG.BIT_RATE,
    });

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > this.options.minChunkSize) {
        this.chunks.push(event.data);
        try {
          this.processChunks();
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          console.error('チャンク処理エラー:', err);
          this.options.onError?.(err);
        }
      }
    };

    this.mediaRecorder.onerror = (event) => {
      const error = new Error(`MediaRecorder エラー: ${event.type}`);
      console.error(error);
      this.options.onError?.(error);
      this.stop(); // エラー時はリソースをクリーンアップ
    };

    // Record in 1-second intervals to enable frequent chunk processing
    this.mediaRecorder.start(1000);
  }

  /**
   * 録音に最適なサポート済み音声MIMEタイプを取得
   * @returns サポートされているMIMEタイプ文字列
   * @throws サポートされているタイプが見つからない場合はエラー
   * @private
   */
  private getSupportedMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    throw new Error(
      'サポートされている音声MIMEタイプが見つかりません。' +
      'お使いのブラウザがMediaRecorder APIをサポートしていない可能性があります。' +
      'Chrome、Firefox、またはEdgeをお試しください。'
    );
  }

  /**
   * 蓄積されたチャンクを処理し、時間閾値に達したら出力
   * @private
   */
  private processChunks(): void {
    const now = Date.now();
    const elapsed = now - this.lastChunkTime;

    if (elapsed >= this.options.chunkDuration) {
      const combinedBlob = new Blob(this.chunks, { type: this.selectedMimeType });
      const timestamp = this.lastChunkTime - this.startTime;

      this.options.onChunk(combinedBlob, timestamp);

      // コンテキスト継続性のためオーバーラップチャンクを保持
      //
      // 重要: このオーバーラップ実装は近似値であり、正確な時間ベースのオーバーラップではありません
      //
      // 制約:
      // - MediaRecorderはstart(1000)で1秒ごとにチャンクを生成しますが、実際のチャンクサイズは可変
      // - チャンク数ベースでスライスしているため、実際のオーバーラップ時間は指定値とずれる可能性あり
      // - 例: 500msのオーバーラップ指定でも、実際には0〜1000msの範囲で変動
      // - minChunkSize未満のチャンクはスキップされるため、さらに不正確になる可能性あり
      //
      // より正確なオーバーラップが必要な場合は、タイムスタンプベースの実装に変更が必要です
      const overlapChunks = Math.ceil(this.options.overlapDuration / 1000);
      this.chunks = this.chunks.slice(-overlapChunks);
      this.lastChunkTime = now;
    }
  }

  /**
   * 残りの音声チャンクをすべて出力
   * 録音停止時にデータ損失を防ぐために使用
   */
  flush(): void {
    if (this.chunks.length > 0) {
      const combinedBlob = new Blob(this.chunks, { type: this.selectedMimeType || 'audio/webm' });
      const timestamp = this.lastChunkTime - this.startTime;
      this.options.onChunk(combinedBlob, timestamp);
      this.chunks = [];
    }
  }

  /**
   * 録音を停止してリソースをクリーンアップ
   * 残りのチャンクは自動的に出力されます
   */
  stop(): void {
    if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
      // 既に停止している場合は早期リターン
      return;
    }

    // 先にrecorderを保存してnullに設定し、再呼び出しを防ぐ
    const recorder = this.mediaRecorder;
    this.mediaRecorder = null;

    recorder.onstop = () => {
      this.flush();
      if (recorder.stream) {
        recorder.stream.getTracks().forEach(track => {
          if (track.readyState !== 'ended') {
            track.stop();
          }
        });
      }
      // メモリリーク防止: イベントハンドラをクリーンアップ
      recorder.onstop = null;
      recorder.ondataavailable = null;
      recorder.onerror = null;
    };
    recorder.stop();
  }

  /**
   * Check if the chunker is currently recording
   * @returns true if recording is active
   */
  isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }
}
