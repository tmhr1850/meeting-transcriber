/**
 * Whisper API 文字起こし処理
 *
 * OpenAI Whisper APIを使用して音声ファイルを文字起こしします。
 * 25MB制限に対応するため、長時間の音声はチャンク分割して処理します。
 */

import { openai } from './client';
import type { Transcription } from 'openai/resources/audio/transcriptions';

/**
 * 文字起こしオプション
 */
export interface TranscriptionOptions {
  /** 音声の言語コード（例: 'ja', 'en'）デフォルトは自動検出 */
  language?: string;
  /** 応答フォーマット（デフォルト: 'verbose_json'） */
  responseFormat?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';
  /** 音声内容のヒント（専門用語などの認識精度向上） */
  prompt?: string;
  /** 温度パラメータ（0-1、デフォルト: 0） */
  temperature?: number;
}

/**
 * 文字起こし結果（verbose_json形式）
 */
export interface TranscriptionResult {
  /** 文字起こしされたテキスト全体 */
  text: string;
  /** 音声の言語 */
  language: string;
  /** 音声の長さ（秒） */
  duration: number;
  /** セグメント単位の詳細情報 */
  segments?: {
    id: number;
    seek: number;
    start: number;
    end: number;
    text: string;
    tokens: number[];
    temperature: number;
    avg_logprob: number;
    compression_ratio: number;
    no_speech_prob: number;
  }[];
}

/**
 * 音声チャンク情報
 */
interface AudioChunk {
  /** チャンクのインデックス */
  index: number;
  /** チャンクのバイナリデータ */
  data: Blob;
  /** チャンクの開始時間（秒） */
  startTime: number;
  /** チャンクの終了時間（秒） */
  endTime: number;
}

/**
 * Whisper APIで音声ファイルを文字起こし
 *
 * @param audioFile - 音声ファイル（File、Blob、またはBuffer）
 * @param options - 文字起こしオプション
 * @returns 文字起こし結果
 * @throws Error - API呼び出しエラー
 *
 * @example
 * ```typescript
 * const result = await transcribeAudio(audioFile, {
 *   language: 'ja',
 *   prompt: '会議の議事録です。',
 * });
 * console.log(result.text);
 * ```
 */
export async function transcribeAudio(
  audioFile: File | Blob,
  options: TranscriptionOptions = {}
): Promise<TranscriptionResult> {
  try {
    const {
      language = 'ja',
      responseFormat = 'verbose_json',
      prompt,
      temperature = 0,
    } = options;

    // FileまたはBlobをAPIに適した形式に変換
    const file = audioFile instanceof File
      ? audioFile
      : new File([audioFile], 'audio.webm', { type: audioFile.type || 'audio/webm' });

    // Whisper APIリクエスト
    const response = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      language,
      response_format: responseFormat,
      prompt,
      temperature,
    });

    // verbose_json形式の場合は詳細情報を返す
    if (responseFormat === 'verbose_json') {
      return response as unknown as TranscriptionResult;
    }

    // その他の形式の場合はテキストのみを返す
    return {
      text: typeof response === 'string' ? response : (response as Transcription).text,
      language: language || 'unknown',
      duration: 0,
    };
  } catch (error) {
    console.error('Whisper API文字起こしエラー:', error);
    throw new Error(
      `文字起こし処理に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`
    );
  }
}

/**
 * 長時間音声ファイルをチャンク分割して文字起こし
 *
 * Whisper APIは25MBまでのファイルしか受け付けないため、
 * 大きなファイルはチャンク分割して処理します。
 *
 * @param audioFile - 音声ファイル
 * @param options - 文字起こしオプション
 * @param chunkDurationSeconds - チャンクの長さ（秒）デフォルト: 600秒（10分）
 * @returns 全チャンクの文字起こし結果（セグメント配列）
 * @throws Error - チャンク分割または文字起こしエラー
 *
 * @example
 * ```typescript
 * const segments = await transcribeLongAudio(audioFile, {
 *   language: 'ja',
 * }, 600); // 10分ごとにチャンク分割
 * ```
 */
export async function transcribeLongAudio(
  audioFile: File | Blob,
  options: TranscriptionOptions = {},
  chunkDurationSeconds: number = 600
): Promise<TranscriptionResult[]> {
  try {
    const maxFileSizeBytes = 25 * 1024 * 1024; // 25MB

    // ファイルサイズチェック
    if (audioFile.size <= maxFileSizeBytes) {
      // 25MB以下の場合は通常の文字起こし
      const result = await transcribeAudio(audioFile, options);
      return [result];
    }

    // 25MB超の場合はチャンク分割
    console.log(
      `音声ファイルが25MBを超えています (${(audioFile.size / 1024 / 1024).toFixed(2)}MB)。チャンク分割処理を開始します...`
    );

    // チャンク分割（実際の実装ではWeb Audio APIやFFmpegを使用）
    const chunks = await splitAudioIntoChunks(audioFile, chunkDurationSeconds);

    console.log(`${chunks.length}個のチャンクに分割しました。文字起こしを開始します...`);

    // 各チャンクを文字起こし
    const results: TranscriptionResult[] = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`チャンク ${i + 1}/${chunks.length} を処理中...`);

      // 前のチャンクの最後のテキストをプロンプトとして使用（文脈の継続性向上）
      const previousText =
        i > 0 && results[i - 1].segments && results[i - 1].segments!.length > 0
          ? results[i - 1].segments!.slice(-3).map(s => s.text).join(' ')
          : options.prompt;

      const result = await transcribeAudio(chunk.data, {
        ...options,
        prompt: previousText,
      });

      // タイムスタンプをチャンク開始時間でオフセット
      if (result.segments) {
        result.segments = result.segments.map(segment => ({
          ...segment,
          start: segment.start + chunk.startTime,
          end: segment.end + chunk.startTime,
        }));
      }

      results.push(result);
    }

    console.log('全チャンクの文字起こしが完了しました。');
    return results;
  } catch (error) {
    console.error('長時間音声の文字起こしエラー:', error);
    throw new Error(
      `長時間音声の文字起こし処理に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`
    );
  }
}

/**
 * 音声ファイルをチャンクに分割
 *
 * CRITICAL: バイト単位での分割は音声ファイルのフォーマットを破損させるため、
 * 本番環境では以下のいずれかを実装する必要があります:
 *
 * **推奨オプション:**
 * 1. FFmpegを使用したサーバー側での分割（最も信頼性が高い）
 * 2. 最大ファイルサイズを25MBに制限し、分割処理を削除
 * 3. クライアント側（Chrome拡張）で録音時に事前分割
 *
 * **現在の実装:**
 * 25MBを超えるファイルはエラーを返します。
 * FFmpegの導入または録音時の事前分割が必要です。
 *
 * @param audioFile - 音声ファイル
 * @param chunkDurationSeconds - チャンクの長さ（秒）
 * @returns 分割されたチャンク配列
 * @throws Error 25MB超のファイルはサポートされていません
 */
async function splitAudioIntoChunks(
  audioFile: File | Blob,
  chunkDurationSeconds: number
): Promise<AudioChunk[]> {
  // CRITICAL: バイト分割では音声ファイルが破損します
  // 暫定対応: 25MB超のファイルはエラーを返す
  throw new Error(
    '25MBを超える音声ファイルは現在サポートされていません。\n' +
    'FFmpegによる正しいチャンク分割処理の実装、または\n' +
    'クライアント側での録音時の事前分割が必要です。\n' +
    `ファイルサイズ: ${(audioFile.size / 1024 / 1024).toFixed(2)}MB`
  );
}

/**
 * 複数の文字起こし結果を統合
 *
 * チャンク分割して処理した結果を1つの結果に統合します。
 *
 * @param results - 文字起こし結果の配列
 * @returns 統合された文字起こし結果
 */
export function mergeTranscriptionResults(
  results: TranscriptionResult[]
): TranscriptionResult {
  if (results.length === 0) {
    throw new Error('統合する結果がありません');
  }

  if (results.length === 1) {
    return results[0];
  }

  // 全テキストを結合
  const text = results.map(r => r.text).join(' ');

  // 全セグメントを結合
  const segments = results.flatMap(r => r.segments || []);

  // 総時間を計算
  const duration = results.reduce((sum, r) => sum + r.duration, 0);

  // 言語（最初の結果から取得）
  const language = results[0].language;

  return {
    text,
    language,
    duration,
    segments,
  };
}
