/**
 * GPT-4を使用した会議要約・分析機能
 *
 * 文字起こしテキストから以下を抽出:
 * - 要約
 * - キーポイント
 * - アクションアイテム
 * - 決定事項
 * - 次のステップ
 */

import { openai } from './client';
import type { ActionItem } from '@meeting-transcriber/shared';
import { z } from 'zod';
import { encoding_for_model } from 'tiktoken';

/**
 * GPT-4による要約生成結果の型
 * JSON mode で返される構造化データ
 */
interface SummaryResult {
  summary: string;
  keyPoints: string[];
  actionItems: Array<{
    task: string;
    assignee?: string;
    dueDate?: string;
  }>;
  decisions: string[];
  nextSteps: string[];
}

/**
 * Zodスキーマ: ActionItem のバリデーション
 */
export const ActionItemSchema = z.object({
  task: z.string(),
  assignee: z.string().optional(),
  dueDate: z.string().optional(),
});

/**
 * Zodスキーマ: MeetingSummary のバリデーション
 */
export const MeetingSummarySchema = z.object({
  summary: z.string(),
  keyPoints: z.array(z.string()),
  actionItems: z.array(ActionItemSchema),
  decisions: z.array(z.string()),
  nextSteps: z.array(z.string()),
});

/**
 * 簡略化された要約データ型（DBに保存する形式）
 */
export interface MeetingSummary {
  summary: string;
  keyPoints: string[];
  actionItems: ActionItem[];
  decisions: string[];
  nextSteps: string[];
}

/**
 * テキストのトークン数をカウント
 *
 * GPT-4のコンテキスト制限（128K tokens）を超えないようにチェック
 *
 * @param text - カウントするテキスト
 * @param model - 使用するモデル名（デフォルト: gpt-4）
 * @returns トークン数
 */
export function countTokens(text: string, model: string = 'gpt-4'): number {
  try {
    const encoder = encoding_for_model(model as any);
    const tokens = encoder.encode(text);
    const tokenCount = tokens.length;
    encoder.free(); // メモリ解放
    return tokenCount;
  } catch (error) {
    console.error('トークンカウントエラー:', error);
    // フォールバック: 大まかな推定（1トークン ≈ 4文字）
    return Math.ceil(text.length / 4);
  }
}

/**
 * 会議の文字起こしから要約、キーポイント、アクションアイテム等を生成
 *
 * @param transcript - 会議の完全な文字起こしテキスト
 * @param meetingTitle - 会議タイトル（コンテキスト情報として使用）
 * @returns 要約データ
 * @throws OpenAI APIエラー、JSON解析エラー
 */
export async function generateMeetingSummary(
  transcript: string,
  meetingTitle?: string
): Promise<MeetingSummary> {
  // 入力検証
  if (!transcript || transcript.trim().length === 0) {
    throw new Error('文字起こしテキストが空です');
  }

  // トークン数チェック（GPT-4のコンテキスト制限: 128K tokens）
  // 安全のため100K tokensを上限とする
  const tokenCount = countTokens(transcript);
  const maxTokens = 100000;
  if (tokenCount > maxTokens) {
    throw new Error(
      `文字起こしテキストが長すぎます（${tokenCount.toLocaleString()} tokens）。上限は${maxTokens.toLocaleString()} tokensです。`
    );
  }

  // システムプロンプト: AIの役割と出力形式を定義
  const systemPrompt = `あなたは会議の議事録作成アシスタントです。
会議の文字起こしテキストから以下の情報を抽出し、JSON形式で出力してください。

必須項目:
- summary: 会議全体の要約（2-3文で簡潔に）
- keyPoints: 重要なポイントの配列（3-5個）
- actionItems: アクションアイテムの配列（各項目は {task, assignee?, dueDate?} の形式）
- decisions: 決定事項の配列
- nextSteps: 次のステップの配列

出力形式:
{
  "summary": "会議の要約...",
  "keyPoints": ["ポイント1", "ポイント2", ...],
  "actionItems": [
    {"task": "タスク内容", "assignee": "担当者名", "dueDate": "期限"}
  ],
  "decisions": ["決定事項1", "決定事項2", ...],
  "nextSteps": ["ステップ1", "ステップ2", ...]
}

注意事項:
- 日本語で出力してください
- 具体的で実用的な情報を抽出してください
- 情報がない項目は空配列で返してください
- アクションアイテムの assignee と dueDate は明示的に言及されている場合のみ含めてください`;

  // ユーザープロンプト: 実際の文字起こしテキストを提供
  const userPrompt = meetingTitle
    ? `会議タイトル: ${meetingTitle}\n\n文字起こし:\n${transcript}`
    : `文字起こし:\n${transcript}`;

  try {
    // GPT-4 Turbo を使用して要約を生成
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' }, // JSON modeを有効化
      temperature: 0.3, // 一貫性を重視した低めの温度設定
      max_tokens: 2000, // 十分な出力長を確保
    });

    // レスポンスの検証
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('OpenAI APIからレスポンスが返されませんでした');
    }

    // JSONパース
    let parsedContent: unknown;
    try {
      parsedContent = JSON.parse(content);
    } catch (parseError) {
      console.error('JSON解析エラー:', parseError);
      console.error('受信したコンテンツ:', content);
      throw new Error('GPT-4のレスポンスをJSON形式で解析できませんでした');
    }

    // Zodバリデーション
    const validationResult = MeetingSummarySchema.safeParse(parsedContent);
    if (!validationResult.success) {
      console.error('バリデーションエラー:', validationResult.error.issues);
      console.error('受信したコンテンツ:', parsedContent);
      throw new Error('GPT-4のレスポンスが期待される形式と一致しませんでした');
    }

    return validationResult.data;
  } catch (error) {
    // エラーハンドリング
    console.error('要約生成エラー:', error);

    // ユーザー定義エラー（バリデーションエラーなど）はそのまま投げる
    if (error instanceof Error && !error.message.includes('OpenAI')) {
      throw error;
    }

    // OpenAI APIエラーは一般的なメッセージに置き換え
    throw new Error('要約生成中にエラーが発生しました。しばらくしてから再度お試しください。');
  }
}

/**
 * ユーザーからのカスタム質問に対してGPT-4が回答
 *
 * @param transcript - 会議の文字起こしテキスト
 * @param question - ユーザーの質問
 * @param meetingTitle - 会議タイトル（オプション）
 * @returns AIの回答テキスト
 * @throws OpenAI APIエラー
 */
export async function runCustomPrompt(
  transcript: string,
  question: string,
  meetingTitle?: string
): Promise<string> {
  // 入力検証
  if (!transcript || transcript.trim().length === 0) {
    throw new Error('文字起こしテキストが空です');
  }

  if (!question || question.trim().length === 0) {
    throw new Error('質問が空です');
  }

  // トークン数チェック（GPT-4のコンテキスト制限: 128K tokens）
  // 安全のため100K tokensを上限とする
  const tokenCount = countTokens(transcript + question);
  const maxTokens = 100000;
  if (tokenCount > maxTokens) {
    throw new Error(
      `入力が長すぎます（${tokenCount.toLocaleString()} tokens）。上限は${maxTokens.toLocaleString()} tokensです。`
    );
  }

  // システムプロンプト
  const systemPrompt = `あなたは会議分析アシスタントです。
提供された会議の文字起こしテキストに基づいて、ユーザーの質問に正確に回答してください。

回答のガイドライン:
- 文字起こしテキストに基づいた事実のみを回答してください
- 推測や仮定は避け、確実な情報のみを提供してください
- 情報が不足している場合は、その旨を明示してください
- 日本語で簡潔かつ明確に回答してください`;

  // ユーザープロンプト
  const userPrompt = `${meetingTitle ? `会議タイトル: ${meetingTitle}\n\n` : ''}文字起こし:\n${transcript}\n\n質問: ${question}`;

  try {
    // GPT-4 Turbo を使用して回答を生成
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.5, // バランスの取れた温度設定
      max_tokens: 1000, // 十分な回答長を確保
    });

    // レスポンスの検証
    const answer = response.choices[0]?.message?.content;
    if (!answer) {
      throw new Error('OpenAI APIからレスポンスが返されませんでした');
    }

    return answer.trim();
  } catch (error) {
    // エラーハンドリング
    console.error('カスタムプロンプト実行エラー:', error);

    // ユーザー定義エラー（バリデーションエラーなど）はそのまま投げる
    if (error instanceof Error && !error.message.includes('OpenAI')) {
      throw error;
    }

    // OpenAI APIエラーは一般的なメッセージに置き換え
    throw new Error('回答生成中にエラーが発生しました。しばらくしてから再度お試しください。');
  }
}
