import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export interface Config {
  botToken: string;
  chatIds: number[];
  targetUrl: string;
  checkInterval: number;
  logLevel: string;
}

export const config: Config = {
  botToken: process.env.BOT_TOKEN || '',
  chatIds: process.env.CHAT_IDS
    ? process.env.CHAT_IDS.split(',').map(id => parseInt(id.trim()))
    : [],
  targetUrl: process.env.TARGET_URL || 'http://prep.bilkent.edu.tr/ielts/',
  checkInterval: parseInt(process.env.CHECK_INTERVAL || '1'),
  logLevel: process.env.LOG_LEVEL || 'info'
};

// Validate required configuration
export function validateConfig(): void {
  if (!config.botToken) {
    throw new Error('BOT_TOKEN is required. Please set it in your .env file.');
  }

  if (!config.targetUrl) {
    throw new Error('TARGET_URL is required.');
  }

  // CHAT_IDS is now optional since we use automatic subscription
  if (config.chatIds.length > 0) {
    console.log(`⚠️  Warning: CHAT_IDS is set but will be ignored. The bot now uses automatic subscription.`);
  }
}
