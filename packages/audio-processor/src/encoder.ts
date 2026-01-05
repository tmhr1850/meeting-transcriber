/**
 * WavEncoder converts AudioBuffer to WAV format for Whisper API compatibility
 *
 * WAV format is widely supported and provides lossless audio encoding,
 * making it ideal for transcription accuracy.
 *
 * @example
 * ```typescript
 * const audioContext = new AudioContext();
 * const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
 * const wavBlob = await WavEncoder.encode(audioBuffer);
 * // Send wavBlob to Whisper API
 * ```
 */
export class WavEncoder {
  /**
   * Encode an AudioBuffer to WAV format
   * @param audioBuffer - AudioBuffer to encode
   * @returns Promise resolving to a Blob containing WAV audio data
   */
  static async encode(audioBuffer: AudioBuffer): Promise<Blob> {
    const numChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const format = 1; // PCM format
    const bitDepth = 16;

    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;

    const buffer = audioBuffer.getChannelData(0);
    const samples = buffer.length;
    const dataSize = samples * blockAlign;
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
   * Write a string to a DataView at the specified offset
   * @param view - DataView to write to
   * @param offset - Byte offset to start writing
   * @param string - String to write
   * @private
   */
  private static writeString(view: DataView, offset: number, string: string): void {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
}
