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
      model: 'gpt-4-turbo-preview',
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
    let result: SummaryResult;
    try {
      result = JSON.parse(content);
    } catch (parseError) {
      console.error('JSON解析エラー:', parseError);
      console.error('受信したコンテンツ:', content);
      throw new Error('GPT-4のレスポンスをJSON形式で解析できませんでした');
    }

    // 必須フィールドの検証
    if (!result.summary) {
      throw new Error('要約が生成されませんでした');
    }

    // 型安全な変換
    const summary: MeetingSummary = {
      summary: result.summary,
      keyPoints: Array.isArray(result.keyPoints) ? result.keyPoints : [],
      actionItems: Array.isArray(result.actionItems)
        ? result.actionItems.map((item) => ({
            task: item.task,
            assignee: item.assignee,
            dueDate: item.dueDate,
          }))
        : [],
      decisions: Array.isArray(result.decisions) ? result.decisions : [],
      nextSteps: Array.isArray(result.nextSteps) ? result.nextSteps : [],
    };

    return summary;
  } catch (error) {
    // エラーハンドリング
    if (error instanceof Error) {
      console.error('要約生成エラー:', error.message);
      throw new Error(`要約生成に失敗しました: ${error.message}`);
    }
    throw new Error('要約生成中に不明なエラーが発生しました');
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
      model: 'gpt-4-turbo-preview',
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
    if (error instanceof Error) {
      console.error('カスタムプロンプト実行エラー:', error.message);
      throw new Error(`回答生成に失敗しました: ${error.message}`);
    }
    throw new Error('回答生成中に不明なエラーが発生しました');
  }
}
