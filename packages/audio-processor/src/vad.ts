/**
 * Options for configuring Voice Activity Detection
 */
export interface VADOptions {
  /** Volume threshold for detecting voice activity (0-255, default: 30) */
  threshold?: number;
  /** Milliseconds of silence before considering voice inactive (default: 2000ms) */
  silenceTimeout?: number;
}

/**
 * VoiceActivityDetector analyzes audio stream to detect when someone is speaking
 *
 * Uses frequency analysis to determine if voice is present in the audio stream.
 * Useful for:
 * - Pausing transcription during silence
 * - Optimizing API calls to Whisper
 * - Detecting speaker turns
 *
 * @example
 * ```typescript
 * const audioContext = new AudioContext();
 * const source = audioContext.createMediaStreamSource(stream);
 * const vad = new VoiceActivityDetector(audioContext, source, {
 *   threshold: 30,
 *   silenceTimeout: 2000
 * });
 *
 * if (vad.isVoiceActive()) {
 *   // Continue recording
 * }
 * ```
 */
export class VoiceActivityDetector {
  private analyser: AnalyserNode;
  private dataArray: Uint8Array;
  private threshold: number;
  private silenceTimeout: number;
  private lastVoiceTime: number;

  /**
   * Create a new VoiceActivityDetector
   * @param audioContext - Web Audio API AudioContext
   * @param source - MediaStreamAudioSourceNode to analyze
   * @param options - Configuration options
   */
  constructor(
    audioContext: AudioContext,
    source: MediaStreamAudioSourceNode,
    options: VADOptions = {}
  ) {
    this.threshold = options.threshold ?? 30;
    this.silenceTimeout = options.silenceTimeout ?? 2000;
    this.lastVoiceTime = Date.now();

    // Create analyser node for frequency analysis
    this.analyser = audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    // Connect source to analyser
    source.connect(this.analyser);
  }

  /**
   * Check if voice activity is currently detected
   * @returns true if voice is active or was recently active within silence timeout
   */
  isVoiceActive(): boolean {
    // @ts-expect-error - TypeScript lib definition issue with Uint8Array<ArrayBufferLike>
    this.analyser.getByteFrequencyData(this.dataArray);
    const average = Array.from(this.dataArray).reduce((a, b) => a + b, 0) / this.dataArray.length;

    if (average > this.threshold) {
      this.lastVoiceTime = Date.now();
      return true;
    }

    // Continue considering voice active during silence timeout period
    return Date.now() - this.lastVoiceTime < this.silenceTimeout;
  }

  /**
   * Get the current average volume level
   * @returns Average volume (0-255)
   */
  getAverageVolume(): number {
    // @ts-expect-error - TypeScript lib definition issue with Uint8Array<ArrayBufferLike>
    this.analyser.getByteFrequencyData(this.dataArray);
    return Array.from(this.dataArray).reduce((a, b) => a + b, 0) / this.dataArray.length;
  }

  /**
   * Update the voice activity threshold
   * @param threshold - New threshold value (0-255)
   */
  setThreshold(threshold: number): void {
    this.threshold = Math.max(0, Math.min(255, threshold));
  }

  /**
   * Update the silence timeout duration
   * @param timeout - New timeout in milliseconds
   */
  setSilenceTimeout(timeout: number): void {
    this.silenceTimeout = Math.max(0, timeout);
  }

  /**
   * Get the time elapsed since last voice activity
   * @returns Milliseconds since last detected voice
   */
  getTimeSinceLastVoice(): number {
    return Date.now() - this.lastVoiceTime;
  }
}
