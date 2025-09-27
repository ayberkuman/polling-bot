import TelegramBot from 'node-telegram-bot-api';
import { config } from './config';
import { logger } from './logger';
import { StateManager } from './stateManager';
import type { UserRequest } from './types';

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

      // Check if user is already subscribed
      if (this.stateManager.isSubscribed(chatId)) {
        const subscriberCount = this.stateManager.getSubscriberCount();
        const welcomeMessage = `
🎓 *Bilkent IELTS Exam Date Monitor*

✅ *Zaten kayıtlısınız!*

📊 Toplam abone sayısı: ${subscriberCount}

🔧 *Komutlar:*
/status - Bot durumunu kontrol et
/unsubscribe - Bildirimleri durdur
/help - Yardım mesajını göster

Bot aktif ve çalışıyor! 🚀
`;
        this.bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
        return;
      }

      // User is not subscribed, create access request
      const userRequest: UserRequest = {
        chatId: chatId,
        username: msg.from?.username,
        firstName: msg.from?.first_name,
        lastName: msg.from?.last_name,
        requestTime: new Date()
      };

      const requestAdded = this.stateManager.addPendingRequest(userRequest);

      if (requestAdded) {
        // Notify user
        const requestMessage = `
🎓 *Bilkent IELTS Exam Date Monitor*

📝 *Erişim Talebi Gönderildi*

Erişim talebiniz yöneticiye iletildi. Onaylandıktan sonra IELTS sınav tarihi bildirimlerini almaya başlayacaksınız.

⏳ Lütfen onay için bekleyin...

🔧 *Komutlar:*
/status - Talep durumunu kontrol et
/help - Yardım mesajını göster
`;
        this.bot.sendMessage(chatId, requestMessage, { parse_mode: 'Markdown' });

        // Notify admin
        this.notifyAdminOfNewRequest(userRequest);
      } else {
        // Request already exists
        const pendingMessage = `
🎓 *Bilkent IELTS Exam Date Monitor*

⏳ *Bekleyen Talep*

Zaten bir erişim talebiniz bulunmaktadır. Lütfen onay için bekleyin...

🔧 *Komutlar:*
/status - Talep durumunu kontrol et
/help - Yardım mesajını göster
`;
        this.bot.sendMessage(chatId, pendingMessage, { parse_mode: 'Markdown' });
      }

      logger.info(`Access request from user: ${chatId} (${msg.from?.username || 'no username'})`);
    });

    // Handle /status command
    this.bot.onText(/\/status/, (msg) => {
      const chatId = msg.chat.id;
      const subscriberCount = this.stateManager.getSubscriberCount();
      const isSubscribed = this.stateManager.isSubscribed(chatId);
      const pendingRequests = this.stateManager.getPendingRequests();
      const hasPendingRequest = pendingRequests.some(req => req.chatId === chatId);

      let statusMessage = `
📊 *Bot Durumu*

✅ Bot aktif ve çalışıyor
🕐 Son kontrol: ${new Date().toLocaleString('tr-TR')}
🎯 Hedef URL: ${config.targetUrl}
⏰ Kontrol aralığı: ${config.checkInterval} dakika
👥 Toplam abone sayısı: ${subscriberCount}
`;

      if (isSubscribed) {
        statusMessage += `✅ Siz abonesiniz`;
      } else if (hasPendingRequest) {
        statusMessage += `⏳ Bekleyen erişim talebiniz var`;
      } else {
        statusMessage += `❌ Siz abone değilsiniz`;
      }

      statusMessage += `\n\nBot düzenli olarak sınav tarihlerini kontrol ediyor. Değişiklik olduğunda abone olan kullanıcılara bildirim gönderecek.`;

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

    // Handle /subscribe command (only for approved users)
    this.bot.onText(/\/subscribe/, (msg) => {
      const chatId = msg.chat.id;

      if (!this.stateManager.isSubscribed(chatId)) {
        const message = `❌ *Erişim Gerekli*\n\nÖnce erişim talebinde bulunmanız gerekiyor.\n\n/start komutunu kullanarak erişim talebinde bulunabilirsiniz.`;
        this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
        return;
      }

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
/start - Erişim talebinde bulun
/status - Bot durumunu kontrol et
/subscribe - Bildirimleri aktif et (onaylı kullanıcılar için)
/unsubscribe - Bildirimleri durdur
/help - Bu yardım mesajını göster

📞 *Destek:*
Sorularınız için bot geliştiricisi ile iletişime geçebilirsiniz.
      `;

      this.bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
    });

    // Admin commands
    this.setupAdminCommands();

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

  private setupAdminCommands(): void {
    // Set admin command
    this.bot.onText(/\/admin_set (.+)/, (msg, match) => {
      const chatId = msg.chat.id;
      const password = match?.[1];

      if (password !== config.adminPassword) {
        this.bot.sendMessage(chatId, '❌ Geçersiz admin şifresi.', { parse_mode: 'Markdown' });
        logger.warn(`Failed admin attempt from chat ID: ${chatId}`);
        return;
      }

      this.stateManager.setAdminChatId(chatId);
      this.bot.sendMessage(chatId, `✅ Admin olarak ayarlandınız! Chat ID: ${chatId}`, { parse_mode: 'Markdown' });
      logger.info(`Admin set to chat ID: ${chatId}`);
    });

    // List pending requests
    this.bot.onText(/\/admin_requests/, (msg) => {
      const chatId = msg.chat.id;
      if (!this.isAdmin(chatId)) {
        this.bot.sendMessage(chatId, '❌ Bu komut sadece adminler için.', { parse_mode: 'Markdown' });
        return;
      }

      const pendingRequests = this.stateManager.getPendingRequests();
      if (pendingRequests.length === 0) {
        this.bot.sendMessage(chatId, '📋 Bekleyen erişim talebi yok.', { parse_mode: 'Markdown' });
        return;
      }

      let message = `📋 *Bekleyen Erişim Talepleri (${pendingRequests.length}):*\n\n`;
      pendingRequests.forEach((req, index) => {
        const userInfo = `${req.firstName || ''} ${req.lastName || ''}`.trim() || 'İsimsiz';
        const username = req.username ? `@${req.username}` : 'Kullanıcı adı yok';
        const time = req.requestTime.toLocaleString('tr-TR');

        message += `${index + 1}. *${userInfo}*\n`;
        message += `   👤 ${username}\n`;
        message += `   🆔 Chat ID: \`${req.chatId}\`\n`;
        message += `   🕐 ${time}\n\n`;
      });

      message += `\n🔧 *Komutlar:*\n`;
      message += `/admin_approve <chat_id> - Kullanıcıyı onayla\n`;
      message += `/admin_reject <chat_id> - Kullanıcıyı reddet`;

      this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    });

    // Approve user
    this.bot.onText(/\/admin_approve (.+)/, (msg, match) => {
      const chatId = msg.chat.id;
      if (!this.isAdmin(chatId)) {
        this.bot.sendMessage(chatId, '❌ Bu komut sadece adminler için.', { parse_mode: 'Markdown' });
        return;
      }

      const targetChatId = parseInt(match?.[1] || '');
      if (Number.isNaN(targetChatId)) {
        this.bot.sendMessage(chatId, '❌ Geçersiz chat ID.', { parse_mode: 'Markdown' });
        return;
      }

      // Remove from pending requests
      const wasRemoved = this.stateManager.removePendingRequest(targetChatId);
      if (!wasRemoved) {
        this.bot.sendMessage(chatId, `❌ Chat ID ${targetChatId} için bekleyen talep bulunamadı.`, { parse_mode: 'Markdown' });
        return;
      }

      // Add to subscribed users
      this.stateManager.addChatId(targetChatId);
      const subscriberCount = this.stateManager.getSubscriberCount();

      // Notify user
      const approvalMessage = `
🎉 *Erişim Onaylandı!*

✅ IELTS sınav tarihi bildirimlerine erişiminiz onaylandı!

📊 Toplam abone sayısı: ${subscriberCount}

🔧 *Komutlar:*
/status - Bot durumunu kontrol et
/subscribe - Bildirimleri aktif et
/unsubscribe - Bildirimleri durdur

Bot aktif ve çalışıyor! 🚀
`;
      this.bot.sendMessage(targetChatId, approvalMessage, { parse_mode: 'Markdown' });

      // Notify admin
      this.bot.sendMessage(chatId, `✅ Chat ID ${targetChatId} onaylandı ve abone yapıldı.\n📊 Toplam abone sayısı: ${subscriberCount}`, { parse_mode: 'Markdown' });

      logger.info(`User approved: ${targetChatId}`);
    });

    // Reject user
    this.bot.onText(/\/admin_reject (.+)/, (msg, match) => {
      const chatId = msg.chat.id;
      if (!this.isAdmin(chatId)) {
        this.bot.sendMessage(chatId, '❌ Bu komut sadece adminler için.', { parse_mode: 'Markdown' });
        return;
      }

      const targetChatId = parseInt(match?.[1] || '');
      if (Number.isNaN(targetChatId)) {
        this.bot.sendMessage(chatId, '❌ Geçersiz chat ID.', { parse_mode: 'Markdown' });
        return;
      }

      // Remove from pending requests
      const wasRemoved = this.stateManager.removePendingRequest(targetChatId);
      if (!wasRemoved) {
        this.bot.sendMessage(chatId, `❌ Chat ID ${targetChatId} için bekleyen talep bulunamadı.`, { parse_mode: 'Markdown' });
        return;
      }

      // Notify user
      const rejectionMessage = `
❌ *Erişim Reddedildi*

Maalesef erişim talebiniz reddedildi.

Daha fazla bilgi için bot geliştiricisi ile iletişime geçebilirsiniz.
`;
      this.bot.sendMessage(targetChatId, rejectionMessage, { parse_mode: 'Markdown' });

      // Notify admin
      this.bot.sendMessage(chatId, `❌ Chat ID ${targetChatId} reddedildi.`, { parse_mode: 'Markdown' });

      logger.info(`User rejected: ${targetChatId}`);
    });

    // List all users
    this.bot.onText(/\/admin_users/, (msg) => {
      const chatId = msg.chat.id;
      if (!this.isAdmin(chatId)) {
        this.bot.sendMessage(chatId, '❌ Bu komut sadece adminler için.', { parse_mode: 'Markdown' });
        return;
      }

      const subscribedChatIds = this.stateManager.getSubscribedChatIds();
      const subscriberCount = subscribedChatIds.length;

      if (subscriberCount === 0) {
        this.bot.sendMessage(chatId, '👥 Henüz abone yok.', { parse_mode: 'Markdown' });
        return;
      }

      let message = `👥 *Abone Listesi (${subscriberCount}):*\n\n`;
      subscribedChatIds.forEach((id, index) => {
        message += `${index + 1}. Chat ID: \`${id}\`\n`;
      });

      message += `\n🔧 *Komutlar:*\n`;
      message += `/admin_remove <chat_id> - Kullanıcıyı kaldır`;

      this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    });

    // Remove user
    this.bot.onText(/\/admin_remove (.+)/, (msg, match) => {
      const chatId = msg.chat.id;
      if (!this.isAdmin(chatId)) {
        this.bot.sendMessage(chatId, '❌ Bu komut sadece adminler için.', { parse_mode: 'Markdown' });
        return;
      }

      const targetChatId = parseInt(match?.[1] || '');
      if (Number.isNaN(targetChatId)) {
        this.bot.sendMessage(chatId, '❌ Geçersiz chat ID.', { parse_mode: 'Markdown' });
        return;
      }

      const wasRemoved = this.stateManager.removeChatId(targetChatId);
      if (!wasRemoved) {
        this.bot.sendMessage(chatId, `❌ Chat ID ${targetChatId} abone listesinde bulunamadı.`, { parse_mode: 'Markdown' });
        return;
      }

      const subscriberCount = this.stateManager.getSubscriberCount();
      this.bot.sendMessage(chatId, `✅ Chat ID ${targetChatId} abone listesinden kaldırıldı.\n📊 Kalan abone sayısı: ${subscriberCount}`, { parse_mode: 'Markdown' });

      logger.info(`User removed: ${targetChatId}`);
    });
  }

  private isAdmin(chatId: number): boolean {
    const adminChatId = this.stateManager.getAdminChatId();
    return adminChatId === chatId;
  }

  private notifyAdminOfNewRequest(userRequest: UserRequest): void {
    const adminChatId = this.stateManager.getAdminChatId();
    if (!adminChatId) {
      logger.warn('No admin chat ID set, cannot notify of new request');
      return;
    }

    const userInfo = `${userRequest.firstName || ''} ${userRequest.lastName || ''}`.trim() || 'İsimsiz';
    const username = userRequest.username ? `@${userRequest.username}` : 'Kullanıcı adı yok';
    const time = userRequest.requestTime.toLocaleString('tr-TR');
    const pendingCount = this.stateManager.getPendingRequestCount();

    const message = `
🔔 *Yeni Erişim Talebi*

👤 *Kullanıcı:* ${userInfo}
🆔 *Chat ID:* \`${userRequest.chatId}\`
👤 *Kullanıcı Adı:* ${username}
🕐 *Tarih:* ${time}

📋 *Bekleyen Toplam Talep:* ${pendingCount}

🔧 *Komutlar:*
/admin_approve ${userRequest.chatId} - Onayla
/admin_reject ${userRequest.chatId} - Reddet
/admin_requests - Tüm talepleri görüntüle
`;

    this.bot.sendMessage(adminChatId, message, { parse_mode: 'Markdown' });
    logger.info(`Admin notified of new request from ${userRequest.chatId}`);
  }

  getBot(): TelegramBot {
    return this.bot;
  }

  stopPolling(): void {
    this.bot.stopPolling();
    logger.info('Telegram bot polling stopped');
  }
}
