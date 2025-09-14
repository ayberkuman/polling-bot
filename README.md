# Bilkent IELTS Exam Date Monitor Bot

A Telegram bot that monitors the Bilkent University IELTS exam dates and sends notifications when dates change.

## Features

- 🕐 **Automatic Monitoring**: Checks the website every 5 minutes
- 📅 **Date Change Detection**: Monitors both exam date and application deadline
- 📱 **Telegram Notifications**: Sends formatted messages to registered users
- 💾 **State Persistence**: Remembers last seen dates to detect changes
- 🔄 **Error Handling**: Robust error handling with user notifications
- 🛠️ **Multiple Scraping Methods**: Fallback methods for reliable data extraction

## Setup Instructions

### 1. Create a Telegram Bot

1. Message [@BotFather](https://t.me/botfather) on Telegram
2. Use `/newbot` command
3. Follow the instructions to create your bot
4. Save the bot token you receive

### 2. Get Chat IDs

1. Start a conversation with your bot
2. Send `/start` command
3. Check the bot logs to see your chat ID
4. Add more users by having them start the bot

### 3. Install Dependencies

```bash
npm install
```

### 4. Configure Environment

1. Copy `env.example` to `.env`:

```bash
cp env.example .env
```

2. Edit `.env` file with your configuration:

```env
BOT_TOKEN=your_telegram_bot_token_here
CHAT_IDS=123456789,987654321
TARGET_URL=http://prep.bilkent.edu.tr/ielts/
CHECK_INTERVAL=5
LOG_LEVEL=info
```

### 5. Build and Run

```bash
# Build TypeScript
npm run build

# Run the bot
npm start

# Or run in development mode
npm run dev
```

## Bot Commands

- `/start` - Initialize the bot and see welcome message
- `/status` - Check bot status and configuration
- `/help` - Show help information

## Configuration Options

| Variable         | Description                                | Default                             |
| ---------------- | ------------------------------------------ | ----------------------------------- |
| `BOT_TOKEN`      | Your Telegram bot token                    | Required                            |
| `CHAT_IDS`       | Comma-separated list of chat IDs to notify | Required                            |
| `TARGET_URL`     | URL to monitor                             | `http://prep.bilkent.edu.tr/ielts/` |
| `CHECK_INTERVAL` | Check interval in minutes                  | `5`                                 |
| `LOG_LEVEL`      | Logging level (error, warn, info, debug)   | `info`                              |

## Deployment Options

### Option 1: Local Development

Run the bot on your local machine for testing and development.

### Option 2: VPS/Server

Deploy on a VPS or dedicated server for 24/7 monitoring.

### Option 3: Cloud Functions (Recommended for Cost-Effectiveness)

#### Google Cloud Functions

1. Create a Google Cloud project
2. Enable Cloud Functions API
3. Deploy using the provided deployment script
4. Set up Cloud Scheduler to trigger the function every 5 minutes

#### AWS Lambda

1. Create a Lambda function
2. Upload the code
3. Set up EventBridge (CloudWatch Events) to trigger every 5 minutes

### Option 4: Free Hosting Services

#### Railway

1. Connect your GitHub repository
2. Set environment variables
3. Deploy automatically

#### Render

1. Create a new Web Service
2. Connect your repository
3. Set environment variables
4. Deploy

## File Structure

```
polling-bot/
├── src/
│   ├── index.ts          # Main application entry point
│   ├── config.ts         # Configuration management
│   ├── types.ts          # TypeScript type definitions
│   ├── logger.ts         # Logging utility
│   ├── webScraper.ts     # Web scraping functionality
│   ├── stateManager.ts   # State persistence
│   └── telegramBot.ts    # Telegram bot management
├── dist/                 # Compiled JavaScript (after build)
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── env.example           # Environment variables template
└── README.md            # This file
```

## Monitoring and Logs

The bot provides comprehensive logging:

- **INFO**: General operation information
- **WARN**: Non-critical issues
- **ERROR**: Critical errors that need attention
- **DEBUG**: Detailed debugging information

## Troubleshooting

### Common Issues

1. **Bot not responding**

   - Check if BOT_TOKEN is correct
   - Verify the bot is started with BotFather

2. **No notifications received**

   - Ensure CHAT_IDS are correct
   - Check if users have started the bot with `/start`

3. **Website scraping fails**

   - The bot has fallback methods
   - Check if the website structure has changed
   - Verify internet connectivity

4. **State not persisting**
   - Check file permissions for `bot-state.json`
   - Ensure the bot has write access to the directory

### Getting Chat IDs

To get chat IDs for notifications:

1. Start the bot and send `/start`
2. Check the bot logs for the chat ID
3. Add the chat ID to your `.env` file

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:

1. Check the troubleshooting section
2. Review the logs for error messages
3. Open an issue on GitHub

## Security Notes

- Keep your BOT_TOKEN secret
- Don't commit `.env` file to version control
- Use environment variables in production
- Regularly update dependencies
# polling-bot
