#!/usr/bin/env node

/**
 * Test Script for IELTS Monitor Bot
 *
 * This script helps test the bot functionality without running the full scheduler.
 */

const { execSync } = require("child_process");
const fs = require("fs");

console.log("🧪 IELTS Monitor Bot Test Script");
console.log("================================\n");

// Check if .env file exists
if (!fs.existsSync(".env")) {
  console.error("❌ .env file not found. Please create it from env.example");
  process.exit(1);
}

// Load environment variables
require("dotenv").config();

if (!process.env.BOT_TOKEN) {
  console.error("❌ BOT_TOKEN not found in .env file");
  process.exit(1);
}

if (!process.env.CHAT_IDS) {
  console.error("❌ CHAT_IDS not found in .env file");
  process.exit(1);
}

console.log("📋 Configuration:");
console.log(`   Bot Token: ${process.env.BOT_TOKEN.substring(0, 10)}...`);
console.log(`   Chat IDs: ${process.env.CHAT_IDS}`);
console.log(
  `   Target URL: ${
    process.env.TARGET_URL || "http://prep.bilkent.edu.tr/ielts/"
  }`
);
console.log(
  `   Check Interval: ${process.env.CHECK_INTERVAL || "5"} minutes\n`
);

// Build the project first
console.log("🔨 Building TypeScript...");
try {
  execSync("npm run build", { stdio: "inherit" });
  console.log("✅ Build completed\n");
} catch (error) {
  console.error("❌ Build failed:", error.message);
  process.exit(1);
}

// Import the bot
console.log("🤖 Loading bot...");
try {
  const { IELTSMonitorBot } = require("./dist/index");

  const bot = new IELTSMonitorBot();

  console.log("✅ Bot loaded successfully\n");

  // Test web scraping
  console.log("🌐 Testing web scraping...");
  bot
    .manualCheck()
    .then(() => {
      console.log("✅ Web scraping test completed\n");

      // Show current status
      console.log("📊 Current Status:");
      const status = bot.getStatus();
      console.log(`   Running: ${status.isRunning}`);
      console.log(`   Last Exam Date: ${status.lastExamDate || "Not set"}`);
      console.log(
        `   Last Application Deadline: ${
          status.lastApplicationDeadline || "Not set"
        }`
      );
      console.log(
        `   Last Notification: ${status.lastNotificationSent || "Never"}`
      );
      console.log(`   Initialized: ${status.isInitialized}`);
      console.log(`   Target URL: ${status.targetUrl}`);
      console.log(`   Check Interval: ${status.checkInterval} minutes`);
      console.log(`   Chat IDs Count: ${status.chatIdsCount}\n`);

      console.log("🎉 Test completed successfully!");
      console.log("\n💡 To run the bot continuously:");
      console.log("   npm start");
      console.log("\n💡 To run in development mode:");
      console.log("   npm run dev");
    })
    .catch((error) => {
      console.error("❌ Test failed:", error.message);
      process.exit(1);
    });
} catch (error) {
  console.error("❌ Failed to load bot:", error.message);
  process.exit(1);
}
