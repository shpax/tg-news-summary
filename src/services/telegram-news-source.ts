import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { Logger } from 'telegram/extensions';
import { Api } from 'telegram/tl';
import { DateTime } from 'luxon';
import { NewsSource, NewsPost, Channel } from '../types';

export class TelegramNewsSource implements NewsSource {
  private client: TelegramClient;
  private sessionString: string;
  private apiId: number;
  private apiHash: string;

  constructor() {
    this.apiId = parseInt(process.env.TELEGRAM_API_ID || '');
    this.apiHash = process.env.TELEGRAM_API_HASH || '';
    this.sessionString = process.env.TELEGRAM_SESSION_STRING || '';

    if (!this.apiId || !this.apiHash || !this.sessionString) {
      throw new Error('Missing Telegram API credentials');
    }

    this.client = this.createClient();

    // Disable all logging in production
    Logger.setLevel('none');
  }

  private createClient(): TelegramClient {
    const session = new StringSession(this.sessionString);
    return new TelegramClient(session, this.apiId, this.apiHash, {
      connectionRetries: 5,
      retryDelay: 3000,
      timeout: 20000,
      requestRetries: 2,
      // Disable update loop - critical for serverless environments
      useWSS: false,
      testServers: false,
      autoReconnect: false,
      // Prevent hanging connections in Lambda
      langCode: 'en',
      systemLangCode: 'en',
      deviceModel: 'Lambda',
      systemVersion: '1.0',
      appVersion: '1.0.0',
    });
  }

  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Operation timed out')), timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  async collectNews(
    channels: Channel[],
    hoursBack: number
  ): Promise<NewsPost[]> {
    // Create a fresh client instance for each operation to prevent hanging connections
    const client = this.createClient();
    let isConnected = false;

    try {
      // Connect with shorter timeout for serverless
      await this.withTimeout(client.connect(), 15000);
      isConnected = true;
      console.log('Connected to Telegram client');

      // Explicitly disable update handling to prevent hanging
      try {
        // Access the private property safely using type assertion
        (client as any)._updateLoop = null;
      } catch (updateError) {
        // If we can't disable the update loop, just log the warning
        console.warn('Could not disable update loop, continuing anyway');
      }

      const posts: NewsPost[] = [];
      const cutoffTime = DateTime.now().minus({ hours: hoursBack });

      for (const channel of channels) {
        if (!channel.enabled) continue;

        try {
          console.log(`Processing channel: ${channel.id}`);

          // Get channel entity with shorter timeout
          const channelEntity = await this.withTimeout(
            client.getEntity(channel.id),
            15000
          );

          // Get messages with shorter timeout
          const messages = await this.withTimeout(
            client.getMessages(channelEntity, {
              limit: 100,
            }),
            20000
          );

          for (const message of messages) {
            if (!message.message || !message.date) continue;

            const messageDate = DateTime.fromSeconds(message.date);
            if (messageDate < cutoffTime) break; // Messages are sorted by date desc

            // Filter out short messages
            if (message.message.length < 50) continue;

            const post: NewsPost = {
              id: `${channel.id}_${message.id}`,
              channelId: channel.id,
              channelName: channel.name,
              content: message.message,
              timestamp: new Date(message.date * 1000),
              messageId: message.id,
              category: channel.category,
              processed: false,
              createdAt: new Date(),
            };

            posts.push(post);
          }
        } catch (error) {
          console.error(`Error collecting from channel ${channel.id}:`, error);
          // Continue with other channels instead of failing completely
        }
      }

      console.log(`Collected ${posts.length} posts total`);
      return posts;
    } catch (error) {
      console.error('Error in collectNews:', error);

      // Handle specific timeout errors
      if (error instanceof Error && error.message.includes('timeout')) {
        throw new Error(
          'Telegram connection timeout - this may be due to network issues or Telegram server problems'
        );
      }

      throw error;
    } finally {
      if (isConnected) {
        try {
          // Force immediate disconnect to prevent hanging
          await this.withTimeout(client.disconnect(), 5000);
          console.log('Disconnected from Telegram client');
        } catch (error) {
          console.error('Error disconnecting from Telegram client:', error);

          // Force cleanup if graceful disconnect fails
          try {
            // Destroy the client to prevent hanging connections
            const clientAny = client as any;
            if (clientAny._sender) {
              clientAny._sender.disconnect();
            }
            client.destroy();
            console.log('Force destroyed Telegram client');
          } catch (destroyError) {
            console.error('Error destroying Telegram client:', destroyError);
          }
        }
      }
    }
  }

  getSourceType(): string {
    return 'telegram';
  }
}
