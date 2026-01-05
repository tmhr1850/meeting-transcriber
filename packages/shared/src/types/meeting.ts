export type Platform = 'google-meet' | 'zoom' | 'teams' | 'upload';

export type MeetingStatus = 'in_progress' | 'completed' | 'processing' | 'failed';

export interface Meeting {
  id: string;
  userId: string;
  title: string;
  platform: Platform;
  status: MeetingStatus;
  startTime: Date;
  endTime?: Date;
  durationSeconds?: number;
  participantCount?: number;
  createdAt: Date;
  updatedAt: Date;
}
