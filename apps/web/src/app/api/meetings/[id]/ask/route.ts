/**
 * カスタムプロンプトAPIエンドポイント
 *
 * POST /api/meetings/[id]/ask - ユーザーの質問に対してGPT-4が回答
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@meeting-transcriber/database';
import { runCustomPrompt } from '@/lib/openai/summary';
import type { CustomPromptRequest, CustomPromptResponse } from '@meeting-transcriber/shared';

/**
 * ユーザーの質問に対してGPT-4が回答
 *
 * リクエストボディ:
 * {
 *   "question": "この会議で最も重要な決定事項は何ですか?"
 * }
 *
 * @param request - Next.js Request
 * @param params - URL パラメータ
 * @returns AIの回答
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

    // リクエストボディを解析
    let question: string;
    try {
      const body = await request.json();
      question = body.question;

      if (!question || typeof question !== 'string' || question.trim().length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_REQUEST',
              message: '質問が指定されていません',
            },
          },
          { status: 400 }
        );
      }
    } catch (parseError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_JSON',
            message: 'リクエストボディが不正なJSON形式です',
          },
        },
        { status: 400 }
      );
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

    // GPT-4でカスタムプロンプトを実行
    let answer: string;
    try {
      answer = await runCustomPrompt(transcript, question, meeting.title);
    } catch (error) {
      console.error('カスタムプロンプト実行エラー:', error);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'PROMPT_EXECUTION_FAILED',
            message: error instanceof Error ? error.message : '回答の生成に失敗しました',
          },
        },
        { status: 500 }
      );
    }

    const response: CustomPromptResponse = {
      answer,
      processedAt: new Date().toISOString(),
    };

    return NextResponse.json({ success: true, data: response });
  } catch (error) {
    console.error('カスタムプロンプト実行エラー:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '質問の処理中にエラーが発生しました',
        },
      },
      { status: 500 }
    );
  }
}
