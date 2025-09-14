export interface ExamDateInfo {
  examDate: string;
  applicationDeadline: string;
  rawText: string;
  lastChecked: Date;
}

export interface BotState {
  lastExamDate: string | null;
  lastApplicationDeadline: string | null;
  lastNotificationSent: Date | null;
  isInitialized: boolean;
  subscribedChatIds: number[];
}

export interface ScrapedData {
  examDate: string;
  applicationDeadline: string;
  rawText: string;
}
