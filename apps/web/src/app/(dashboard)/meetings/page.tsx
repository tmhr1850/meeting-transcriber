import { MeetingList } from '@/components/meetings/MeetingList';

/**
 * 会議一覧ページ
 * ユーザーの全ての会議を一覧表示
 */
export default async function MeetingsPage() {
  // TODO: Prismaを使用してデータベースから会議一覧を取得
  // const session = await auth();
  // const meetings = await prisma.meeting.findMany({
  //   where: { userId: session!.user!.id },
  //   orderBy: { createdAt: 'desc' },
  //   include: {
  //     summary: true,
  //     _count: { select: { segments: true } },
  //   },
  // });

  // 開発中のためダミーデータを使用
  const meetings = [
    {
      id: '1',
      title: 'プロジェクトキックオフミーティング',
      platform: 'google_meet',
      date: new Date('2024-01-15T10:00:00'),
      duration: 3600,
      segmentCount: 150,
    },
    {
      id: '2',
      title: 'デイリースタンドアップ',
      platform: 'zoom',
      date: new Date('2024-01-16T09:00:00'),
      duration: 900,
      segmentCount: 45,
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">私の会議</h1>
      </div>
      <MeetingList meetings={meetings} />
    </div>
  );
}
