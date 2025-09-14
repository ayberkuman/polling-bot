#!/usr/bin/env node

/**
 * Google Cloud Functions Deployment Script
 *
 * This script helps deploy the IELTS Monitor Bot to Google Cloud Functions
 * with Cloud Scheduler for periodic execution.
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

console.log("🚀 Google Cloud Functions Deployment Script");
console.log("==========================================\n");

// Check if gcloud is installed
try {
  execSync("gcloud --version", { stdio: "ignore" });
} catch (error) {
  console.error("❌ Google Cloud CLI (gcloud) is not installed.");
  console.error(
    "Please install it from: https://cloud.google.com/sdk/docs/install"
  );
  process.exit(1);
}

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

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID || "your-project-id";
const FUNCTION_NAME = "ielts-monitor-bot";
const REGION = "us-central1";
const SCHEDULE = "*/5 * * * *"; // Every 5 minutes

console.log(`📋 Configuration:`);
console.log(`   Project ID: ${PROJECT_ID}`);
console.log(`   Function Name: ${FUNCTION_NAME}`);
console.log(`   Region: ${REGION}`);
console.log(`   Schedule: ${SCHEDULE}\n`);

// Create deployment package
console.log("📦 Creating deployment package...");

// Create a temporary directory for deployment
const deployDir = "deploy-temp";
if (fs.existsSync(deployDir)) {
  execSync(`rm -rf ${deployDir}`);
}
fs.mkdirSync(deployDir);

// Copy necessary files
const filesToCopy = ["package.json", "src", ".env"];

filesToCopy.forEach((file) => {
  if (fs.existsSync(file)) {
    execSync(`cp -r ${file} ${deployDir}/`);
  }
});

// Create index.js for Cloud Functions
const cloudFunctionCode = `
const { execSync } = require('child_process');
const path = require('path');

// Set up environment
process.env.NODE_ENV = 'production';

// Import the main bot logic
const { IELTSMonitorBot } = require('./dist/index');

exports.ieltsMonitor = async (req, res) => {
  console.log('IELTS Monitor function triggered');

  try {
    // Create and run the bot for one check
    const bot = new IELTSMonitorBot();
    await bot.manualCheck();

    console.log('Check completed successfully');
    res.status(200).send('Check completed successfully');
  } catch (error) {
    console.error('Error in function:', error);
    res.status(500).send('Error occurred: ' + error.message);
  }
};
`;

fs.writeFileSync(path.join(deployDir, "index.js"), cloudFunctionCode);

// Create package.json for Cloud Functions
const cloudPackageJson = {
  name: "ielts-monitor-cloud-function",
  version: "1.0.0",
  main: "index.js",
  dependencies: {
    "node-telegram-bot-api": "^0.66.0",
    axios: "^1.6.0",
    cheerio: "^1.0.0-rc.12",
    "node-cron": "^3.0.3",
    dotenv: "^16.3.1",
  },
};

fs.writeFileSync(
  path.join(deployDir, "package.json"),
  JSON.stringify(cloudPackageJson, null, 2)
);

console.log("✅ Deployment package created\n");

// Deploy to Google Cloud Functions
console.log("🚀 Deploying to Google Cloud Functions...");

try {
  // Set the project
  execSync(`gcloud config set project ${PROJECT_ID}`, { stdio: "inherit" });

  // Deploy the function
  const deployCommand = `gcloud functions deploy ${FUNCTION_NAME} \\
    --runtime nodejs18 \\
    --trigger-http \\
    --allow-unauthenticated \\
    --region ${REGION} \\
    --source ${deployDir} \\
    --entry-point ieltsMonitor \\
    --memory 256MB \\
    --timeout 540s \\
    --set-env-vars BOT_TOKEN="${process.env.BOT_TOKEN}",CHAT_IDS="${
    process.env.CHAT_IDS
  }",TARGET_URL="${
    process.env.TARGET_URL || "http://prep.bilkent.edu.tr/ielts/"
  }",CHECK_INTERVAL="${process.env.CHECK_INTERVAL || "5"}",LOG_LEVEL="${
    process.env.LOG_LEVEL || "info"
  }"`;

  execSync(deployCommand, { stdio: "inherit" });

  console.log("✅ Function deployed successfully\n");

  // Set up Cloud Scheduler
  console.log("⏰ Setting up Cloud Scheduler...");

  const schedulerCommand = `gcloud scheduler jobs create http ielts-monitor-scheduler \\
    --schedule="${SCHEDULE}" \\
    --uri="https://${REGION}-${PROJECT_ID}.cloudfunctions.net/${FUNCTION_NAME}" \\
    --http-method=GET \\
    --time-zone="Europe/Istanbul"`;

  try {
    execSync(schedulerCommand, { stdio: "inherit" });
    console.log("✅ Scheduler created successfully\n");
  } catch (error) {
    console.log(
      "⚠️  Scheduler might already exist. You can create it manually in the Google Cloud Console.\n"
    );
  }

  console.log("🎉 Deployment completed successfully!");
  console.log("\n📋 Next steps:");
  console.log("1. Test the function manually in Google Cloud Console");
  console.log("2. Check the Cloud Scheduler job");
  console.log("3. Monitor the function logs");
  console.log("\n💡 Useful commands:");
  console.log(
    `   View logs: gcloud functions logs read ${FUNCTION_NAME} --region ${REGION}`
  );
  console.log(
    `   Test function: curl https://${REGION}-${PROJECT_ID}.cloudfunctions.net/${FUNCTION_NAME}`
  );
} catch (error) {
  console.error("❌ Deployment failed:", error.message);
  process.exit(1);
} finally {
  // Clean up
  if (fs.existsSync(deployDir)) {
    execSync(`rm -rf ${deployDir}`);
  }
}
