import * as fs from 'fs';
import * as path from 'path';
import { BotState } from './types';
import { logger } from './logger';

export class StateManager {
  private stateFile: string;
  private state: BotState;

  constructor(stateFilePath: string = './bot-state.json') {
    this.stateFile = path.resolve(stateFilePath);
    this.state = this.loadState();
  }

  private loadState(): BotState {
    try {
      if (fs.existsSync(this.stateFile)) {
        const data = fs.readFileSync(this.stateFile, 'utf8');
        const parsedState = JSON.parse(data);

        // Convert date strings back to Date objects
        if (parsedState.lastNotificationSent) {
          parsedState.lastNotificationSent = new Date(parsedState.lastNotificationSent);
        }

        // Ensure subscribedChatIds exists (for backward compatibility)
        if (!parsedState.subscribedChatIds) {
          parsedState.subscribedChatIds = [];
        }

        logger.info('Loaded existing state from file');
        return parsedState;
      }
    } catch (error) {
      logger.error('Error loading state file:', error);
    }

    // Return default state
    return {
      lastExamDate: null,
      lastApplicationDeadline: null,
      lastNotificationSent: null,
      isInitialized: false,
      subscribedChatIds: []
    };
  }

  private saveState(): void {
    try {
      fs.writeFileSync(this.stateFile, JSON.stringify(this.state, null, 2));
      logger.debug('State saved to file');
    } catch (error) {
      logger.error('Error saving state file:', error);
    }
  }

  getState(): BotState {
    return { ...this.state };
  }

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
      return false; // Don't send notification on first run
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

  // Chat ID management methods
  addChatId(chatId: number): boolean {
    if (!this.state.subscribedChatIds.includes(chatId)) {
      this.state.subscribedChatIds.push(chatId);
      this.saveState();
      logger.info(`Added new chat ID: ${chatId}`);
      return true; // New subscription
    }
    return false; // Already subscribed
  }

  removeChatId(chatId: number): boolean {
    const index = this.state.subscribedChatIds.indexOf(chatId);
    if (index > -1) {
      this.state.subscribedChatIds.splice(index, 1);
      this.saveState();
      logger.info(`Removed chat ID: ${chatId}`);
      return true; // Successfully removed
    }
    return false; // Not found
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

  // Method to manually reset state (useful for testing)
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
