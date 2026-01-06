/**
 * 音声アクティビティ検出（VAD）の設定オプション
 */
export interface VADOptions {
  /** 音声アクティビティ検出の音量閾値（0-255、デフォルト: 30） */
  threshold?: number;
  /** 音声が非アクティブと判定するまでの無音時間（ミリ秒、デフォルト: 2000ms） */
  silenceTimeout?: number;
}

/**
 * VoiceActivityDetector - 音声ストリームを分析して話者の発話を検出
 *
 * 周波数分析を使用して音声ストリーム内の音声の有無を判定します。
 * 用途:
 * - 無音時の文字起こし一時停止
 * - Whisper APIへの呼び出しの最適化
 * - 話者交代の検出
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
 *   // 録音を継続
 * }
 *
 * // 使用後はクリーンアップ
 * vad.dispose();
 * ```
 */
export class VoiceActivityDetector {
  private analyser: AnalyserNode;
  private dataArray: Uint8Array;
  private threshold: number;
  private silenceTimeout: number;
  private lastVoiceTime: number;

  /**
   * 新しいVoiceActivityDetectorを作成
   * @param audioContext - Web Audio API AudioContext
   * @param source - 分析対象のMediaStreamAudioSourceNode
   * @param options - 設定オプション
   */
  constructor(
    audioContext: AudioContext,
    source: MediaStreamAudioSourceNode,
    options: VADOptions = {}
  ) {
    this.threshold = options.threshold ?? 30;
    this.silenceTimeout = options.silenceTimeout ?? 2000;
    this.lastVoiceTime = Date.now();

    // 周波数分析用のアナライザーノードを作成
    this.analyser = audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    // ソースをアナライザーに接続
    source.connect(this.analyser);
  }

  /**
   * 音声アクティビティが現在検出されているかチェック
   * @returns 音声がアクティブまたは無音タイムアウト内で最近アクティブだった場合true
   */
  isVoiceActive(): boolean {
    // TypeScript lib.dom.d.tsの型定義問題により型エラーが発生
    // Uint8Array<ArrayBufferLike>とUint8Array<ArrayBuffer>の不一致
    // 実行時には問題なく動作するため、型チェックを抑制
    // @ts-expect-error TS2345
    this.analyser.getByteFrequencyData(this.dataArray);

    // パフォーマンス最適化: Array.from()を使わずに直接計算
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      sum += this.dataArray[i];
    }
    const average = sum / this.dataArray.length;

    if (average > this.threshold) {
      this.lastVoiceTime = Date.now();
      return true;
    }

    // 無音タイムアウト期間中は音声アクティブと見なす
    return Date.now() - this.lastVoiceTime < this.silenceTimeout;
  }

  /**
   * 現在の平均音量レベルを取得
   * @returns 平均音量（0-255）
   */
  getAverageVolume(): number {
    // TypeScript lib.dom.d.tsの型定義問題により型エラーが発生
    // 実行時には問題なく動作するため、型チェックを抑制
    // @ts-expect-error TS2345
    this.analyser.getByteFrequencyData(this.dataArray);

    // パフォーマンス最適化: Array.from()を使わずに直接計算
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      sum += this.dataArray[i];
    }
    return sum / this.dataArray.length;
  }

  /**
   * 音声アクティビティ閾値を更新
   * @param threshold - 新しい閾値（0-255）
   */
  setThreshold(threshold: number): void {
    this.threshold = Math.max(0, Math.min(255, threshold));
  }

  /**
   * 無音タイムアウト時間を更新
   * @param timeout - 新しいタイムアウト（ミリ秒）
   */
  setSilenceTimeout(timeout: number): void {
    this.silenceTimeout = Math.max(0, timeout);
  }

  /**
   * 最後の音声アクティビティからの経過時間を取得
   * @returns 最後に検出された音声からのミリ秒
   */
  getTimeSinceLastVoice(): number {
    return Date.now() - this.lastVoiceTime;
  }

  /**
   * リソースをクリーンアップしてAnalyserNodeを切断
   * 長時間実行アプリケーションでのメモリリークを防ぐ
   */
  dispose(): void {
    this.analyser.disconnect();
  }
}
