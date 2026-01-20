/**
 * OpenAI API クライアント
 *
 * Whisper API（文字起こし）とGPT-4（要約生成）を使用するための
 * OpenAI クライアントインスタンス
 */

import OpenAI from 'openai';

// 環境変数チェック（ビルド時は警告のみ、実際の使用時にエラーが発生します）
if (!process.env.OPENAI_API_KEY) {
  console.warn(
    '⚠️  Warning: OPENAI_API_KEY環境変数が設定されていません。\n' +
    '   Whisper API機能を使用する場合は環境変数を設定してください。\n' +
    '   詳細: https://platform.openai.com/api-keys'
  );
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy-key-for-build',
});
