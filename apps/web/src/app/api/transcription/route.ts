/**
 * 音声文字起こしAPI
 *
 * OpenAI Whisper APIを使用して音声ファイルを文字起こしします。
 * レート制限: 5リクエスト/時間
 *
 * @module api/transcription
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { auth } from '@/lib/auth';
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rate-limit';

/**
 * OpenAI クライアントを取得（遅延初期化）
 */
function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY環境変数が設定されていません');
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

/**
 * POST /api/transcription
 *
 * 音声ファイルを文字起こしします。
 *
 * @param request - リクエスト
 * @returns レスポンス
 */
export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    // レート制限チェック（5リクエスト/時間）
    const rateLimitResult = await checkRateLimit(
      `transcription:${session.user.id}`,
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

    // OpenAI APIキーが設定されているかチェック
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEYが設定されていません');
      return NextResponse.json(
        { error: 'サーバー設定エラー。管理者に連絡してください。' },
        {
          status: 500,
          headers: getRateLimitHeaders(rateLimitResult),
        }
      );
    }

    // FormDataからファイルを取得
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const language = (formData.get('language') as string) || 'ja'; // デフォルトは日本語

    if (!file) {
      return NextResponse.json(
        { error: 'ファイルが指定されていません' },
        {
          status: 400,
          headers: getRateLimitHeaders(rateLimitResult),
        }
      );
    }

    // ファイルサイズチェック（最大25MB - Whisper APIの制限）
    const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'ファイルサイズが大きすぎます（最大25MB）' },
        {
          status: 400,
          headers: getRateLimitHeaders(rateLimitResult),
        }
      );
    }

    // サポートされている音声フォーマットをチェック
    const SUPPORTED_FORMATS = [
      'audio/webm',
      'audio/wav',
      'audio/mp3',
      'audio/mpeg',
      'audio/m4a',
      'audio/mp4',
      'audio/ogg',
    ];

    if (!SUPPORTED_FORMATS.includes(file.type)) {
      return NextResponse.json(
        {
          error: `サポートされていないファイル形式です。サポート形式: ${SUPPORTED_FORMATS.join(', ')}`,
        },
        {
          status: 400,
          headers: getRateLimitHeaders(rateLimitResult),
        }
      );
    }

    // Whisper APIで文字起こし実行
    const openai = getOpenAIClient();
    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      language: language,
      response_format: 'verbose_json', // タイムスタンプ付きで取得
      timestamp_granularities: ['segment'], // セグメント単位のタイムスタンプ
    });

    // 文字起こし結果をデータベースに保存（実際の実装では、Prismaを使用）
    // const savedTranscription = await prisma.transcription.create({
    //   data: {
    //     userId: session.user.id,
    //     text: transcription.text,
    //     language: transcription.language,
    //     duration: transcription.duration,
    //     segments: transcription.segments,
    //   },
    // });

    return NextResponse.json(
      {
        success: true,
        transcription: {
          text: transcription.text,
          language: transcription.language,
          duration: transcription.duration,
          segments: transcription.segments,
        },
        message: '文字起こしが完了しました',
      },
      {
        status: 200,
        headers: getRateLimitHeaders(rateLimitResult),
      }
    );
  } catch (error) {
    console.error('文字起こしエラー:', error);

    // OpenAI APIのエラーハンドリング
    if (error instanceof OpenAI.APIError) {
      return NextResponse.json(
        {
          error: '文字起こし中にエラーが発生しました',
          details: error.message,
          code: error.code,
        },
        { status: error.status || 500 }
      );
    }

    return NextResponse.json(
      {
        error: '文字起こし中にエラーが発生しました',
        details: error instanceof Error ? error.message : '不明なエラー',
      },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS /api/transcription
 *
 * CORSプリフライトリクエストに対応
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}
