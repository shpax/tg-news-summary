import { TelegramNewsSource } from '../services/telegram-news-source';
import { MongoDBStorage } from '../services/mongodb-storage';
import { ConfigLoader } from '../config/config-loader';
import { CollectNewsInput, CollectNewsOutput } from '../types/step-functions-state';

export const handler = async (event: CollectNewsInput): Promise<CollectNewsOutput> => {
  console.log('CollectNews Lambda started', { event });

  const storage = new MongoDBStorage();

  try {
    await storage.connect();
    console.log('Connected to MongoDB');

    // Load channel configuration
    const configLoader = ConfigLoader.getInstance();
    const channelConfig = configLoader.loadChannelConfig();

    const enabledChannels = channelConfig.channels.filter((c) => c.enabled);
    const hoursBack = event.channelConfigOverride?.hoursBack ?? channelConfig.settings.hoursBack;

    console.log(`Collecting news from ${enabledChannels.length} channels (${hoursBack} hours back)...`);

    // Collect news from Telegram channels
    const newsSource = new TelegramNewsSource();
    const newPosts = await newsSource.collectNews(enabledChannels, hoursBack);

    console.log(`Collected ${newPosts.length} new posts from Telegram`);

    // Save new posts to MongoDB
    if (newPosts.length > 0) {
      await storage.savePosts(newPosts);
      console.log(`Saved ${newPosts.length} new posts to database`);
    }

    // Get unprocessed posts from MongoDB (includes posts from failed previous runs)
    const unprocessedPosts = await storage.getUnprocessedPosts(hoursBack);
    console.log(`Retrieved ${unprocessedPosts.length} unprocessed posts from database`);

    // Combine new posts and unprocessed posts, then deduplicate by ID
    const allPosts = [...newPosts, ...unprocessedPosts];
    const uniquePosts = Array.from(
      new Map(allPosts.map((post) => [post.id, post])).values()
    );

    console.log(`Total unique posts after deduplication: ${uniquePosts.length}`);

    if (uniquePosts.length === 0) {
      console.log('No posts to process');
      return {
        executionId: event.executionId,
        collectedPostsCount: 0,
        filteredPostsCount: 0,
        postIds: [],
        hoursBack,
        minPostLength: channelConfig.settings.minPostLength,
        timestamp: new Date().toISOString(),
        status: 'no_posts',
      };
    }

    // Filter posts by minimum length
    const filteredPosts = uniquePosts.filter(
      (post) => post.content.length >= channelConfig.settings.minPostLength
    );

    if (filteredPosts.length === 0) {
      console.log('No posts meet minimum length requirements');
      return {
        executionId: event.executionId,
        collectedPostsCount: uniquePosts.length,
        filteredPostsCount: 0,
        postIds: [],
        hoursBack,
        minPostLength: channelConfig.settings.minPostLength,
        timestamp: new Date().toISOString(),
        status: 'no_posts',
      };
    }

    console.log(`Processing ${filteredPosts.length} posts that meet requirements (${newPosts.length} new + ${unprocessedPosts.length} unprocessed)`);

    return {
      executionId: event.executionId,
      collectedPostsCount: uniquePosts.length,
      filteredPostsCount: filteredPosts.length,
      postIds: filteredPosts.map((p) => p.id),
      hoursBack,
      minPostLength: channelConfig.settings.minPostLength,
      timestamp: new Date().toISOString(),
      status: 'success',
    };
  } catch (error) {
    console.error('Error in CollectNews Lambda:', error);
    throw error;
  } finally {
    try {
      await storage.disconnect();
      console.log('Disconnected from MongoDB');
    } catch (error) {
      console.error('Error disconnecting from MongoDB:', error);
    }
  }
};
