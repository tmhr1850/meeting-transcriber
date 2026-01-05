import { AUDIO_CONFIG } from '@meeting-transcriber/shared';

/**
 * Options for configuring the AudioChunker
 */
export interface ChunkerOptions {
  /** Duration of each audio chunk in milliseconds (default: 5000ms) */
  chunkDuration?: number;
  /** Sample rate for audio capture (default: 16000Hz) */
  sampleRate?: number;
  /** Minimum chunk size in bytes before processing (default: 1024 bytes) */
  minChunkSize?: number;
  /** Overlap duration between chunks for context (default: 500ms) */
  overlapDuration?: number;
  /** Callback function called when a chunk is ready */
  onChunk: (blob: Blob, timestamp: number) => void;
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
 * @example
 * ```typescript
 * const chunker = new AudioChunker({
 *   onChunk: (blob, timestamp) => {
 *     // Send blob to transcription API
 *     sendToWhisper(blob, timestamp);
 *   }
 * });
 *
 * await chunker.start(mediaStream);
 * // ... later
 * chunker.stop();
 * ```
 */
export class AudioChunker {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private startTime: number = 0;
  private lastChunkTime: number = 0;
  private options: Required<ChunkerOptions>;

  constructor(options: ChunkerOptions) {
    this.options = {
      chunkDuration: options.chunkDuration ?? AUDIO_CONFIG.CHUNK_DURATION_MS,
      sampleRate: options.sampleRate ?? AUDIO_CONFIG.SAMPLE_RATE,
      minChunkSize: options.minChunkSize ?? AUDIO_CONFIG.MIN_CHUNK_SIZE,
      overlapDuration: options.overlapDuration ?? AUDIO_CONFIG.OVERLAP_DURATION_MS,
      onChunk: options.onChunk,
    };
  }

  /**
   * Start capturing and chunking audio from the provided MediaStream
   * @param stream - MediaStream to capture audio from
   * @throws Error if no supported audio MIME type is found
   */
  async start(stream: MediaStream): Promise<void> {
    this.startTime = Date.now();
    this.lastChunkTime = this.startTime;
    this.chunks = [];

    const mimeType = this.getSupportedMimeType();

    this.mediaRecorder = new MediaRecorder(stream, {
      mimeType,
      audioBitsPerSecond: AUDIO_CONFIG.BIT_RATE,
    });

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > this.options.minChunkSize) {
        this.chunks.push(event.data);
        this.processChunks();
      }
    };

    this.mediaRecorder.onerror = (event) => {
      console.error('MediaRecorder error:', event);
    };

    // Record in 1-second intervals to enable frequent chunk processing
    this.mediaRecorder.start(1000);
  }

  /**
   * Get the best supported audio MIME type for recording
   * @returns Supported MIME type string
   * @throws Error if no supported type is found
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
    throw new Error('No supported audio MIME type found');
  }

  /**
   * Process accumulated chunks and emit when duration threshold is reached
   * @private
   */
  private processChunks(): void {
    const now = Date.now();
    const elapsed = now - this.lastChunkTime;

    if (elapsed >= this.options.chunkDuration) {
      const combinedBlob = new Blob(this.chunks, { type: 'audio/webm' });
      const timestamp = this.lastChunkTime - this.startTime;

      this.options.onChunk(combinedBlob, timestamp);

      // Keep overlap chunks for context continuity
      const overlapChunks = Math.ceil(
        (this.options.overlapDuration / this.options.chunkDuration) * this.chunks.length
      );
      this.chunks = this.chunks.slice(-overlapChunks);
      this.lastChunkTime = now;
    }
  }

  /**
   * Flush any remaining audio chunks
   * Useful when stopping recording to ensure no data is lost
   */
  flush(): void {
    if (this.chunks.length > 0) {
      const combinedBlob = new Blob(this.chunks, { type: 'audio/webm' });
      const timestamp = this.lastChunkTime - this.startTime;
      this.options.onChunk(combinedBlob, timestamp);
      this.chunks = [];
    }
  }

  /**
   * Stop recording and clean up resources
   * Automatically flushes remaining chunks
   */
  stop(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
    this.flush();
    this.mediaRecorder = null;
  }

  /**
   * Check if the chunker is currently recording
   * @returns true if recording is active
   */
  isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }
}
