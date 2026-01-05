export interface TranscriptSegment {
  id: string;
  meetingId: string;
  text: string;
  startTime: number; // milliseconds from meeting start
  endTime: number;
  speakerId?: string;
  speakerName?: string;
  language?: string;
  confidence?: number;
  isEdited: boolean;
  originalText?: string;
  createdAt: Date;
}

export interface MeetingSummary {
  id: string;
  meetingId: string;
  summary: string;
  keyPoints: string[];
  actionItems: ActionItem[];
  decisions: string[];
  nextSteps: string[];
  aiModel: string;
  generatedAt: Date;
}

export interface ActionItem {
  description: string;
  assignee?: string;
  dueDate?: string;
  priority?: 'high' | 'medium' | 'low';
}
