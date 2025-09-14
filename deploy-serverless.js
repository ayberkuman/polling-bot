#!/usr/bin/env node

/**
 * Serverless Deployment Helper
 *
 * This script helps deploy the bot to serverless platforms like Vercel, Netlify, etc.
 */

const fs = require("fs");
const path = require("path");

console.log("🚀 Serverless Deployment Helper");
console.log("==============================\n");

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

console.log("📋 Configuration for serverless deployment:");
console.log(`   Bot Token: ${process.env.BOT_TOKEN.substring(0, 10)}...`);
console.log(
  `   Target URL: ${
    process.env.TARGET_URL || "http://prep.bilkent.edu.tr/ielts/"
  }`
);
console.log(
  `   Check Interval: ${process.env.CHECK_INTERVAL || "5"} minutes\n`
);

// Create serverless function
const serverlessFunction = `
// Serverless function for IELTS Monitor Bot
const { IELTSMonitorBot } = require('./dist/index');

exports.handler = async (event, context) => {
  console.log('IELTS Monitor function triggered');

  try {
    // Create and run the bot for one check
    const bot = new IELTSMonitorBot();
    await bot.manualCheck();

    console.log('Check completed successfully');
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Check completed successfully',
        timestamp: new Date().toISOString()
      })
    };
  } catch (error) {
    console.error('Error in function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};
`;

// Create vercel.json for Vercel deployment
const vercelConfig = {
  version: 2,
  builds: [
    {
      src: "dist/index.js",
      use: "@vercel/node",
    },
  ],
  routes: [
    {
      src: "/api/check",
      dest: "dist/index.js",
    },
  ],
  env: {
    BOT_TOKEN: process.env.BOT_TOKEN,
    TARGET_URL: process.env.TARGET_URL || "http://prep.bilkent.edu.tr/ielts/",
    CHECK_INTERVAL: process.env.CHECK_INTERVAL || "5",
    LOG_LEVEL: process.env.LOG_LEVEL || "info",
  },
};

// Create netlify.toml for Netlify deployment
const netlifyConfig = `
[build]
  command = "npm run build"
  functions = "netlify/functions"

[build.environment]
  BOT_TOKEN = "${process.env.BOT_TOKEN}"
  TARGET_URL = "${
    process.env.TARGET_URL || "http://prep.bilkent.edu.tr/ielts/"
  }"
  CHECK_INTERVAL = "${process.env.CHECK_INTERVAL || "5"}"
  LOG_LEVEL = "${process.env.LOG_LEVEL || "info"}"

[[redirects]]
  from = "/api/check"
  to = "/.netlify/functions/check"
  status = 200
`;

// Write files
fs.writeFileSync("netlify/functions/check.js", serverlessFunction);
fs.writeFileSync("vercel.json", JSON.stringify(vercelConfig, null, 2));
fs.writeFileSync("netlify.toml", netlifyConfig);

console.log("✅ Serverless deployment files created:");
console.log("   - netlify/functions/check.js");
console.log("   - vercel.json");
console.log("   - netlify.toml\n");

console.log("📋 Next steps:");
console.log("1. Build the project: npm run build");
console.log("2. Deploy to your preferred platform:");
console.log("   - Vercel: vercel deploy");
console.log("   - Netlify: netlify deploy");
console.log("3. Set up a cron job to call your function:");
console.log("   - Use cron-job.org to call your function URL every 5 minutes");
console.log("   - Or use the platform's built-in scheduler\n");

console.log("⚠️  Important notes:");
console.log("- State will not persist between function calls");
console.log("- Users will need to re-subscribe on each deployment");
console.log("- Consider using a database for production use");
console.log("- The function will run once per call, not continuously\n");

console.log("💡 For production, consider:");
console.log("- Using a database (MongoDB, PostgreSQL, etc.)");
console.log("- Using a VPS instead of serverless");
console.log("- Using Google Cloud Run or AWS ECS for persistent containers");
