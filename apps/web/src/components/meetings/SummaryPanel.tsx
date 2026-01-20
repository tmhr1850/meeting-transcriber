/**
 * 会議要約パネルコンポーネント
 *
 * 以下の機能を提供:
 * - 要約の表示
 * - キーポイントの表示
 * - アクションアイテムの表示
 * - 決定事項の表示
 * - 次のステップの表示
 * - 要約の再生成
 * - AIへの質問（カスタムプロンプト）
 */

'use client';

import { useState } from 'react';
import type {
  ActionItem,
  GenerateSummaryResponse,
  CustomPromptResponse,
} from '@meeting-transcriber/shared';

/**
 * 簡略化された要約データ型
 */
interface MeetingSummary {
  summary: string;
  keyPoints: string[];
  actionItems: ActionItem[];
  decisions: string[];
  nextSteps: string[];
}

interface SummaryPanelProps {
  /** 会議ID */
  meetingId: string;
  /** 初期要約データ（オプション） */
  initialSummary?: MeetingSummary;
}

/**
 * 要約パネルコンポーネント
 */
export function SummaryPanel({ meetingId, initialSummary }: SummaryPanelProps) {
  // State管理
  const [summary, setSummary] = useState<MeetingSummary | null>(initialSummary || null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * 要約を生成
   */
  const handleGenerateSummary = async (force: boolean = false) => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch(`/api/meetings/${meetingId}/summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ force }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || '要約の生成に失敗しました');
      }

      const result = data.data as GenerateSummaryResponse;
      setSummary(result.summary);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '要約の生成中にエラーが発生しました';
      setError(errorMessage);
      console.error('要約生成エラー:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * 要約を取得
   */
  const handleFetchSummary = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch(`/api/meetings/${meetingId}/summary`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || '要約の取得に失敗しました');
      }

      const result = data.data as GenerateSummaryResponse;
      setSummary(result.summary);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '要約の取得中にエラーが発生しました';
      setError(errorMessage);
      console.error('要約取得エラー:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * AIに質問
   */
  const handleAskQuestion = async () => {
    if (!question.trim()) {
      setError('質問を入力してください');
      return;
    }

    setIsAsking(true);
    setError(null);
    setAnswer(null);

    try {
      const response = await fetch(`/api/meetings/${meetingId}/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || '質問の処理に失敗しました');
      }

      const result = data.data as CustomPromptResponse;
      setAnswer(result.answer);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '質問の処理中にエラーが発生しました';
      setError(errorMessage);
      console.error('質問処理エラー:', err);
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 bg-white rounded-lg shadow">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">会議要約</h2>
        <div className="flex gap-2">
          {!summary && (
            <button
              onClick={() => handleGenerateSummary(false)}
              disabled={isGenerating}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isGenerating ? '生成中...' : '要約を生成'}
            </button>
          )}
          {summary && (
            <>
              <button
                onClick={handleFetchSummary}
                disabled={isGenerating}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isGenerating ? '取得中...' : '要約を更新'}
              </button>
              <button
                onClick={() => handleGenerateSummary(true)}
                disabled={isGenerating}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isGenerating ? '再生成中...' : '要約を再生成'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* 要約コンテンツ */}
      {summary ? (
        <div className="flex flex-col gap-6">
          {/* 要約文 */}
          {summary.summary && (
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">要約</h3>
              <p className="text-gray-700 leading-relaxed">{summary.summary}</p>
            </section>
          )}

          {/* キーポイント */}
          {summary.keyPoints && summary.keyPoints.length > 0 && (
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">キーポイント</h3>
              <ul className="list-disc list-inside space-y-1">
                {summary.keyPoints.map((point, index) => (
                  <li key={index} className="text-gray-700">
                    {point}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* アクションアイテム */}
          {summary.actionItems && summary.actionItems.length > 0 && (
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">アクションアイテム</h3>
              <div className="space-y-2">
                {summary.actionItems.map((item: ActionItem, index) => (
                  <div key={index} className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-gray-900 font-medium">{item.task}</p>
                    {(item.assignee || item.dueDate) && (
                      <div className="mt-1 text-sm text-gray-600 flex gap-4">
                        {item.assignee && <span>担当: {item.assignee}</span>}
                        {item.dueDate && <span>期限: {item.dueDate}</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 決定事項 */}
          {summary.decisions && summary.decisions.length > 0 && (
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">決定事項</h3>
              <ul className="list-disc list-inside space-y-1">
                {summary.decisions.map((decision, index) => (
                  <li key={index} className="text-gray-700">
                    {decision}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* 次のステップ */}
          {summary.nextSteps && summary.nextSteps.length > 0 && (
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">次のステップ</h3>
              <ol className="list-decimal list-inside space-y-1">
                {summary.nextSteps.map((step, index) => (
                  <li key={index} className="text-gray-700">
                    {step}
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* AIへの質問セクション */}
          <section className="pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">AIに質問</h3>
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !isAsking) {
                      handleAskQuestion();
                    }
                  }}
                  placeholder="この会議について質問を入力してください..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isAsking}
                />
                <button
                  onClick={handleAskQuestion}
                  disabled={isAsking || !question.trim()}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {isAsking ? '処理中...' : '質問'}
                </button>
              </div>

              {/* 回答表示 */}
              {answer && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-semibold text-green-900 mb-2">回答:</h4>
                  <p className="text-gray-700 whitespace-pre-wrap">{answer}</p>
                </div>
              )}
            </div>
          </section>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          {isGenerating ? (
            <p>要約を生成中です...</p>
          ) : (
            <p>要約が生成されていません。上のボタンから要約を生成してください。</p>
          )}
        </div>
      )}
    </div>
  );
}
