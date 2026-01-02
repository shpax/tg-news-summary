# Telegram News Summarizer

An automated news summarization application that collects news from Telegram channels, generates AI-powered summaries using Claude AI, and publishes them to a Telegram channel.

## Features

- 📅 **Scheduled Processing**: Runs daily at a configurable time via AWS Lambda
- 📰 **Multi-Channel Support**: Collects news from multiple Telegram channels
- 🤖 **AI-Powered Summaries**: Uses Claude AI to generate intelligent summaries
- 🇺🇦 **Ukrainian Language**: Generates summaries and posts in Ukrainian
- 📝 **Telegraph Articles**: Publishes full summaries to Telegraph with proper formatting
- 📊 **MongoDB Storage**: Stores collected posts and summaries
- 🔧 **Configurable**: Channel lists and AI prompts are fully configurable
- 🚀 **Serverless**: Deploys as AWS Lambda function via Serverless Framework

## Architecture

The application follows a modular architecture with abstract interfaces:

- **News Sources**: Abstract interface for collecting news (currently supports Telegram)
- **AI Service**: Claude AI integration for summarization
- **Publishing Service**: Telegraph API for articles, Telegram Bot API for posts
- **Storage Service**: MongoDB for data persistence
- **Configuration**: JSON-based configuration for channels and prompts

## Prerequisites

1. **Telegram Setup**:

   - Telegram API credentials (api_id, api_hash)
   - User session string for reading channels
   - Bot token for publishing posts
   - Target channel for publishing

2. **Claude AI**:

   - Anthropic API key for Claude AI

3. **MongoDB**:

   - MongoDB Atlas or self-hosted MongoDB instance

4. **Telegraph**:

   - Telegraph account and access token for article publishing

5. **AWS**:
   - AWS account for Lambda deployment
   - AWS CLI configured

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd tg-news-summarizer
```

2. Install dependencies:

```bash
npm install
```

3. Install Serverless Framework globally:

```bash
npm install -g serverless
```

## Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# MongoDB Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/tg-news-summarizer

# Claude AI Configuration
CLAUDE_API_KEY=your_claude_api_key_here

# Telegram Bot Configuration (for publishing)
TELEGRAM_BOT_TOKEN=your_bot_token_here
TARGET_CHANNEL_ID=@your_channel_username_or_chat_id

# Telegram Client Configuration (for reading channels)
TELEGRAM_API_ID=your_api_id_here
TELEGRAM_API_HASH=your_api_hash_here
TELEGRAM_SESSION_STRING=your_session_string_here

# Telegraph Configuration
TELEGRAPH_ACCESS_TOKEN=your_telegraph_access_token_here
TARGET_CHANNEL_NAME=Новини України  # Used as Telegraph article author name
TELEGRAPH_AUTHOR_URL=  # Optional author URL

# Schedule Configuration (optional, defaults to 8 AM UTC daily)
SCHEDULE_RATE=cron(0 15 * * ? *)

# AWS Configuration (if needed)
AWS_REGION=us-east-1
```

### Channel Configuration

Edit `config/channels.json` to configure which channels to monitor:

```json
{
  "channels": [
    {
      "id": "@example_channel1",
      "name": "Example News Channel 1",
      "enabled": true,
      "category": "general"
    }
  ],
  "settings": {
    "maxPostsPerChannel": 50,
    "hoursBack": 24,
    "minPostLength": 100
  }
}
```

### Prompt Configuration

Customize AI prompts in `config/prompts.json`:

```json
{
  "summarization": {
    "systemPrompt": "System prompt for summarization...",
    "userPrompt": "User prompt template with {{variables}}..."
  },
  "postGeneration": {
    "systemPrompt": "System prompt for post generation...",
    "userPrompt": "User prompt template with {{variables}}..."
  }
}
```

## Getting Telegram Credentials

### 1. API Credentials

1. Go to https://my.telegram.org/apps
2. Log in with your phone number
3. Create a new application
4. Note down your `api_id` and `api_hash`

### 2. Session String

You need to generate a session string for your user account. You can use the `telegram` library:

```javascript
const { TelegramApi } = require('telegram');
const { StringSession } = require('telegram/sessions');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

(async () => {
  const session = new StringSession('');
  const client = new TelegramApi(session, API_ID, API_HASH, {
    connectionRetries: 5,
  });

  await client.start({
    phoneNumber: async () =>
      new Promise((resolve) =>
        rl.question('Enter your phone number: ', resolve)
      ),
    password: async () =>
      new Promise((resolve) => rl.question('Enter your password: ', resolve)),
    phoneCode: async () =>
      new Promise((resolve) =>
        rl.question('Enter the code you received: ', resolve)
      ),
    onError: (err) => console.log(err),
  });

  console.log('Session string:', client.session.save());
  rl.close();
})();
```

### 3. Bot Token

1. Message @BotFather on Telegram
2. Create a new bot with `/newbot`
3. Note down the bot token
4. Add the bot to your target channel as an admin

## Getting Telegraph Credentials

Telegraph is used to publish full article versions of news summaries. Telegram posts will contain only a brief summary with a link to the Telegraph article.

### Creating Telegraph Account

You can create a Telegraph account via API:

```bash
curl https://api.telegra.ph/createAccount \
  -d short_name="NewsBot" \
  -d author_name="Новини України"
```

The response will include an `access_token`. Save this token - you'll need it for the `TELEGRAPH_ACCESS_TOKEN` environment variable.

**Important**: Keep your access token secure. It provides full access to your Telegraph account.

Example response:
```json
{
  "ok": true,
  "result": {
    "short_name": "NewsBot",
    "author_name": "Новини України",
    "author_url": "",
    "access_token": "abc123def456..."
  }
}
```

Copy the `access_token` value to your `.env` file.

### How It Works

1. **Collect**: News is collected from configured Telegram channels
2. **Summarize**: Claude AI generates a structured summary with categories
3. **Publish**:
   - Full article (summary + all categories) is published to Telegraph
   - Short post (summary + Telegraph link) is posted to Telegram channel
4. **Users**: Can read brief summary in Telegram or click link for full article on Telegraph

## Development

### Build the project:

```bash
npm run build
```

### Run locally (requires serverless-offline):

```bash
npm run dev
```

### Run tests:

```bash
npm test
```

### Lint code:

```bash
npm run lint
```

## Deployment

### Deploy to AWS:

```bash
npm run deploy
```

### Deploy to specific stage:

```bash
npm run deploy -- --stage production
```

### Deploy to specific region:

```bash
npm run deploy -- --region eu-west-1
```

## Monitoring

The application includes comprehensive logging:

- Lambda function logs in CloudWatch
- Database operations logging
- Error handling and reporting
- Processing statistics

## Extending the Application

### Adding New News Sources

1. Implement the `NewsSource` interface:

```typescript
export class MyNewsSource implements NewsSource {
  async collectNews(
    channels: Channel[],
    hoursBack: number
  ): Promise<NewsPost[]> {
    // Implementation
  }

  getSourceType(): string {
    return 'my-source';
  }
}
```

2. Register in the main handler

### Adding New AI Services

1. Implement the `AIService` interface:

```typescript
export class MyAIService implements AIService {
  async generateSummary(posts: NewsPost[], prompt: string): Promise<string> {
    // Implementation
  }

  async generateTelegramPost(summary: string, prompt: string): Promise<string> {
    // Implementation
  }
}
```

## Troubleshooting

### Common Issues

1. **Telegram Session Expired**: Regenerate the session string
2. **MongoDB Connection**: Check connection string and network access
3. **Claude API Limits**: Monitor API usage and implement rate limiting
4. **Lambda Timeout**: Increase timeout in serverless.yml
5. **Missing Dependencies**: Run `npm install` after pulling changes
6. **Telegraph API Errors**: Check access token validity and network connectivity
7. **Telegraph Content Issues**: Verify content doesn't exceed Telegraph limits

### Logs

Check CloudWatch logs for detailed error information:

```bash
serverless logs -f newsProcessor --tail
```

## Security Considerations

- Store all sensitive credentials in environment variables
- Use MongoDB authentication and SSL
- Implement proper error handling to avoid credential leaks
- Monitor API usage and set up alerts
- Use AWS IAM roles with minimal required permissions

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Support

For issues and questions:

- Check the troubleshooting section
- Review CloudWatch logs
- Create an issue in the repository
