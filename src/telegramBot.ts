import TelegramBot from 'node-telegram-bot-api';
import { config } from './config';
import { logger } from './logger';
import { StateManager } from './stateManager';

export class TelegramBotManager {
  private bot: TelegramBot;
  private stateManager: StateManager;

  constructor(stateManager: StateManager) {
    this.bot = new TelegramBot(config.botToken, { polling: true });
    this.stateManager = stateManager;
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // Handle /start command
    this.bot.onText(/\/start/, (msg) => {
      const chatId = msg.chat.id;
      const isNewUser = this.stateManager.addChatId(chatId);
      const subscriberCount = this.stateManager.getSubscriberCount();

      let welcomeMessage = `
🎓 *Bilkent IELTS Exam Date Monitor*

Bu bot, Bilkent Üniversitesi IELTS sınav tarihlerini takip eder ve değişiklik olduğunda sizi bilgilendirir.

📅 *Mevcut Özellikler:*
• Her 5 dakikada bir sınav tarihlerini kontrol eder
• Tarih değişikliklerinde otomatik bildirim gönderir
• Hem sınav tarihini hem de başvuru son tarihini takip eder

🔧 *Komutlar:*
/status - Bot durumunu kontrol et
/unsubscribe - Bildirimleri durdur
/subscribe - Bildirimleri tekrar başlat
/help - Bu yardım mesajını göster

`;

      if (isNewUser) {
        welcomeMessage += `✅ *Başarıyla kayıt oldunuz!*\n📊 Toplam abone sayısı: ${subscriberCount}\n\n`;
      } else {
        welcomeMessage += `ℹ️ Zaten kayıtlısınız.\n📊 Toplam abone sayısı: ${subscriberCount}\n\n`;
      }

      welcomeMessage += `Bot aktif ve çalışıyor! 🚀`;

      this.bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
      logger.info(`User interaction: ${chatId} (${isNewUser ? 'new' : 'existing'})`);
    });

    // Handle /status command
    this.bot.onText(/\/status/, (msg) => {
      const chatId = msg.chat.id;
      const subscriberCount = this.stateManager.getSubscriberCount();
      const isSubscribed = this.stateManager.isSubscribed(chatId);

      const statusMessage = `
📊 *Bot Durumu*

✅ Bot aktif ve çalışıyor
🕐 Son kontrol: ${new Date().toLocaleString('tr-TR')}
🎯 Hedef URL: ${config.targetUrl}
⏰ Kontrol aralığı: ${config.checkInterval} dakika
👥 Toplam abone sayısı: ${subscriberCount}
${isSubscribed ? '✅ Siz abonesiniz' : '❌ Siz abone değilsiniz'}

Bot düzenli olarak sınav tarihlerini kontrol ediyor. Değişiklik olduğunda abone olan kullanıcılara bildirim gönderecek.
      `;

      this.bot.sendMessage(chatId, statusMessage, { parse_mode: 'Markdown' });
    });

    // Handle /unsubscribe command
    this.bot.onText(/\/unsubscribe/, (msg) => {
      const chatId = msg.chat.id;
      const wasRemoved = this.stateManager.removeChatId(chatId);
      const subscriberCount = this.stateManager.getSubscriberCount();

      if (wasRemoved) {
        const message = `❌ *Bildirimler durduruldu*\n\nArtık IELTS sınav tarihi güncellemeleri almayacaksınız.\n\n📊 Kalan abone sayısı: ${subscriberCount}\n\nBildirimleri tekrar almak için /subscribe komutunu kullanabilirsiniz.`;
        this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
        logger.info(`User unsubscribed: ${chatId}`);
      } else {
        const message = `ℹ️ *Zaten abone değilsiniz*\n\nBildirimleri almak için /start veya /subscribe komutunu kullanabilirsiniz.`;
        this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      }
    });

    // Handle /subscribe command
    this.bot.onText(/\/subscribe/, (msg) => {
      const chatId = msg.chat.id;
      const isNewUser = this.stateManager.addChatId(chatId);
      const subscriberCount = this.stateManager.getSubscriberCount();

      if (isNewUser) {
        const message = `✅ *Bildirimler aktif edildi*\n\nIELTS sınav tarihi güncellemeleri alacaksınız.\n\n📊 Toplam abone sayısı: ${subscriberCount}`;
        this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
        logger.info(`User subscribed: ${chatId}`);
      } else {
        const message = `ℹ️ *Zaten abonesiniz*\n\nIELTS sınav tarihi güncellemeleri almaya devam ediyorsunuz.\n\n📊 Toplam abone sayısı: ${subscriberCount}`;
        this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      }
    });

    // Handle /help command
    this.bot.onText(/\/help/, (msg) => {
      const chatId = msg.chat.id;
      const helpMessage = `
❓ *Yardım*

Bu bot Bilkent Üniversitesi IELTS sınav tarihlerini takip eder.

📋 *Nasıl Çalışır:*
1. Bot her 5 dakikada bir web sitesini kontrol eder
2. Sınav tarihi veya başvuru son tarihi değişirse bildirim gönderir
3. Bildirimler otomatik olarak tüm kayıtlı kullanıcılara gönderilir

🔧 *Komutlar:*
/start - Botu başlat ve otomatik olarak abone ol
/status - Bot durumunu kontrol et
/subscribe - Bildirimleri aktif et
/unsubscribe - Bildirimleri durdur
/help - Bu yardım mesajını göster

📞 *Destek:*
Sorularınız için bot geliştiricisi ile iletişime geçebilirsiniz.
      `;

      this.bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
    });

    // Handle errors
    this.bot.on('error', (error) => {
      logger.error('Telegram bot error:', error);
    });

    // Handle polling errors
    this.bot.on('polling_error', (error) => {
      logger.error('Telegram bot polling error:', error);
    });

    logger.info('Telegram bot event handlers set up successfully');
  }

  async sendDateChangeNotification(examDate: string, applicationDeadline: string): Promise<void> {
    const message = `
🎓 *IELTS Sınav Tarihi Güncellendi!*

📅 **Yeni Sınav Tarihi:** ${examDate}
⏰ **Başvuru Son Tarihi:** ${applicationDeadline}

🔗 [Sınav sayfasını görüntüle](${config.targetUrl})

⚠️ *Önemli:* Sınavdan en az 21 gün önce gerekli belgeleri yüklemeniz gerekmektedir.

Bot tarafından otomatik olarak gönderilmiştir. 🤖
    `;

    const subscribedChatIds = this.stateManager.getSubscribedChatIds();
    const subscriberCount = subscribedChatIds.length;

    logger.info(`Sending date change notification to ${subscriberCount} subscribers`);

    const promises = subscribedChatIds.map(async (chatId) => {
      try {
        await this.bot.sendMessage(chatId, message, {
          parse_mode: 'Markdown',
          disable_web_page_preview: true
        });
        logger.info(`Date change notification sent to chat ${chatId}`);
      } catch (error) {
        logger.error(`Failed to send notification to chat ${chatId}:`, error);
        // If user blocked the bot, remove them from subscribers
        if (error instanceof Error && error.message && error.message.includes('bot was blocked')) {
          this.stateManager.removeChatId(chatId);
          logger.info(`Removed blocked user from subscribers: ${chatId}`);
        }
      }
    });

    await Promise.allSettled(promises);
  }

  async sendErrorMessage(errorMessage: string): Promise<void> {
    const message = `
⚠️ *Bot Hatası*

Bir hata oluştu: ${errorMessage}

Bot çalışmaya devam edecek, ancak bu hatayı kontrol etmeniz gerekebilir.

🕐 Hata zamanı: ${new Date().toLocaleString('tr-TR')}
    `;

    const subscribedChatIds = this.stateManager.getSubscribedChatIds();

    const promises = subscribedChatIds.map(async (chatId) => {
      try {
        await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
        logger.info(`Error notification sent to chat ${chatId}`);
      } catch (error) {
        logger.error(`Failed to send error notification to chat ${chatId}:`, error);
      }
    });

    await Promise.allSettled(promises);
  }

  async sendTestMessage(): Promise<void> {
    const message = `
🧪 *Test Mesajı*

Bot çalışıyor ve mesaj gönderebiliyor!

🕐 Test zamanı: ${new Date().toLocaleString('tr-TR')}
    `;

    const subscribedChatIds = this.stateManager.getSubscribedChatIds();

    const promises = subscribedChatIds.map(async (chatId) => {
      try {
        await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
        logger.info(`Test message sent to chat ${chatId}`);
      } catch (error) {
        logger.error(`Failed to send test message to chat ${chatId}:`, error);
      }
    });

    await Promise.allSettled(promises);
  }

  getBot(): TelegramBot {
    return this.bot;
  }

  stopPolling(): void {
    this.bot.stopPolling();
    logger.info('Telegram bot polling stopped');
  }
}
