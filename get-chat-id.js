#!/usr/bin/env node

/**
 * Simple script to get chat IDs from Telegram bot
 *
 * This script will show you all chat IDs that interact with your bot.
 */

const TelegramBot = require("node-telegram-bot-api");
require("dotenv").config();

if (!process.env.BOT_TOKEN) {
  console.error("❌ BOT_TOKEN not found in .env file");
  console.error("Please add your bot token to the .env file");
  process.exit(1);
}

console.log("🔍 Chat ID Finder");
console.log("================\n");
console.log(
  "This script will show you chat IDs when users interact with your bot."
);
console.log("Send any message to your bot in Telegram to see your chat ID.\n");

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

// Handle all messages
bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  const username = msg.from.username || "No username";
  const firstName = msg.from.first_name || "No first name";
  const lastName = msg.from.last_name || "";
  const fullName = `${firstName} ${lastName}`.trim();

  console.log("📱 New message received:");
  console.log(`   Chat ID: ${chatId}`);
  console.log(`   Name: ${fullName}`);
  console.log(`   Username: @${username}`);
  console.log(`   Message: "${msg.text || "No text"}"`);
  console.log("   ---");

  // Send a confirmation message
  bot.sendMessage(
    chatId,
    `✅ Your chat ID is: ${chatId}\n\nAdd this to your .env file as CHAT_IDS.`,
    {
      parse_mode: "HTML",
    }
  );
});

// Handle errors
bot.on("error", (error) => {
  console.error("❌ Bot error:", error.message);
});

bot.on("polling_error", (error) => {
  console.error("❌ Polling error:", error.message);
});

console.log("✅ Bot is running and listening for messages...");
console.log("💡 Send any message to your bot to get your chat ID");
console.log("🛑 Press Ctrl+C to stop\n");

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Stopping bot...");
  bot.stopPolling();
  process.exit(0);
});
