import { NewsProcessor } from '../core/news-processor';
import {
  NewsSource,
  AIService,
  PublishingService,
  StorageService,
  NewsPost,
  Channel,
  ProcessedSummary,
} from '../types';

// Mock implementations for testing
class MockNewsSource implements NewsSource {
  async collectNews(
    channels: Channel[],
    hoursBack: number
  ): Promise<NewsPost[]> {
    return [
      {
        id: 'test-1',
        channelId: '@test_channel',
        channelName: 'Test Channel',
        content:
          'This is a test news post with sufficient length to pass the minimum requirements.',
        timestamp: new Date(),
        messageId: 1,
        category: 'test',
        processed: false,
        createdAt: new Date(),
      },
    ];
  }

  getSourceType(): string {
    return 'mock';
  }
}

class MockAIService implements AIService {
  async generateSummary(posts: NewsPost[], prompt: string): Promise<string> {
    return 'Mock summary of the news posts';
  }

  async generateTelegramPost(
    summary: string,
    prompt: string,
    previousPosts?: string[]
  ): Promise<string> {
    return 'Mock Telegram post based on summary';
  }
}

class MockPublishingService implements PublishingService {
  async publishPost(content: string, channelId: string): Promise<boolean> {
    return true;
  }
}

class MockStorageService implements StorageService {
  private posts: NewsPost[] = [];
  private summaries: ProcessedSummary[] = [];

  async connect(): Promise<void> {
    // Mock connection
  }

  async disconnect(): Promise<void> {
    // Mock disconnection
  }

  async savePosts(posts: NewsPost[]): Promise<void> {
    this.posts.push(...posts);
  }

  async getUnprocessedPosts(hoursBack: number): Promise<NewsPost[]> {
    return this.posts.filter((p) => !p.processed);
  }

  async saveSummary(summary: ProcessedSummary): Promise<void> {
    this.summaries.push(summary);
  }

  async updateSummary(
    summaryId: string,
    updates: Partial<ProcessedSummary>
  ): Promise<void> {
    const index = this.summaries.findIndex((s) => s.id === summaryId);
    if (index !== -1) {
      this.summaries[index] = { ...this.summaries[index], ...updates };
    }
  }

  async markPostsAsProcessed(postIds: string[]): Promise<void> {
    this.posts.forEach((post) => {
      if (postIds.includes(post.id)) {
        post.processed = true;
      }
    });
  }

  async getRecentPublishedSummaries(
    limit: number
  ): Promise<ProcessedSummary[]> {
    return this.summaries
      .filter((s) => s.published)
      .sort(
        (a, b) =>
          (b.publishedAt?.getTime() || 0) - (a.publishedAt?.getTime() || 0)
      )
      .slice(0, limit);
  }
}

describe('NewsProcessor', () => {
  let processor: NewsProcessor;
  let mockNewsSource: MockNewsSource;
  let mockAIService: MockAIService;
  let mockPublishingService: MockPublishingService;
  let mockStorageService: MockStorageService;

  beforeEach(() => {
    mockNewsSource = new MockNewsSource();
    mockAIService = new MockAIService();
    mockPublishingService = new MockPublishingService();
    mockStorageService = new MockStorageService();

    processor = new NewsProcessor(
      mockNewsSource,
      mockAIService,
      mockPublishingService,
      mockStorageService
    );
  });

  it('should be instantiated correctly', () => {
    expect(processor).toBeInstanceOf(NewsProcessor);
  });

  it('should have all required methods', () => {
    expect(typeof processor.processDaily).toBe('function');
  });
});

describe('Mock Services', () => {
  it('should implement NewsSource interface correctly', () => {
    const mockSource = new MockNewsSource();
    expect(mockSource.getSourceType()).toBe('mock');
  });

  it('should implement AIService interface correctly', async () => {
    const mockAI = new MockAIService();
    const summary = await mockAI.generateSummary([], 'test prompt');
    expect(typeof summary).toBe('string');
  });

  it('should implement PublishingService interface correctly', async () => {
    const mockPublisher = new MockPublishingService();
    const result = await mockPublisher.publishPost('test', '@test');
    expect(result).toBe(true);
  });
});
