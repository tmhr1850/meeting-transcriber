/**
 * 会議詳細ページ
 * 文字起こし結果と要約を表示
 */

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';

interface MeetingDetailPageProps {
  params: {
    id: string;
  };
}

export default async function MeetingDetailPage({ params }: MeetingDetailPageProps) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  // TODO: Prismaを使用してデータベースから会議情報を取得
  // const meeting = await prisma.meeting.findUnique({
  //   where: { id: params.id, userId: session.user.id },
  //   include: { segments: true, summary: true },
  // });

  // 開発中のためダミーデータを使用
  const meeting = {
    id: params.id,
    title: params.id === '1' ? 'プロジェクトキックオフミーティング' : 'デイリースタンドアップ',
    platform: params.id === '1' ? 'Google Meet' : 'Zoom',
    date: new Date('2024-01-15T10:00:00'),
    duration: params.id === '1' ? 3600 : 900,
    status: 'COMPLETED',
  };

  const segments = [
    {
      id: '1',
      speaker: 'Speaker 1',
      text: 'こんにちは、本日のミーティングを始めます。',
      timestamp: 0,
      confidence: 0.95,
    },
    {
      id: '2',
      speaker: 'Speaker 2',
      text: 'よろしくお願いします。今日のアジェンダを確認しましょう。',
      timestamp: 5,
      confidence: 0.92,
    },
    {
      id: '3',
      speaker: 'Speaker 1',
      text: 'まず最初に、プロジェクトの進捗状況について共有します。',
      timestamp: 12,
      confidence: 0.94,
    },
  ];

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}時間${mins}分`;
    }
    return `${mins}分`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <Link
              href="/meetings"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              ← 会議一覧に戻る
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* 会議情報 */}
        <div className="mb-8 rounded-lg bg-white p-6 shadow">
          <h1 className="text-3xl font-bold text-gray-900">{meeting.title}</h1>
          <div className="mt-4 flex gap-6 text-sm text-gray-600">
            <div>
              <span className="font-medium">プラットフォーム:</span> {meeting.platform}
            </div>
            <div>
              <span className="font-medium">日時:</span> {meeting.date.toLocaleString('ja-JP')}
            </div>
            <div>
              <span className="font-medium">長さ:</span> {formatDuration(meeting.duration)}
            </div>
            <div>
              <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                {meeting.status}
              </span>
            </div>
          </div>
        </div>

        {/* アクションボタン */}
        <div className="mb-6 flex gap-4">
          <button className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            要約を生成
          </button>
          <button className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300">
            エクスポート
          </button>
        </div>

        {/* 文字起こし結果 */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">文字起こし</h2>

          {segments.length === 0 ? (
            <p className="text-gray-500">文字起こし結果がありません</p>
          ) : (
            <div className="space-y-4">
              {segments.map((segment) => (
                <div key={segment.id} className="border-l-4 border-indigo-500 pl-4">
                  <div className="mb-1 flex items-center gap-3">
                    <span className="text-xs font-medium text-gray-500">
                      {formatTime(segment.timestamp)}
                    </span>
                    <span className="text-sm font-medium text-gray-700">
                      {segment.speaker}
                    </span>
                    <span className="text-xs text-gray-400">
                      信頼度: {(segment.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-gray-900">{segment.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 要約セクション（未実装） */}
        <div className="mt-8 rounded-lg bg-blue-50 p-6">
          <h3 className="text-lg font-semibold text-blue-900">AI要約</h3>
          <p className="mt-2 text-sm text-blue-700">
            この機能は開発中です。GPT-4を使用した要約生成機能を実装予定です。
          </p>
        </div>
      </main>
    </div>
  );
}
