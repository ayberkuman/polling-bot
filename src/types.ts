export interface ExamDateInfo {
  examDate: string;
  applicationDeadline: string;
  rawText: string;
  lastChecked: Date;
}

export interface UserRequest {
  chatId: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  requestTime: Date;
}

export interface BotState {
  lastExamDate: string | null;
  lastApplicationDeadline: string | null;
  lastNotificationSent: Date | null;
  isInitialized: boolean;
  subscribedChatIds: number[];
  pendingRequests: UserRequest[];
  adminChatId?: number;
}

export interface ScrapedData {
  examDate: string;
  applicationDeadline: string;
  rawText: string;
}
