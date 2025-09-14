Telegram Bot for Monitoring a Web Page (Node.js + TypeScript)
To implement a Telegram bot that periodically fetches a web page and alerts on date changes, you can use Node.js (with TypeScript) and Telegram’s Bot API. The general approach is:
Create the Telegram bot: Use BotFather to get a bot token.
Set up a Node.js project: Install libraries like node-telegram-bot-api (for interacting with Telegram), axios or node-fetch (for HTTP requests), and cheerio (for HTML parsing).
Write the check-and-notify logic: Fetch the page HTML, parse the target <div> (by class or selector) to extract the date, compare it with the last-seen value, and if changed, send a message.
Schedule periodic checks: Run the script every 5 minutes (e.g. with node-cron or setInterval).
Host the bot: Choose a free or low-cost environment (e.g. serverless or small VPS) to run the script continuously.
Below are the details and considerations for each step.
Setting Up the Telegram Bot
Create bot and obtain token: In Telegram, message BotFather, use /newbot, and get the bot’s token. Keep this token secret.
Choose a Node.js library: A popular choice is node-telegram-bot-api. Install it and its TypeScript types (npm install node-telegram-bot-api and npm install -D @types/node-telegram-bot-api).
Initialize the bot with polling: In your code, create a bot instance with polling (so it continuously checks for updates). For example:
const TelegramBot = require('node-telegram-bot-api');
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
This code (from the library’s README) shows how to start the bot in “polling” mode
github.com
. Polling is simple for one-on-one or group bots and avoids needing a public webhook endpoint.
Handle messages (optional): You can set up handlers (e.g. bot.onText(/\/start/, ...)) if you want the bot to respond to commands. For a passive notifier bot, you may not need to handle incoming messages at all, only send messages.
Fetching and Parsing the Web Page
HTTP request: Use axios, node-fetch, or similar to get the HTML of the page. For example, using axios:
const axios = require('axios');
const response = await axios.get('https://example.com/page');
const html = response.data;
Petter Åstedt’s blog confirms using axios to fetch pages in a Telegram bot context
petterastedt.com
.
Parse HTML with Cheerio: Load the HTML into Cheerio to query elements by CSS selectors. Cheerio is a jQuery-like library for server-side HTML parsing
cheerio.js.org
. For example:
const cheerio = require('cheerio');
const $ = cheerio.load(html);
const dateText = $('div.myDateClass').text().trim();
This finds the <div> with class myDateClass and extracts its text. (Any CSS selector can be used with Cheerio
scrapingbee.com
.) Cheerio is “fast, flexible & elegant” for this purpose
cheerio.js.org
.
Extract the date: Since you know which element holds the date, target that selector. Convert the string to a Date object or keep it as a string to compare with last time. E.g. new Date(dateText) or just use the raw text if it’s a consistent format.
Scheduling the Check (Every 5 Minutes)
Use a scheduler: In Node.js you can use a timer or a cron library. For a simple solution, use node-cron which supports standard cron syntax. For example:
const cron = require('node-cron');
// Run the job every 5 minutes:
cron.schedule('_/5 _ \* \* *', async () => {
// fetch and check the page here...
});
The node-cron package uses UNIX cron syntax to schedule tasks
npmjs.com
. The above runs the callback every 5 minutes.
Alternative: setInterval: You could also simply use setInterval(async () => { ... }, 5*60\*1000); to run every 5 minutes. However, cron syntax is more flexible (e.g. “9 AM to 5 PM only”).
Example: The IsItUp project (a GitHub Telegram bot) does a similar thing, “Every 5 minutes the bot will check the track list” of URLs
github.com
. This shows that a 5-minute polling interval is practical for status checks.
Polling vs Webhook: Using polling (as above) means your bot process must always run. Webhook mode (where Telegram calls your server) requires you to host an HTTPS endpoint, which can be heavier. Polling is usually simpler for bots that only push notifications, especially on low-cost hosting.
Storing State and Comparing Dates
Keep track of the last date: You need to know what the date was on the previous check. You can store this in a variable if your process never restarts, or persist it. For example:
let lastDate = null;
// inside the cron job:
const currentDate = $('div.myDateClass').text().trim();
if (currentDate !== lastDate) {
lastDate = currentDate;
// send message...
}
Persistence options: If your bot might restart or you use ephemeral functions, consider saving the last date externally. Options include writing to a file (if you host on a VPS), or using a small database (SQLite, PostgreSQL, or a cloud store like Firestore/AWS DynamoDB). For a fully serverless approach, you could even encode the last date in a Google Cloud Storage or Secret Manager (though secret manager is intended for secrets).
Comparison logic: Compare the old and new date. If the new date string/Date is greater (newer) than the old one, trigger a notification. If it’s unchanged, do nothing. Ensure to initialize lastDate on the first run (e.g. by setting it to the current value at startup, so you only notify on future changes).
Sending Notifications via Telegram
Prepare recipients: Decide which chats/users get the alert. This could be individual user IDs (store them in code or a config), or a Telegram group chat where you add the bot. For example, keep an array const chatIds = [12345, 67890, ...];.
Notify on change: When you detect a change, use bot.sendMessage(chatId, message) to each target. For example:
for (const id of chatIds) {
bot.sendMessage(id, `Date has changed! New date: ${currentDate}`);
}
Formatting: You can format messages with Markdown or HTML if needed. See the Telegram Bot API docs.
Hosting and Cost Considerations
To run this bot every 5 minutes, you need a running environment. For free or low-cost options:
Serverless (Cloud Functions/Run): Using cloud serverless platforms avoids paying for idle time – you only pay per execution. For example, Google Cloud (with Node.js support) plus Cloud Scheduler can run the bot code every 5 minutes. Claudio Rauso’s tutorial shows a Python bot, but the idea is the same for Node: use Cloud Scheduler to trigger a Cloud Function HTTP endpoint via a cron schedule
medium.com
. Google Cloud Scheduler has a free tier (3 jobs per month free) and Cloud Functions has a perpetual free tier (2 million invocations/month)
medium.com
codecapsules.io
. Rauso estimates such a setup could cost only ~$0.01–0.12/month at a high frequency
medium.com
medium.com
. AWS Lambda with CloudWatch Events or Azure Functions with Timer Trigger similarly have free tiers (AWS Lambda offers ~400k GB-seconds free, Azure Functions free first 12 months)
codecapsules.io
.
Cron-job services: If you prefer keeping your code in a simple web server (e.g. a small Express app on Heroku or Glitch), you could use a free scheduler like cron-job.org. It can call your URL on any schedule (up to once per minute, free)
cron-job.org
. Your endpoint would run the check and send Telegram messages. Cron-job.org advertises “Absolutely free” scheduled HTTP jobs
cron-job.org
.
Free dynos/tiers:
Heroku used to offer free dynos which could host a Telegram bot (with polling) continuously
codecapsules.io
. (Heroku’s free plan has changed over time, so check current limits.)
Replit, Glitch, or Railway: Some platforms allow always-on Node processes (possibly requiring an uptime ping service to stay awake). For example, users often keep a Replit project alive with UptimeRobot pings.
Pipedream: An integration platform where you can run Node.js code on a schedule. Pipedream has a free tier and makes cron scheduling easy (though it has rate limits).
Cheap VPS or always-on server: A small VPS (e.g. $5/month on DigitalOcean or AWS Lightsail) can host Node.js and run a cron job or always-on process. This is more setup but gives full control. However, if free is the priority, serverless or cron services are preferable.
Data persistence: Note that on ephemeral servers (like AWS Lambda or Cloud Functions), writing to disk won’t persist between runs. You’d need an external store (e.g. a cloud-hosted database or file storage) if you need to remember the last date between invocations. On a VM or container, you can simply keep a file or in-memory variable.
Example Code Snippet
Below is a simplified example of the core logic in Node.js/TypeScript-like syntax. (Error handling and config details omitted for brevity.)
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const cheerio = require('cheerio');
const cron = require('node-cron');

// Initialize bot with polling
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
const chatIds = [/* Telegram chat IDs to notify */];

// Store last seen date (as string or timestamp)
let lastDate = null;

// Schedule the task every 5 minutes
cron.schedule('_/5 _ \* \* \*', async () => {
try {
// Fetch the page
const res = await axios.get('https://example.com/yourpage');
const $ = cheerio.load(res.data);

    // Extract the date from the known div/class
    const dateText = $('div.myDateClass').text().trim();
    if (!dateText) return;  // handle missing element

    // If changed since last check, notify
    if (lastDate === null) {
      lastDate = dateText;  // initialize on first run
    } else if (dateText !== lastDate) {
      lastDate = dateText;
      // Send message to all targets
      for (const id of chatIds) {
        bot.sendMessage(id, `🗓️ Date updated to **${dateText}**.`);
      }
    }

} catch (err) {
console.error('Error during scheduled check:', err);
}
});
This code uses axios and cheerio exactly as in practice
petterastedt.com
, and uses node-cron with a cron string '_/5 _ \* \* \*' to run every five minutes
npmjs.com
. The bot.sendMessage calls will push updates to your Telegram chats.
Key Points and References
Telegram Bot API (Node): Use node-telegram-bot-api (with TypeScript definitions) to interface with Telegram
github.com
.
HTML parsing: Cheerio is ideal for extracting elements from HTML in Node.js
cheerio.js.org
. Using axios + cheerio to scrape content is a common approach
petterastedt.com
.
Scheduling: Node packages like node-cron let you schedule tasks with cron syntax
npmjs.com
. The IsItUp bot example even checks a site every 5 minutes
github.com
.
Cost-effective hosting: Serverless options (Google/AWS/Azure Functions) can run cron jobs with very low cost (free tiers available). For example, Google Cloud Scheduler + Cloud Functions can cost only pennies/month at this interval
medium.com
medium.com
. Google Cloud Functions even has 2M free invocations/month
codecapsules.io
. Free cron services (cron-job.org) or small free-tier dynos can also work for hobby projects
cron-job.org
codecapsules.io
.
By combining these pieces, you can build a continuously running bot that checks a website every 5 minutes, detects a changed date in a known element, and sends an alert to your Telegram chats – all potentially using free-tier resources. Sources: Official library docs and tutorials
github.com
cheerio.js.org
petterastedt.com
npmjs.com
; example projects and articles on scheduling and bot hosting
github.com
medium.com
codecapsules.io
cron-job.org
.
Citations

GitHub - yagop/node-telegram-bot-api: Telegram Bot API for NodeJS

https://github.com/yagop/node-telegram-bot-api

I Built a Telegram Bot to Help Me Search for Jobs

https://www.petterastedt.com/posts/i-built-a-telegram-bot-to-help-me-searching-for-jobs

The industry standard for working with HTML in JavaScript | cheerio

https://cheerio.js.org/

How to find HTML elements by class with Cheerio? | ScrapingBee

https://www.scrapingbee.com/webscraping-questions/cheerio/how-to-find-html-elements-by-class-with-cheerio/

node-cron - npm

https://www.npmjs.com/package/node-cron

GitHub - WBerredo/IsItUP: Telegram bot to verify if a website is up or track an URL to be notified when it gets down.

https://github.com/WBerredo/IsItUP

A Telegram bot for scheduled updates powered by Cloud Run Functions | by Claudio Rauso | Medium

https://medium.com/@claudiorauso/a-telegram-bot-for-scheduled-updates-powered-by-cloud-run-functions-c6ac631592be

A Telegram bot for scheduled updates powered by Cloud Run Functions | by Claudio Rauso | Medium

https://medium.com/@claudiorauso/a-telegram-bot-for-scheduled-updates-powered-by-cloud-run-functions-c6ac631592be

Comparing telegram bot hosting providers

https://www.codecapsules.io/blog/comparing-telegram-bot-hosting-providers

A Telegram bot for scheduled updates powered by Cloud Run Functions | by Claudio Rauso | Medium

https://medium.com/@claudiorauso/a-telegram-bot-for-scheduled-updates-powered-by-cloud-run-functions-c6ac631592be

Comparing telegram bot hosting providers

https://www.codecapsules.io/blog/comparing-telegram-bot-hosting-providers
Free cronjobs - from minutely to once a year. - cron-job.org

https://cron-job.org/en/

Comparing telegram bot hosting providers

https://www.codecapsules.io/blog/comparing-telegram-bot-hosting-providers
All Sources
