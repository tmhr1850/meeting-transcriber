import Link from 'next/link';
import { Calendar, Clock, MessageSquare } from 'lucide-react';
import { formatDate, formatDuration } from '@/lib/utils';

interface Meeting {
  id: string;
  title: string;
  platform: string;
  date: Date;
  duration: number;
  segmentCount: number;
}

interface MeetingListProps {
  meetings: Meeting[];
}

/**
 * プラットフォーム名のマッピング
 */
const PLATFORM_NAMES = {
  google_meet: 'Google Meet',
  zoom: 'Zoom',
  teams: 'Microsoft Teams',
} as const;

/**
 * 会議一覧コンポーネント
 * 会議のカードリストを表示
 */
export function MeetingList({ meetings }: MeetingListProps) {
  if (meetings.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">まだ会議がありません</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {meetings.map((meeting) => (
        <Link
          key={meeting.id}
          href={`/meetings/${meeting.id}`}
          className="block p-4 bg-white rounded-lg border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all"
        >
          <h3 className="font-semibold text-gray-800 mb-2">{meeting.title}</h3>

          <div className="space-y-1 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(meeting.date)}</span>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{formatDuration(meeting.duration)}</span>
            </div>

            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              <span>{meeting.segmentCount} セグメント</span>
            </div>
          </div>

          <div className="mt-3 inline-flex items-center px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded">
            {PLATFORM_NAMES[meeting.platform as keyof typeof PLATFORM_NAMES] ||
              meeting.platform}
          </div>
        </Link>
      ))}
    </div>
  );
}
