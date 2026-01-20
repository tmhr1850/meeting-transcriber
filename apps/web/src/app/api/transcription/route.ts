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
 *
 * レート制限: 5リクエスト/時間
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma, type MeetingStatus } from '@meeting-transcriber/database';
import { transcribeAudio, transcribeLongAudio, mergeTranscriptionResults } from '@/lib/openai/whisper';
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rate-limit';

/**
 * リクエストボディのバリデーションスキーマ
 */
const transcriptionRequestSchema = z.object({
  meetingId: z.string().min(1, 'meetingIdは必須です'),
  audioFile: z.instanceof(File, { message: 'audioFileは必須です' }),
  language: z.string().optional().default('ja'),
});

/**
 * POST /api/transcription
 *
 * 音声ファイルを文字起こしし、データベースに保存します。
 *
 * 認証必須、会議の所有者のみアクセス可能
 * レート制限: 5リクエスト/時間
 */
export async function POST(request: NextRequest) {
  // エラーハンドリング用にスコープ外で宣言
  let meetingId: string | null = null;
  let rateLimitResult: Awaited<ReturnType<typeof checkRateLimit>> | null = null;

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

    // 2. レート制限チェック（5リクエスト/時間）
    rateLimitResult = await checkRateLimit(
      `transcription:${userId}`,
      5,
      '1 h'
    );

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'リクエストが多すぎます。しばらく待ってから再試行してください。',
          retryAfter: Math.ceil((rateLimitResult.reset - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            ...getRateLimitHeaders(rateLimitResult),
            'Retry-After': Math.ceil(
              (rateLimitResult.reset - Date.now()) / 1000
            ).toString(),
          },
        }
      );
    }

    // 3. リクエストボディの解析（multipart/form-data）
    const formData = await request.formData();

    // 4. Zodでバリデーション
    const validationResult = transcriptionRequestSchema.safeParse({
      meetingId: formData.get('meetingId'),
      audioFile: formData.get('audioFile'),
      language: formData.get('language') || 'ja',
    });

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'バリデーションエラー',
          details: validationResult.error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        {
          status: 400,
          headers: rateLimitResult ? getRateLimitHeaders(rateLimitResult) : {},
        }
      );
    }

    const { meetingId: validatedMeetingId, audioFile, language } = validationResult.data;
    meetingId = validatedMeetingId;

    // 5. ファイルサイズ制限チェック（25MB）
    // CRITICAL: splitAudioIntoChunksが未実装のため、25MB超は拒否
    const MAX_AUDIO_SIZE = 25 * 1024 * 1024; // 25MB
    if (audioFile.size > MAX_AUDIO_SIZE) {
      return NextResponse.json(
        {
          error: '音声ファイルが大きすぎます',
          details: `現在は25MBまでのファイルのみサポートしています。ファイルサイズ: ${(audioFile.size / 1024 / 1024).toFixed(2)}MB`,
        },
        {
          status: 413,
          headers: rateLimitResult ? getRateLimitHeaders(rateLimitResult) : {},
        }
      );
    }

    // 6. 会議の存在確認と所有者チェック
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
    });

    if (!meeting) {
      return NextResponse.json(
        { error: '会議が見つかりません' },
        {
          status: 404,
          headers: rateLimitResult ? getRateLimitHeaders(rateLimitResult) : {},
        }
      );
    }

    if (meeting.userId !== userId) {
      return NextResponse.json(
        { error: 'この会議にアクセスする権限がありません' },
        {
          status: 403,
          headers: rateLimitResult ? getRateLimitHeaders(rateLimitResult) : {},
        }
      );
    }

    // 7. ステータスを「処理中」に更新
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

    // 8. Whisper APIで文字起こし（25MB以下のみサポート）
    // 進捗: 25% - Whisper API呼び出し開始
    await prisma.meeting.update({
      where: { id: meetingId },
      data: { processingProgress: 25 },
    });

    const result = await transcribeAudio(audioFile, { language });
    const results = [result];

    // 進捗: 70% - 文字起こし完了
    await prisma.meeting.update({
      where: { id: meetingId },
      data: { processingProgress: 70 },
    });

    // 9. 結果を統合
    const mergedResult = mergeTranscriptionResults(results);

    console.log(`文字起こし完了: ${mergedResult.text.length}文字, ${mergedResult.segments?.length || 0}セグメント`);

    // 進捗: 80% - データベース保存開始
    await prisma.meeting.update({
      where: { id: meetingId },
      data: { processingProgress: 80 },
    });

    // 10. データベースに保存
    if (mergedResult.segments && mergedResult.segments.length > 0) {
      // セグメント単位でデータベースに保存
      const segmentsToCreate = mergedResult.segments.map((segment, index) => ({
        meetingId: meetingId!,  // nullではないことを保証（バリデーション済み）
        speaker: 'Unknown', // TODO: 話者識別機能を実装後に更新
        text: segment.text.trim(),
        timestamp: Math.floor(segment.start),
        confidence: 1 - segment.no_speech_prob, // 信頼度スコア
        chunkIndex: index,
      }));

      // パフォーマンス最適化: 500件ずつバッチ処理
      const BATCH_SIZE = 500;
      for (let i = 0; i < segmentsToCreate.length; i += BATCH_SIZE) {
        const batch = segmentsToCreate.slice(i, i + BATCH_SIZE);
        await prisma.transcriptSegment.createMany({
          data: batch,
        });
        console.log(
          `バッチ ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(segmentsToCreate.length / BATCH_SIZE)}: ${batch.length}個のセグメントを保存`
        );
      }

      console.log(`合計 ${segmentsToCreate.length}個のセグメントをデータベースに保存しました`);
    }

    // 11. 会議情報を更新（ステータス、時間）
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

    // 12. レスポンス
    return NextResponse.json({
      success: true,
      text: mergedResult.text,
      duration: mergedResult.duration,
      segmentCount: mergedResult.segments?.length || 0,
      language: mergedResult.language,
    }, {
      headers: rateLimitResult ? getRateLimitHeaders(rateLimitResult) : {},
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
      {
        status: 500,
        headers: rateLimitResult ? getRateLimitHeaders(rateLimitResult) : {},
      }
    );
  }
}
