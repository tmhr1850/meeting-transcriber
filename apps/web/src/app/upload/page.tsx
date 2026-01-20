/**
 * 音声ファイルアップロードページ
 * APIのテストと動作確認用
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [language, setLanguage] = useState('ja');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      setError('音声ファイルを選択してください');
      return;
    }

    // ファイルサイズチェック（25MB）
    const maxSize = 25 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('ファイルサイズは25MB以下にしてください');
      return;
    }

    setUploading(true);
    setError('');
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('audioFile', file);
      formData.append('title', title || 'テスト会議');
      formData.append('language', language);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          setError(`レート制限: ${data.error}. ${data.retryAfter}秒後に再試行してください。`);
        } else {
          setError(data.error || 'アップロードに失敗しました');
        }
        return;
      }

      setResult(data);

      // 成功したら会議詳細ページにリダイレクト
      setTimeout(() => {
        router.push(`/meetings/${data.meetingId}`);
      }, 2000);
    } catch (err) {
      setError('ネットワークエラーが発生しました');
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">音声ファイルアップロード</h1>
            <Link
              href="/dashboard"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              ← ダッシュボードに戻る
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-lg bg-white p-6 shadow">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                会議タイトル
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="プロジェクト会議"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label htmlFor="language" className="block text-sm font-medium text-gray-700">
                言語
              </label>
              <select
                id="language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="ja">日本語</option>
                <option value="en">英語</option>
              </select>
            </div>

            <div>
              <label htmlFor="file" className="block text-sm font-medium text-gray-700">
                音声ファイル
              </label>
              <input
                type="file"
                id="file"
                accept="audio/*,.webm,.mp3,.mp4,.wav,.ogg"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-indigo-700 hover:file:bg-indigo-100"
              />
              <p className="mt-2 text-xs text-gray-500">
                対応形式: WebM, MP3, MP4, WAV, OGG（最大25MB）
              </p>
              {file && (
                <p className="mt-2 text-sm text-gray-700">
                  選択されたファイル: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {result && (
              <div className="rounded-md bg-green-50 p-4">
                <p className="text-sm font-medium text-green-800">アップロード成功！</p>
                <p className="mt-1 text-sm text-green-700">
                  会議ID: {result.meetingId}
                </p>
                <p className="mt-1 text-xs text-green-600">
                  2秒後に会議詳細ページに移動します...
                </p>
              </div>
            )}

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={uploading || !file}
                className="flex-1 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {uploading ? 'アップロード中...' : 'アップロードして文字起こし'}
              </button>
              <Link
                href="/dashboard"
                className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
              >
                キャンセル
              </Link>
            </div>
          </form>
        </div>

        {/* レート制限の説明 */}
        <div className="mt-6 rounded-lg bg-yellow-50 p-4">
          <h3 className="text-sm font-medium text-yellow-800">レート制限について</h3>
          <p className="mt-2 text-sm text-yellow-700">
            このAPIには以下のレート制限があります：
          </p>
          <ul className="mt-2 list-inside list-disc text-sm text-yellow-700">
            <li>アップロード: 10リクエスト/時間</li>
            <li>文字起こし: 5リクエスト/時間</li>
          </ul>
          <p className="mt-2 text-xs text-yellow-600">
            制限を超えた場合、429エラーが返されます。
          </p>
        </div>

        {/* OpenAI API Key警告 */}
        <div className="mt-4 rounded-lg bg-blue-50 p-4">
          <h3 className="text-sm font-medium text-blue-800">注意事項</h3>
          <p className="mt-2 text-sm text-blue-700">
            文字起こしにはOpenAI Whisper APIを使用します。環境変数にOPENAI_API_KEYが設定されていることを確認してください。
          </p>
        </div>
      </main>
    </div>
  );
}
