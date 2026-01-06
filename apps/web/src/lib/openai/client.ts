/**
 * OpenAI API クライアント
 *
 * Whisper API（文字起こし）とGPT-4（要約生成）を使用するための
 * OpenAI クライアントインスタンス
 */

import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  // ビルド時は警告のみ表示
  // ランタイムでOpenAI APIを使用する際にエラーが発生
  console.warn('Warning: OPENAI_API_KEY環境変数が設定されていません');
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy-key-for-build',
});
