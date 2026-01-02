import { TelegramPublisher } from '../services/telegram-publisher';
import { TelegraphPublisher } from '../services/telegraph-publisher';
import { MongoDBStorage } from '../services/mongodb-storage';
import { ConfigLoader } from '../config/config-loader';
import { renderTelegraphArticle } from '../utils/telegraph-renderer';
import { renderTelegramPostWithLink } from '../utils/template-renderer';
import { PublishNewsInput, PublishNewsOutput } from '../types/step-functions-state';

export const handler = async (event: PublishNewsInput): Promise<PublishNewsOutput> => {
  console.log('PublishNews Lambda started', { event });

  const storage = new MongoDBStorage();
  const configLoader = ConfigLoader.getInstance();

  try {
    await storage.connect();
    console.log('Connected to MongoDB');

    // 1. Retrieve summary from MongoDB
    const summary = await storage.getSummaryById(event.summaryId);

    if (!summary) {
      throw new Error(`Summary not found: ${event.summaryId}`);
    }

    console.log(`Retrieved summary ${event.summaryId} from MongoDB`);

    // 2. Load configurations
    const categoryConfig = configLoader.loadCategoryConfig();
    const telegraphConfig = configLoader.loadTelegraphConfig();

    // 3. Publish to Telegraph
    console.log('Publishing article to Telegraph...');
    const telegraphPublisher = new TelegraphPublisher(telegraphConfig);
    const telegraphArticle = renderTelegraphArticle(
      summary.structuredSummary,
      categoryConfig.categories,
      telegraphConfig.authorName
    );

    const telegraphUrl = await telegraphPublisher.publishArticle(telegraphArticle);
    console.log(`Telegraph article published: ${telegraphUrl}`);

    // Save Telegraph URL immediately (in case Telegram fails)
    await storage.updateSummary(summary.id, { telegraphUrl });
    console.log(`Saved Telegraph URL to summary ${summary.id}`);

    // 4. Render short Telegram post with Telegraph link
    console.log('Rendering Telegram post with Telegraph link...');
    const telegramContent = renderTelegramPostWithLink(
      summary.structuredSummary.summary,
      telegraphUrl
    );

    // 5. Publish to Telegram
    const telegramPublisher = new TelegramPublisher();
    const targetChannelId = process.env.TARGET_CHANNEL_ID;

    if (!targetChannelId) {
      throw new Error('TARGET_CHANNEL_ID environment variable is required');
    }

    console.log(`Publishing to Telegram channel ${targetChannelId}...`);
    const published = await telegramPublisher.publishPost(
      telegramContent,
      targetChannelId
    );

    if (!published) {
      throw new Error('Publishing to Telegram failed');
    }

    console.log('Successfully published to Telegram channel');

    // 6. Update summary as published
    const publishedAt = new Date();
    await storage.updateSummary(summary.id, {
      published: true,
      publishedAt,
    });

    console.log(`Updated summary ${summary.id} as published`);

    // 7. Mark source posts as processed
    await storage.markPostsAsProcessed(summary.sourcePostIds);

    console.log(`Marked ${summary.sourcePostIds.length} source posts as processed`);

    return {
      executionId: event.executionId,
      summaryId: summary.id,
      published: true,
      publishedAt: publishedAt.toISOString(),
      telegraphUrl,
      timestamp: new Date().toISOString(),
      status: 'success',
    };
  } catch (error) {
    console.error('Error in PublishNews Lambda:', error);
    throw error; // Fail entire workflow per user preference
  } finally {
    try {
      await storage.disconnect();
      console.log('Disconnected from MongoDB');
    } catch (error) {
      console.error('Error disconnecting from MongoDB:', error);
    }
  }
};
