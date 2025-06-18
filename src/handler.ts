import { Handler, ScheduledEvent, Context } from 'aws-lambda';

// Load environment variables only in local development
if (
  process.env.NODE_ENV !== 'production' &&
  process.env.AWS_LAMBDA_FUNCTION_NAME === undefined
) {
  require('dotenv').config();
}

import { TelegramNewsSource } from './services/telegram-news-source';
import { ClaudeAIService } from './services/claude-ai-service';
import { TelegramPublisher } from './services/telegram-publisher';
import { MongoDBStorage } from './services/mongodb-storage';
import { NewsProcessor } from './core/news-processor';

export const processNews: Handler<ScheduledEvent> = async (
  event: ScheduledEvent,
  context: Context
) => {
  console.log('Lambda function started', { event, context });

  // Initialize services
  const newsSource = new TelegramNewsSource();
  const aiService = new ClaudeAIService();
  const publishingService = new TelegramPublisher();
  const storageService = new MongoDBStorage();

  try {
    // Connect to MongoDB
    await storageService.connect();
    console.log('Connected to MongoDB');

    // Initialize news processor
    const processor = new NewsProcessor(
      newsSource,
      aiService,
      publishingService,
      storageService
    );

    // Process daily news
    await processor.processDaily();

    console.log('News processing completed successfully');

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'News processing completed successfully',
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (error) {
    console.error('Error in news processing:', error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Error in news processing',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      }),
    };
  } finally {
    // Disconnect from MongoDB
    try {
      await storageService.disconnect();
      console.log('Disconnected from MongoDB');
    } catch (error) {
      console.error('Error disconnecting from MongoDB:', error);
    }
  }
};
