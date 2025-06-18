import { v4 as uuidv4 } from 'uuid';
import {
  NewsSource,
  AIService,
  PublishingService,
  StorageService,
  ProcessedSummary,
} from '../types';
import { ConfigLoader } from '../config/config-loader';

export class NewsProcessor {
  constructor(
    private newsSource: NewsSource,
    private aiService: AIService,
    private publishingService: PublishingService,
    private storageService: StorageService
  ) {}

  async processDaily(): Promise<void> {
    const configLoader = ConfigLoader.getInstance();

    try {
      // Load configurations
      const channelConfig = configLoader.loadChannelConfig();
      const promptConfig = configLoader.loadPromptConfig();

      console.log('Starting daily news processing...');

      // Collect news from channels
      const enabledChannels = channelConfig.channels.filter((c) => c.enabled);
      console.log(`Collecting news from ${enabledChannels.length} channels...`);

      let posts;
      try {
        posts = await this.newsSource.collectNews(
          enabledChannels,
          channelConfig.settings.hoursBack
        );
      } catch (error) {
        console.error('Error collecting news from channels:', error);

        // If it's a timeout or connection error, we should still try to continue with cached/stored posts
        if (
          error instanceof Error &&
          (error.message.includes('timeout') ||
            error.message.includes('TIMEOUT'))
        ) {
          console.log(
            'Timeout occurred during news collection. Trying to use previously stored posts...'
          );

          // Try to get unprocessed posts from storage as fallback
          try {
            posts = await this.storageService.getUnprocessedPosts(
              channelConfig.settings.hoursBack
            );
            console.log(`Found ${posts.length} unprocessed posts in storage`);
          } catch (storageError) {
            console.error('Failed to get posts from storage:', storageError);
            throw new Error(
              'Failed to collect news and no fallback posts available'
            );
          }
        } else {
          throw error;
        }
      }

      if (posts.length === 0) {
        console.log('No new posts found');
        return;
      }

      console.log(`Collected ${posts.length} posts`);

      // Save posts to storage (only if we got new posts, not from storage)
      if (posts.length > 0 && !posts[0].processed) {
        console.log(`Saved ${posts.length} posts to database`);
        await this.storageService.savePosts(posts);
      }

      // Filter posts by minimum length
      const filteredPosts = posts.filter(
        (post) => post.content.length >= channelConfig.settings.minPostLength
      );

      if (filteredPosts.length === 0) {
        console.log('No posts meet minimum length requirements');
        return;
      }

      console.log(
        `Processing ${filteredPosts.length} posts that meet requirements`
      );

      // Generate summary using Claude AI
      const summary = await this.aiService.generateSummary(
        filteredPosts,
        promptConfig.summarization.userPrompt
      );

      console.log('Generated summary');

      // Get previous posts for context and style variation
      const previousSummaries =
        await this.storageService.getRecentPublishedSummaries(3);
      const previousPosts = previousSummaries.map((s) => s.telegramPost);

      // Generate Telegram post with previous posts context
      const telegramPost = await this.aiService.generateTelegramPost(
        summary,
        promptConfig.postGeneration.userPrompt,
        previousPosts
      );

      console.log('Generated Telegram post with previous posts context');

      // Create processed summary record
      const processedSummary: ProcessedSummary = {
        id: uuidv4(),
        summary,
        telegramPost,
        sourcePostIds: filteredPosts.map((p) => p.id),
        createdAt: new Date(),
        published: false,
      };

      // Save summary
      await this.storageService.saveSummary(processedSummary);

      // Publish to Telegram channel
      const targetChannelId = process.env.TARGET_CHANNEL_ID;
      if (!targetChannelId) {
        throw new Error('TARGET_CHANNEL_ID environment variable is required');
      }

      const published = await this.publishingService.publishPost(
        telegramPost,
        targetChannelId
      );

      if (published) {
        console.log('Successfully published to Telegram channel');

        // Update summary as published
        await this.storageService.updateSummary(processedSummary.id, {
          published: true,
          publishedAt: new Date(),
        });

        // Mark source posts as processed
        await this.storageService.markPostsAsProcessed(
          filteredPosts.map((p) => p.id)
        );

        console.log('News processing completed successfully');
      } else {
        console.error('Failed to publish to Telegram channel');
        throw new Error('Publishing failed');
      }
    } catch (error) {
      console.error('Error in news processing:', error);
      throw error;
    }
  }
}
