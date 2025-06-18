export interface NewsPost {
  id: string;
  channelId: string;
  channelName: string;
  content: string;
  timestamp: Date;
  messageId: number;
  category?: string;
  processed: boolean;
  createdAt: Date;
}

export interface Channel {
  id: string;
  name: string;
  enabled: boolean;
  category: string;
}

export interface ChannelConfig {
  channels: Channel[];
  settings: {
    maxPostsPerChannel: number;
    hoursBack: number;
    minPostLength: number;
  };
}

export interface PromptConfig {
  summarization: {
    systemPrompt: string;
    userPrompt: string;
  };
  postGeneration: {
    systemPrompt: string;
    userPrompt: string;
  };
}

export interface ProcessedSummary {
  id: string;
  summary: string;
  telegramPost: string;
  sourcePostIds: string[];
  createdAt: Date;
  publishedAt?: Date;
  published: boolean;
}

export interface NewsSource {
  collectNews(channels: Channel[], hoursBack: number): Promise<NewsPost[]>;
  getSourceType(): string;
}

export interface AIService {
  generateSummary(posts: NewsPost[], prompt: string): Promise<string>;
  generateTelegramPost(
    summary: string,
    prompt: string,
    previousPosts?: string[]
  ): Promise<string>;
}

export interface PublishingService {
  publishPost(content: string, channelId: string): Promise<boolean>;
}

export interface StorageService {
  savePosts(posts: NewsPost[]): Promise<void>;
  getUnprocessedPosts(hoursBack: number): Promise<NewsPost[]>;
  saveSummary(summary: ProcessedSummary): Promise<void>;
  updateSummary(
    summaryId: string,
    updates: Partial<ProcessedSummary>
  ): Promise<void>;
  markPostsAsProcessed(postIds: string[]): Promise<void>;
  getRecentPublishedSummaries(limit: number): Promise<ProcessedSummary[]>;
}
