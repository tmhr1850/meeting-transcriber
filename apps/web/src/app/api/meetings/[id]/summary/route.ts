/**
 * 会議要約生成APIエンドポイント
 *
 * GET /api/meetings/[id]/summary - 既存の要約を取得
 * POST /api/meetings/[id]/summary - 要約を生成してDBに保存
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@meeting-transcriber/database';
import { generateMeetingSummary, type MeetingSummary, MeetingSummarySchema } from '@/lib/openai/summary';
import type { GenerateSummaryResponse } from '@meeting-transcriber/shared';
import { summaryRateLimit, checkRateLimit } from '@/lib/ratelimit';

/**
 * 既存の要約を取得
 *
 * @param request - Next.js Request
 * @param params - URL パラメータ
 * @returns 要約データまたはエラー
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 認証チェック
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: '認証が必要です' } },
        { status: 401 }
      );
    }

    const meetingId = params.id;

    // 会議データを取得
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      select: {
        id: true,
        userId: true,
        title: true,
        summary: true,
        keyPoints: true,
        actionItems: true,
        decisions: true,
        nextSteps: true,
        updatedAt: true,
      },
    });

    // 会議の存在確認
    if (!meeting) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: '会議が見つかりません' } },
        { status: 404 }
      );
    }

    // 権限チェック
    if (meeting.userId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'アクセス権限がありません' } },
        { status: 403 }
      );
    }

    // 要約が存在しない場合
    if (!meeting.summary) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SUMMARY_NOT_FOUND',
            message: '要約が生成されていません。POST /api/meetings/[id]/summary で生成してください',
          },
        },
        { status: 404 }
      );
    }

    // 要約データを構築してバリデーション
    const summaryCandidate = {
      summary: meeting.summary,
      keyPoints: Array.isArray(meeting.keyPoints) ? meeting.keyPoints : [],
      actionItems: Array.isArray(meeting.actionItems) ? meeting.actionItems : [],
      decisions: Array.isArray(meeting.decisions) ? meeting.decisions : [],
      nextSteps: Array.isArray(meeting.nextSteps) ? meeting.nextSteps : [],
    };

    // Zodバリデーション
    const validationResult = MeetingSummarySchema.safeParse(summaryCandidate);
    if (!validationResult.success) {
      console.error('DBから取得した要約データのバリデーションエラー:', validationResult.error.issues);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_SUMMARY_DATA',
            message: '保存された要約データの形式が不正です',
          },
        },
        { status: 500 }
      );
    }

    const response: GenerateSummaryResponse = {
      summary: validationResult.data,
      generatedAt: meeting.updatedAt.toISOString(),
    };

    return NextResponse.json({ success: true, data: response });
  } catch (error) {
    console.error('要約取得エラー:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '要約の取得中にエラーが発生しました',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * 要約を生成してDBに保存
 *
 * @param request - Next.js Request
 * @param params - URL パラメータ
 * @returns 生成された要約データ
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 認証チェック
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: '認証が必要です' } },
        { status: 401 }
      );
    }

    const meetingId = params.id;

    // レート制限チェック
    const rateLimitResult = await checkRateLimit(session.user.id, summaryRateLimit);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: `レート制限を超えました。1時間あたり${rateLimitResult.limit}回までリクエスト可能です。${new Date(rateLimitResult.reset).toLocaleTimeString('ja-JP')}にリセットされます。`,
          },
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.reset.toString(),
          },
        }
      );
    }

    // リクエストボディを解析
    let force = false;
    try {
      const body = await request.json();
      force = body.force === true;
    } catch {
      // ボディが空の場合はデフォルト値を使用
    }

    // 会議データと関連する文字起こしセグメントを取得
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      include: {
        segments: {
          orderBy: { timestamp: 'asc' },
        },
      },
    });

    // 会議の存在確認
    if (!meeting) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: '会議が見つかりません' } },
        { status: 404 }
      );
    }

    // 権限チェック
    if (meeting.userId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'アクセス権限がありません' } },
        { status: 403 }
      );
    }

    // 既に要約が存在する場合、forceフラグがない限りエラー
    if (meeting.summary && !force) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SUMMARY_EXISTS',
            message: '要約は既に生成されています。再生成する場合は force: true を指定してください',
          },
        },
        { status: 409 }
      );
    }

    // 文字起こしテキストの確認
    if (!meeting.segments || meeting.segments.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NO_TRANSCRIPT',
            message: '文字起こしデータがありません。先に文字起こしを実行してください',
          },
        },
        { status: 400 }
      );
    }

    // 文字起こしセグメントを結合して完全なテキストを作成
    const transcript = meeting.segments
      .map((segment: { speaker: string; text: string }) => `${segment.speaker}: ${segment.text}`)
      .join('\n');

    // GPT-4で要約を生成
    let summaryData: MeetingSummary;
    try {
      summaryData = await generateMeetingSummary(transcript, meeting.title);
    } catch (error) {
      console.error('要約生成エラー:', error);

      // ユーザー定義エラー（バリデーション、トークン制限など）はそのまま返す
      const errorMessage =
        error instanceof Error ? error.message : '要約の生成中にエラーが発生しました';

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SUMMARY_GENERATION_FAILED',
            message: errorMessage,
          },
        },
        { status: 500 }
      );
    }

    // DBに要約を保存
    const updatedMeeting = await prisma.meeting.update({
      where: { id: meetingId },
      data: {
        summary: summaryData.summary,
        keyPoints: summaryData.keyPoints,
        actionItems: summaryData.actionItems,
        decisions: summaryData.decisions,
        nextSteps: summaryData.nextSteps,
      },
    });

    const response: GenerateSummaryResponse = {
      summary: summaryData,
      generatedAt: updatedMeeting.updatedAt.toISOString(),
    };

    return NextResponse.json({ success: true, data: response }, { status: 201 });
  } catch (error) {
    console.error('要約生成エラー:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '要約の生成中にエラーが発生しました',
        },
      },
      { status: 500 }
    );
  }
}
