/**
 * 音声ファイルアップロードAPI
 *
 * Chrome拡張機能から音声ファイルをアップロードするためのエンドポイント。
 * レート制限: 10リクエスト/時間
 *
 * @module api/upload
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rate-limit';

/**
 * POST /api/upload
 *
 * 音声ファイルをアップロードし、一時的に保存します。
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

    // レート制限チェック（10リクエスト/時間）
    const rateLimitResult = await checkRateLimit(
      `upload:${session.user.id}`,
      10,
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

    // FormDataからファイルを取得
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'ファイルが指定されていません' },
        {
          status: 400,
          headers: getRateLimitHeaders(rateLimitResult),
        }
      );
    }

    // ファイルサイズチェック（最大25MB）
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

    // ファイルを一時保存（実際の実装では、S3やCloudinaryなどに保存）
    // ここでは、ファイルをバッファとして読み込み、Base64エンコードして返す
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // ファイルIDを生成（実際の実装では、UUIDなどを使用）
    const fileId = `${Date.now()}-${session.user.id}-${file.name}`;

    // 実際の実装では、ここでファイルをストレージに保存
    // const uploadUrl = await uploadToStorage(buffer, fileId, file.type);

    // 一時的なレスポンス（実際の実装では、アップロードURLを返す）
    return NextResponse.json(
      {
        success: true,
        fileId,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        message: 'ファイルが正常にアップロードされました',
      },
      {
        status: 200,
        headers: getRateLimitHeaders(rateLimitResult),
      }
    );
  } catch (error) {
    console.error('音声ファイルアップロードエラー:', error);
    return NextResponse.json(
      {
        error: 'ファイルのアップロード中にエラーが発生しました',
        details: error instanceof Error ? error.message : '不明なエラー',
      },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS /api/upload
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
