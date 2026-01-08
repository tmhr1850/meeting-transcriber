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
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma, type Platform, type MeetingStatus } from '@meeting-transcriber/database';
import { transcribeAudio, transcribeLongAudio, mergeTranscriptionResults } from '@/lib/openai/whisper';

// セキュリティ: ファイルサイズ上限（25MB）
// CRITICAL: splitAudioIntoChunksが未実装のため、現在は25MBまでのみサポート
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

/**
 * リクエストボディのバリデーションスキーマ
 */
const uploadRequestSchema = z.object({
  audioFile: z.instanceof(File, { message: 'audioFileは必須です' })
    .refine(file => file.size > 0, 'audioFileが空です')
    .refine(
      file => file.size <= MAX_FILE_SIZE,
      `ファイルサイズが大きすぎます。現在は25MBまでのファイルのみサポートしています`
    )
    .refine(
      file => {
        const supportedFormats = ['audio/webm', 'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg'];
        return !file.type || supportedFormats.includes(file.type);
      },
      'サポートされていない音声形式です'
    ),
  title: z.string().optional().default('音声ファイルのアップロード'),
  language: z.string().optional().default('ja'),
});

/**
 * POST /api/upload
 *
 * 音声ファイルをアップロードし、非同期で文字起こし処理を開始します。
 *
 * 認証必須
 *
 * ⚠️ **WARNING: 本番環境での制限事項**
 *
 * この実装は開発・テスト用です。本番環境では以下の制限があります:
 *
 * 1. **タイムアウト制限**
 *    - Vercel無料プラン: 10秒
 *    - Vercel Proプラン: 60秒
 *    - 長時間の文字起こし処理が途中で切断される可能性があります
 *
 * 2. **エラーハンドリングの不足**
 *    - fire-and-forgetパターンのため、エラー追跡が困難
 *    - リトライ機能が実装されていません
 *
 * 3. **レート制限が未実装**
 *    - DoS攻撃のリスクがあります
 *    - 本番環境では必ずレート制限を実装してください
 *    - 推奨ライブラリ: @upstash/ratelimit, @vercel/edge
 *
 * 4. **推奨対応**
 *    本番デプロイ前に必ずバックグラウンドジョブキューを導入してください:
 *    - **Inngest** (推奨): Next.jsと統合が簡単、無料プランあり
 *    - **BullMQ**: Redis必須だが高機能
 *    - **Trigger.dev**: 開発者体験が良い
 */
export async function POST(request: NextRequest) {
  // TODO: レート制限の実装
  // 例: @upstash/ratelimit を使用
  // const ratelimit = new Ratelimit({
  //   redis: Redis.fromEnv(),
  //   limiter: Ratelimit.slidingWindow(10, "1 h"), // 1時間に10リクエスト
  // });
  // const { success } = await ratelimit.limit(session.user.id);
  // if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

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

    // 3. Zodでバリデーション
    const validationResult = uploadRequestSchema.safeParse({
      audioFile: formData.get('audioFile'),
      title: formData.get('title') || '音声ファイルのアップロード',
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
        { status: 400 }
      );
    }

    const { audioFile, title, language } = validationResult.data;

    console.log(`音声ファイルアップロード: ${audioFile.name} (${(audioFile.size / 1024 / 1024).toFixed(2)}MB)`);

    // 4. ファイルサイズ制限チェック（25MB）
    // CRITICAL: splitAudioIntoChunksが未実装のため、25MB超は拒否
    const MAX_AUDIO_SIZE = 25 * 1024 * 1024; // 25MB
    if (audioFile.size > MAX_AUDIO_SIZE) {
      return NextResponse.json(
        {
          error: '音声ファイルが大きすぎます',
          details: `現在は25MBまでのファイルのみサポートしています。ファイルサイズ: ${(audioFile.size / 1024 / 1024).toFixed(2)}MB`,
        },
        { status: 413 } // Payload Too Large
      );
    }

    // 5. 会議レコードを作成
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

    // 進捗: 10% - 処理開始
    await prisma.meeting.update({
      where: { id: meetingId },
      data: { processingProgress: 10 },
    });

    // 1. Whisper APIで文字起こし（25MB以下のみサポート）
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

    // 2. 結果を統合
    const mergedResult = mergeTranscriptionResults(results);

    console.log(`[非同期処理] 文字起こし完了: ${mergedResult.text.length}文字, ${mergedResult.segments?.length || 0}セグメント`);

    // 進捗: 80% - データベース保存開始
    await prisma.meeting.update({
      where: { id: meetingId },
      data: { processingProgress: 80 },
    });

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

      // パフォーマンス最適化: 500件ずつバッチ処理
      const BATCH_SIZE = 500;
      for (let i = 0; i < segmentsToCreate.length; i += BATCH_SIZE) {
        const batch = segmentsToCreate.slice(i, i + BATCH_SIZE);
        await prisma.transcriptSegment.createMany({
          data: batch,
        });
        console.log(
          `[非同期処理] バッチ ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(segmentsToCreate.length / BATCH_SIZE)}: ${batch.length}個のセグメントを保存`
        );
      }

      console.log(`[非同期処理] 合計 ${segmentsToCreate.length}個のセグメントをデータベースに保存しました`);
    }

    // 4. 会議情報を更新（ステータス、時間）
    // 進捗: 100% - 完了
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
