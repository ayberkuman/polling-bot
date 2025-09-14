import { BotState } from './types';
import { logger } from './logger';

// Simple in-memory database for serverless deployments
class DatabaseManager {
  private static instance: DatabaseManager;
  private state: BotState;

  private constructor() {
    this.state = {
      lastExamDate: null,
      lastApplicationDeadline: null,
      lastNotificationSent: null,
      isInitialized: false,
      subscribedChatIds: []
    };
  }

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  // For serverless: Load from environment variables or external storage
  async loadState(): Promise<BotState> {
    try {
      // Try to load from environment variables (for serverless)
      const envState = process.env.BOT_STATE;
      if (envState) {
        const parsedState = JSON.parse(envState);
        if (parsedState.lastNotificationSent) {
          parsedState.lastNotificationSent = new Date(parsedState.lastNotificationSent);
        }
        if (!parsedState.subscribedChatIds) {
          parsedState.subscribedChatIds = [];
        }
        this.state = parsedState;
        logger.info('Loaded state from environment variables');
        return this.state;
      }

      // Fallback to default state
      logger.info('Using default state (no persistent storage)');
      return this.state;
    } catch (error) {
      logger.error('Error loading state from environment:', error);
      return this.state;
    }
  }

  // For serverless: Save to environment variables or external storage
  async saveState(): Promise<void> {
    try {
      // In serverless, we can't persist to disk, so we log the state
      // In production, you'd save to a database or external storage
      logger.info('State updated (serverless mode - not persisted)');
      logger.debug('Current state:', JSON.stringify(this.state, null, 2));
    } catch (error) {
      logger.error('Error saving state:', error);
    }
  }

  // Chat ID management
  addChatId(chatId: number): boolean {
    if (!this.state.subscribedChatIds.includes(chatId)) {
      this.state.subscribedChatIds.push(chatId);
      this.saveState();
      logger.info(`Added new chat ID: ${chatId}`);
      return true;
    }
    return false;
  }

  removeChatId(chatId: number): boolean {
    const index = this.state.subscribedChatIds.indexOf(chatId);
    if (index > -1) {
      this.state.subscribedChatIds.splice(index, 1);
      this.saveState();
      logger.info(`Removed chat ID: ${chatId}`);
      return true;
    }
    return false;
  }

  getSubscribedChatIds(): number[] {
    return [...this.state.subscribedChatIds];
  }

  getSubscriberCount(): number {
    return this.state.subscribedChatIds.length;
  }

  isSubscribed(chatId: number): boolean {
    return this.state.subscribedChatIds.includes(chatId);
  }

  // Date management
  updateExamDate(examDate: string, applicationDeadline: string): void {
    const hasChanged =
      this.state.lastExamDate !== examDate ||
      this.state.lastApplicationDeadline !== applicationDeadline;

    this.state.lastExamDate = examDate;
    this.state.lastApplicationDeadline = applicationDeadline;
    this.state.lastNotificationSent = new Date();
    this.state.isInitialized = true;

    this.saveState();

    if (hasChanged) {
      logger.info('Exam date information updated');
    }
  }

  hasDateChanged(examDate: string, applicationDeadline: string): boolean {
    if (!this.state.isInitialized) {
      logger.info('First run - initializing with current dates');
      return false;
    }

    return (
      this.state.lastExamDate !== examDate ||
      this.state.lastApplicationDeadline !== applicationDeadline
    );
  }

  getLastNotificationTime(): Date | null {
    return this.state.lastNotificationSent;
  }

  isInitialized(): boolean {
    return this.state.isInitialized;
  }

  getState(): BotState {
    return { ...this.state };
  }

  resetState(): void {
    this.state = {
      lastExamDate: null,
      lastApplicationDeadline: null,
      lastNotificationSent: null,
      isInitialized: false,
      subscribedChatIds: []
    };
    this.saveState();
    logger.info('State has been reset');
  }
}

export { DatabaseManager };
