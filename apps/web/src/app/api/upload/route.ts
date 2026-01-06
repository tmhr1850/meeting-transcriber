/**
 * POST /api/upload
 *
 * 音声ファイルをアップロードし、会議レコードを作成して非同期で文字起こしを開始するAPIエンドポイント
 *
 * リクエスト:
 * - audioFile: 音声ファイル（multipart/form-data）
 * - title: 会議タイトル（オプション）
 * - language: 言語コード（オプション、デフォルト: 'ja'）
 *
 * レスポンス:
 * - meetingId: 作成された会議ID
 * - status: 処理ステータス
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { transcribeAudio, transcribeLongAudio, mergeTranscriptionResults } from '@/lib/openai/whisper';
import type { Platform, MeetingStatus } from '@meeting-transcriber/database';

// 最大ファイルサイズ（25MB）
const MAX_FILE_SIZE = 25 * 1024 * 1024;

/**
 * POST /api/upload
 *
 * 音声ファイルをアップロードし、非同期で文字起こし処理を開始します。
 *
 * 認証必須
 */
export async function POST(request: NextRequest) {
  try {
    // 1. 認証チェック
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    const userId = session.user.id as string;

    // 2. リクエストボディの解析（multipart/form-data）
    const formData = await request.formData();
    const audioFile = formData.get('audioFile') as File;
    const title = (formData.get('title') as string) || '音声ファイルのアップロード';
    const language = (formData.get('language') as string) || 'ja';

    // 3. バリデーション
    if (!audioFile) {
      return NextResponse.json(
        { error: 'audioFileは必須です' },
        { status: 400 }
      );
    }

    // ファイルサイズチェック（拡張: 25MBを超える場合も受け付け、チャンク処理）
    // NOTE: 実際にはファイルサイズ制限を緩和し、大きなファイルも処理可能
    if (audioFile.size === 0) {
      return NextResponse.json(
        { error: '音声ファイルが空です' },
        { status: 400 }
      );
    }

    // ファイル形式チェック（オプション）
    const supportedFormats = ['audio/webm', 'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg'];
    if (audioFile.type && !supportedFormats.includes(audioFile.type)) {
      console.warn(`サポートされていない可能性のある音声形式: ${audioFile.type}`);
    }

    console.log(`音声ファイルアップロード: ${audioFile.name} (${(audioFile.size / 1024 / 1024).toFixed(2)}MB)`);

    // 4. 会議レコードを作成
    const meeting = await prisma.meeting.create({
      data: {
        userId,
        title,
        platform: 'UPLOAD' as Platform,
        status: 'PROCESSING' as MeetingStatus,
        processingProgress: 0,
      },
    });

    console.log(`会議レコードを作成しました: ${meeting.id}`);

    // 5. 非同期で文字起こし処理を開始
    // NOTE: Next.jsのAPIルートでは長時間処理は推奨されないため、
    // 本番環境ではバックグラウンドジョブキュー（BullMQ、Inngest等）の使用を推奨
    processTranscriptionAsync(meeting.id, audioFile, language);

    // 6. レスポンス（即座に返却）
    return NextResponse.json({
      success: true,
      meetingId: meeting.id,
      status: 'processing',
      message: '音声ファイルのアップロードが完了しました。文字起こし処理を開始します。',
    });

  } catch (error) {
    console.error('アップロードAPIエラー:', error);

    return NextResponse.json(
      {
        error: 'アップロード処理に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー',
      },
      { status: 500 }
    );
  }
}

/**
 * 非同期文字起こし処理
 *
 * 会議IDと音声ファイルを受け取り、バックグラウンドで文字起こしを実行します。
 *
 * @param meetingId - 会議ID
 * @param audioFile - 音声ファイル
 * @param language - 言語コード
 */
async function processTranscriptionAsync(
  meetingId: string,
  audioFile: File,
  language: string
) {
  try {
    console.log(`[非同期処理] 会議 ${meetingId} の文字起こしを開始します...`);

    // 1. Whisper APIで文字起こし
    let results;
    const maxFileSize = 25 * 1024 * 1024; // 25MB

    if (audioFile.size > maxFileSize) {
      // 25MB超の場合はチャンク分割
      console.log(`[非同期処理] 音声ファイルが大きいため、チャンク分割処理を実行します (${(audioFile.size / 1024 / 1024).toFixed(2)}MB)`);
      results = await transcribeLongAudio(audioFile, { language });

      // 進捗を50%に更新
      await prisma.meeting.update({
        where: { id: meetingId },
        data: { processingProgress: 50 },
      });
    } else {
      // 25MB以下の場合は通常の文字起こし
      const result = await transcribeAudio(audioFile, { language });
      results = [result];

      // 進捗を50%に更新
      await prisma.meeting.update({
        where: { id: meetingId },
        data: { processingProgress: 50 },
      });
    }

    // 2. 結果を統合
    const mergedResult = mergeTranscriptionResults(results);

    console.log(`[非同期処理] 文字起こし完了: ${mergedResult.text.length}文字, ${mergedResult.segments?.length || 0}セグメント`);

    // 3. データベースに保存
    if (mergedResult.segments && mergedResult.segments.length > 0) {
      // セグメント単位でデータベースに保存
      const segmentsToCreate = mergedResult.segments.map((segment, index) => ({
        meetingId,
        speaker: 'Unknown', // TODO: 話者識別機能を実装後に更新
        text: segment.text.trim(),
        timestamp: Math.floor(segment.start),
        confidence: 1 - segment.no_speech_prob, // 信頼度スコア
        chunkIndex: index,
      }));

      await prisma.transcriptSegment.createMany({
        data: segmentsToCreate,
      });

      console.log(`[非同期処理] ${segmentsToCreate.length}個のセグメントをデータベースに保存しました`);
    }

    // 4. 会議情報を更新（ステータス、時間）
    await prisma.meeting.update({
      where: { id: meetingId },
      data: {
        status: 'COMPLETED' as MeetingStatus,
        duration: Math.floor(mergedResult.duration),
        processingProgress: 100,
      },
    });

    console.log(`[非同期処理] 会議 ${meetingId} の文字起こし処理が完了しました`);

  } catch (error) {
    console.error(`[非同期処理] 会議 ${meetingId} の文字起こしエラー:`, error);

    // エラー時は会議のステータスを「失敗」に更新
    try {
      await prisma.meeting.update({
        where: { id: meetingId },
        data: {
          status: 'FAILED' as MeetingStatus,
          processingProgress: 0,
        },
      });
    } catch (updateError) {
      console.error('[非同期処理] ステータス更新エラー:', updateError);
    }
  }
}
