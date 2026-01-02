import { MongoClient, Db, Collection } from 'mongodb';
import { StorageService, NewsPost, ProcessedSummary } from '../types';

export class MongoDBStorage implements StorageService {
  private client: MongoClient;
  private db!: Db;
  private postsCollection!: Collection<NewsPost>;
  private summariesCollection!: Collection<ProcessedSummary>;
  private stage: string;

  constructor() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGODB_URI environment variable is required');
    }

    this.stage = process.env.STAGE || 'dev';
    this.client = new MongoClient(uri);
  }

  private getCollectionName(baseName: string): string {
    return `${this.stage}-${baseName}`;
  }

  async connect(): Promise<void> {
    await this.client.connect();
    this.db = this.client.db('tg-news-summarizer');

    const postsCollectionName = this.getCollectionName('posts');
    const summariesCollectionName = this.getCollectionName('summaries');

    this.postsCollection = this.db.collection<NewsPost>(postsCollectionName);
    this.summariesCollection = this.db.collection<ProcessedSummary>(
      summariesCollectionName
    );

    console.log(
      `Connected to MongoDB (stage: ${this.stage}, collections: ${postsCollectionName}, ${summariesCollectionName})`
    );

    // Create indexes for better performance
    await this.postsCollection.createIndex({ id: 1 }, { unique: true });
    await this.postsCollection.createIndex({ timestamp: -1 });
    await this.postsCollection.createIndex({ processed: 1 });
    await this.summariesCollection.createIndex({ id: 1 }, { unique: true });
    await this.summariesCollection.createIndex({ createdAt: -1 });
  }

  async disconnect(): Promise<void> {
    await this.client.close();
  }

  async savePosts(posts: NewsPost[]): Promise<void> {
    if (posts.length === 0) return;

    try {
      const operations = posts.map((post) => ({
        updateOne: {
          filter: { id: post.id },
          update: { $setOnInsert: post },
          upsert: true,
        },
      }));

      await this.postsCollection.bulkWrite(operations);
      console.log(`Saved ${posts.length} posts to database`);
    } catch (error) {
      console.error('Error saving posts:', error);
      throw error;
    }
  }

  async getUnprocessedPosts(hoursBack: number): Promise<NewsPost[]> {
    const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

    try {
      const posts = await this.postsCollection
        .find({
          processed: false,
          timestamp: { $gte: cutoffTime },
        })
        .sort({ timestamp: -1 })
        .toArray();

      return posts;
    } catch (error) {
      console.error('Error getting unprocessed posts:', error);
      throw error;
    }
  }

  async getPostsByIds(postIds: string[]): Promise<NewsPost[]> {
    if (postIds.length === 0) return [];

    try {
      const posts = await this.postsCollection
        .find({ id: { $in: postIds } })
        .toArray();

      console.log(`Retrieved ${posts.length} posts by IDs`);
      return posts;
    } catch (error) {
      console.error('Error getting posts by IDs:', error);
      throw error;
    }
  }

  async saveSummary(summary: ProcessedSummary): Promise<void> {
    try {
      await this.summariesCollection.replaceOne({ id: summary.id }, summary, {
        upsert: true,
      });
      console.log(`Saved summary ${summary.id} to database`);
    } catch (error) {
      console.error('Error saving summary:', error);
      throw error;
    }
  }

  async getSummaryById(summaryId: string): Promise<ProcessedSummary | null> {
    try {
      const summary = await this.summariesCollection.findOne({ id: summaryId });

      if (summary) {
        console.log(`Retrieved summary ${summaryId} from database`);
      } else {
        console.log(`Summary ${summaryId} not found in database`);
      }

      return summary;
    } catch (error) {
      console.error('Error getting summary by ID:', error);
      throw error;
    }
  }

  async updateSummary(
    summaryId: string,
    updates: Partial<ProcessedSummary>
  ): Promise<void> {
    try {
      await this.summariesCollection.updateOne(
        { id: summaryId },
        { $set: updates }
      );
      console.log(`Updated summary ${summaryId} in database`);
    } catch (error) {
      console.error('Error updating summary:', error);
      throw error;
    }
  }

  async markPostsAsProcessed(postIds: string[]): Promise<void> {
    if (postIds.length === 0) return;

    try {
      await this.postsCollection.updateMany(
        { id: { $in: postIds } },
        { $set: { processed: true } }
      );
      console.log(`Marked ${postIds.length} posts as processed`);
    } catch (error) {
      console.error('Error marking posts as processed:', error);
      throw error;
    }
  }

  async getRecentPublishedSummaries(
    limit: number
  ): Promise<ProcessedSummary[]> {
    try {
      const summaries = await this.summariesCollection
        .find({ published: true })
        .sort({ publishedAt: -1 })
        .limit(limit)
        .toArray();

      console.log(`Retrieved ${summaries.length} recent published summaries`);
      return summaries;
    } catch (error) {
      console.error('Error getting recent published summaries:', error);
      throw error;
    }
  }
}
