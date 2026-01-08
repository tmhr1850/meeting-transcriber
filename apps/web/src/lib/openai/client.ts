/**
 * OpenAI API クライアント
 *
 * Whisper API（文字起こし）とGPT-4（要約生成）を使用するための
 * OpenAI クライアントインスタンス
 */

import OpenAI from 'openai';

// 環境変数チェック
if (!process.env.OPENAI_API_KEY) {
  if (process.env.NODE_ENV === 'production') {
    // 本番環境では明確なエラーを投げる
    throw new Error(
      'OPENAI_API_KEY環境変数が設定されていません。\n' +
      'Whisper APIを使用するには、環境変数にOpenAI APIキーを設定してください。\n' +
      '詳細: https://platform.openai.com/api-keys'
    );
  }
  // 開発・ビルド環境では警告のみ
  console.warn(
    '⚠️  Warning: OPENAI_API_KEY環境変数が設定されていません。\n' +
    '   Whisper API機能を使用する場合は環境変数を設定してください。'
  );
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy-key-for-build',
});
