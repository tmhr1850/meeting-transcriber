/**
 * WavEncoder - AudioBufferをWAV形式に変換（Whisper API互換）
 *
 * WAV形式は広くサポートされており、ロスレス音声エンコーディングを提供するため、
 * 文字起こしの精度向上に最適です。
 *
 * 注意: このエンコーダーはモノラル出力専用です。ステレオ入力は自動的にダウンミックスされます。
 *
 * @example
 * ```typescript
 * const audioContext = new AudioContext();
 * const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
 * const wavBlob = WavEncoder.encode(audioBuffer);
 * // Whisper APIにwavBlobを送信
 * ```
 */
export class WavEncoder {
  private static readonly WAV_FORMAT_PCM = 1;
  private static readonly BIT_DEPTH = 16;
  private static readonly NUM_CHANNELS = 1; // モノラル専用

  /**
   * AudioBufferをWAV形式にエンコード
   * ステレオ音声は自動的にモノラルにダウンミックスされます
   * @param audioBuffer - エンコードするAudioBuffer
   * @returns WAV音声データを含むBlob
   */
  static encode(audioBuffer: AudioBuffer): Blob {
    const numChannels = this.NUM_CHANNELS;
    const sampleRate = audioBuffer.sampleRate;
    const format = this.WAV_FORMAT_PCM;
    const bitDepth = this.BIT_DEPTH;

    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;

    // ステレオの場合はダウンミックス、モノラルの場合はそのまま使用
    const buffer = this.downmixToMono(audioBuffer);
    const samples = buffer.length;
    const dataSize = samples * blockAlign;

    // WAVファイルは4GB制限あり（約6.7時間 @ 16kHz mono 16-bit）
    // RIFFチャンクサイズフィールドが32bit unsigned intのため
    const MAX_WAV_SIZE = 0xFFFFFFFF - 44; // 4GB - ヘッダーサイズ
    if (dataSize > MAX_WAV_SIZE) {
      throw new Error(
        '音声データが大きすぎます。WAV形式の4GB制限を超えています。' +
        `（最大: 約${Math.floor(MAX_WAV_SIZE / sampleRate / bytesPerSample / 60)}分、` +
        `現在: 約${Math.floor(dataSize / sampleRate / bytesPerSample / 60)}分）`
      );
    }

    const arrayBuffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(arrayBuffer);

    // Write WAV header
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    this.writeString(view, 8, 'WAVE');
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
    view.setUint16(20, format, true); // AudioFormat (1 for PCM)
    view.setUint16(22, numChannels, true); // NumChannels
    view.setUint32(24, sampleRate, true); // SampleRate
    view.setUint32(28, sampleRate * blockAlign, true); // ByteRate
    view.setUint16(32, blockAlign, true); // BlockAlign
    view.setUint16(34, bitDepth, true); // BitsPerSample
    this.writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    // Write audio data (convert float32 to int16)
    let offset = 44;
    for (let i = 0; i < samples; i++) {
      // Clamp sample to [-1, 1] range
      const sample = Math.max(-1, Math.min(1, buffer[i]));
      // Convert to 16-bit PCM
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }

  /**
   * ステレオ音声をモノラルにダウンミックス
   * 複数チャンネルの場合は全チャンネルの平均を取る
   * @param audioBuffer - ダウンミックスするAudioBuffer
   * @returns モノラル音声データ（Float32Array）
   * @private
   */
  private static downmixToMono(audioBuffer: AudioBuffer): Float32Array {
    const numChannels = audioBuffer.numberOfChannels;

    // 既にモノラルの場合はそのまま返す
    if (numChannels === 1) {
      return audioBuffer.getChannelData(0);
    }

    // 複数チャンネルの場合は平均を取る
    const length = audioBuffer.length;
    const monoBuffer = new Float32Array(length);

    for (let i = 0; i < length; i++) {
      let sum = 0;
      for (let channel = 0; channel < numChannels; channel++) {
        sum += audioBuffer.getChannelData(channel)[i];
      }
      monoBuffer[i] = sum / numChannels;
    }

    return monoBuffer;
  }

  /**
   * DataViewの指定オフセットに文字列を書き込む
   * @param view - 書き込み先のDataView
   * @param offset - 書き込み開始バイトオフセット
   * @param string - 書き込む文字列
   * @private
   */
  private static writeString(view: DataView, offset: number, string: string): void {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
}
