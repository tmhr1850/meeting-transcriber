/**
 * POST /api/transcription
 *
 * 音声ファイルを文字起こしするAPIエンドポイント
 *
 * リクエスト:
 * - meetingId: 会議ID
 * - audioFile: 音声ファイル（multipart/form-data）
 * - language: 言語コード（オプション、デフォルト: 'ja'）
 *
 * レスポンス:
 * - segments: 文字起こしセグメント配列
 * - text: 全文テキスト
 * - duration: 音声の長さ（秒）
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { transcribeAudio, transcribeLongAudio, mergeTranscriptionResults } from '@/lib/openai/whisper';
import type { MeetingStatus } from '@meeting-transcriber/database';

/**
 * POST /api/transcription
 *
 * 音声ファイルを文字起こしし、データベースに保存します。
 *
 * 認証必須、会議の所有者のみアクセス可能
 */
export async function POST(request: NextRequest) {
  // エラーハンドリング用にスコープ外で宣言
  let meetingId: string | null = null;

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
    meetingId = formData.get('meetingId') as string;
    const audioFile = formData.get('audioFile') as File;
    const language = (formData.get('language') as string) || 'ja';

    // 3. バリデーション
    if (!meetingId) {
      return NextResponse.json(
        { error: 'meetingIdは必須です' },
        { status: 400 }
      );
    }

    if (!audioFile) {
      return NextResponse.json(
        { error: 'audioFileは必須です' },
        { status: 400 }
      );
    }

    // 4. 会議の存在確認と所有者チェック
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
    });

    if (!meeting) {
      return NextResponse.json(
        { error: '会議が見つかりません' },
        { status: 404 }
      );
    }

    if (meeting.userId !== userId) {
      return NextResponse.json(
        { error: 'この会議にアクセスする権限がありません' },
        { status: 403 }
      );
    }

    // 5. ステータスを「処理中」に更新
    await prisma.meeting.update({
      where: { id: meetingId },
      data: {
        status: 'PROCESSING' as MeetingStatus,
        processingProgress: 0,
      },
    });

    console.log(`会議 ${meetingId} の文字起こし処理を開始します...`);

    // 進捗: 10% - 処理開始
    await prisma.meeting.update({
      where: { id: meetingId },
      data: { processingProgress: 10 },
    });

    // 6. Whisper APIで文字起こし
    let results;
    const maxFileSize = 25 * 1024 * 1024; // 25MB

    if (audioFile.size > maxFileSize) {
      // 25MB超の場合はチャンク分割
      console.log(`音声ファイルが大きいため、チャンク分割処理を実行します (${(audioFile.size / 1024 / 1024).toFixed(2)}MB)`);

      // 進捗: 20% - チャンク分割処理開始
      await prisma.meeting.update({
        where: { id: meetingId },
        data: { processingProgress: 20 },
      });

      results = await transcribeLongAudio(audioFile, { language });

      // 進捗: 70% - 文字起こし完了
      await prisma.meeting.update({
        where: { id: meetingId },
        data: { processingProgress: 70 },
      });
    } else {
      // 25MB以下の場合は通常の文字起こし
      // 進捗: 25% - Whisper API呼び出し開始
      await prisma.meeting.update({
        where: { id: meetingId },
        data: { processingProgress: 25 },
      });

      const result = await transcribeAudio(audioFile, { language });
      results = [result];

      // 進捗: 70% - 文字起こし完了
      await prisma.meeting.update({
        where: { id: meetingId },
        data: { processingProgress: 70 },
      });
    }

    // 7. 結果を統合
    const mergedResult = mergeTranscriptionResults(results);

    console.log(`文字起こし完了: ${mergedResult.text.length}文字, ${mergedResult.segments?.length || 0}セグメント`);

    // 進捗: 80% - データベース保存開始
    await prisma.meeting.update({
      where: { id: meetingId },
      data: { processingProgress: 80 },
    });

    // 8. データベースに保存
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

      console.log(`${segmentsToCreate.length}個のセグメントをデータベースに保存しました`);
    }

    // 9. 会議情報を更新（ステータス、時間）
    // 進捗: 100% - 完了
    await prisma.meeting.update({
      where: { id: meetingId },
      data: {
        status: 'COMPLETED' as MeetingStatus,
        duration: Math.floor(mergedResult.duration),
        processingProgress: 100,
      },
    });

    console.log(`会議 ${meetingId} の文字起こし処理が完了しました`);

    // 10. レスポンス
    return NextResponse.json({
      success: true,
      text: mergedResult.text,
      duration: mergedResult.duration,
      segmentCount: mergedResult.segments?.length || 0,
      language: mergedResult.language,
    });

  } catch (error) {
    console.error('文字起こしAPIエラー:', error);

    // エラー時は会議のステータスを「失敗」に更新
    if (meetingId) {
      try {
        await prisma.meeting.update({
          where: { id: meetingId },
          data: {
            status: 'FAILED' as MeetingStatus,
            processingProgress: 0,
          },
        });
      } catch (updateError) {
        console.error('ステータス更新エラー:', updateError);
      }
    }

    return NextResponse.json(
      {
        error: '文字起こし処理に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー',
      },
      { status: 500 }
    );
  }
}
