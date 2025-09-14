import * as cron from 'node-cron';
import { config, validateConfig } from './config';
import { TelegramBotManager } from './telegramBot';
import { WebScraper } from './webScraper';
import { StateManager } from './stateManager';
import { logger } from './logger';

class IELTSMonitorBot {
  private telegramBot: TelegramBotManager;
  private webScraper: WebScraper;
  private stateManager: StateManager;
  private isRunning: boolean = false;

  constructor() {
    // Validate configuration
    validateConfig();

    // Initialize components
    this.stateManager = new StateManager();
    this.telegramBot = new TelegramBotManager(this.stateManager);
    this.webScraper = new WebScraper(config.targetUrl);

    logger.info('IELTS Monitor Bot initialized successfully');
  }

  private async checkForDateChanges(): Promise<void> {
    try {
      logger.debug('Starting date check...');

      // Try primary scraping method first
      let scrapedData = await this.webScraper.scrapeExamDates();

      // If primary method fails, try alternative method
      if (!scrapedData) {
        logger.warn('Primary scraping method failed, trying alternative method...');
        scrapedData = await this.webScraper.scrapeExamDatesAlternative();
      }

      if (!scrapedData) {
        logger.error('Both scraping methods failed');
        await this.telegramBot.sendErrorMessage('Web sitesinden veri çekilemedi. Lütfen daha sonra tekrar deneyin.');
        return;
      }

      logger.info(`Scraped data: Exam Date: ${scrapedData.examDate}, Deadline: ${scrapedData.applicationDeadline}`);

      // Check if dates have changed
      const hasChanged = this.stateManager.hasDateChanged(
        scrapedData.examDate,
        scrapedData.applicationDeadline
      );

      if (hasChanged) {
        logger.info('Date change detected! Sending notifications...');

        // Send notification to all registered users
        await this.telegramBot.sendDateChangeNotification(
          scrapedData.examDate,
          scrapedData.applicationDeadline
        );

        // Update state with new dates
        this.stateManager.updateExamDate(
          scrapedData.examDate,
          scrapedData.applicationDeadline
        );

        logger.info('Notifications sent and state updated');
      } else {
        logger.debug('No date changes detected');
      }

      // Initialize state on first successful run
      if (!this.stateManager.isInitialized()) {
        this.stateManager.updateExamDate(
          scrapedData.examDate,
          scrapedData.applicationDeadline
        );
        logger.info('State initialized with current dates');
      }

    } catch (error) {
      logger.error('Error during date check:', error);
      await this.telegramBot.sendErrorMessage(`Tarih kontrolü sırasında hata oluştu: ${error}`);
    }
  }

  public start(): void {
    if (this.isRunning) {
      logger.warn('Bot is already running');
      return;
    }

    logger.info('Starting IELTS Monitor Bot...');
    this.isRunning = true;

    // Schedule the check every 5 minutes
    const cronExpression = `*/${config.checkInterval} * * * *`;
    logger.info(`Scheduling checks every ${config.checkInterval} minutes (cron: ${cronExpression})`);

    cron.schedule(cronExpression, async () => {
      logger.debug('Scheduled check triggered');
      await this.checkForDateChanges();
    });

    // Perform initial check after 10 seconds
    setTimeout(async () => {
      logger.info('Performing initial check...');
      await this.checkForDateChanges();
    }, 10000);

    // Send startup notification
    setTimeout(async () => {
      await this.telegramBot.sendTestMessage();
    }, 15000);

    logger.info('Bot started successfully and is monitoring for changes');
  }

  public stop(): void {
    if (!this.isRunning) {
      logger.warn('Bot is not running');
      return;
    }

    logger.info('Stopping IELTS Monitor Bot...');
    this.isRunning = false;
    this.telegramBot.stopPolling();
    logger.info('Bot stopped successfully');
  }

  // Method to manually trigger a check (useful for testing)
  public async manualCheck(): Promise<void> {
    logger.info('Manual check triggered');
    await this.checkForDateChanges();
  }

  // Method to get current status
  public getStatus(): any {
    const state = this.stateManager.getState();
    return {
      isRunning: this.isRunning,
      lastExamDate: state.lastExamDate,
      lastApplicationDeadline: state.lastApplicationDeadline,
      lastNotificationSent: state.lastNotificationSent,
      isInitialized: state.isInitialized,
      targetUrl: config.targetUrl,
      checkInterval: config.checkInterval,
      chatIdsCount: config.chatIds.length
    };
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  if (bot) {
    bot.stop();
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  if (bot) {
    bot.stop();
  }
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the bot
const bot = new IELTSMonitorBot();
bot.start();

// Export for potential testing or external usage
export { IELTSMonitorBot };
