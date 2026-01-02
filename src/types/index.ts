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
  postGeneration?: {
    systemPrompt: string;
    userPrompt: string;
  };
}

export interface Category {
  id: string;
  title_uk: string;
  title_en: string;
  icon: string;
  description: string;
}

export interface CategoryConfig {
  categories: Category[];
}

export interface CategoryNews {
  categoryId: string;
  title: string;
  content: string;
}

export interface StructuredSummary {
  summary: string;
  categories: CategoryNews[];
}

export interface ProcessedSummary {
  id: string;
  structuredSummary: StructuredSummary;
  telegramPost?: string;  // Made optional - will be rendered at publish time
  telegraphUrl?: string;  // NEW: Store Telegraph article URL
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
  generateCategorizedSummary(
    posts: NewsPost[],
    categories: Category[],
    userPrompt: string,
    systemPrompt: string,
    previousSummaries?: StructuredSummary[]
  ): Promise<StructuredSummary>;
}

export interface PublishingService {
  publishPost(content: string, channelId: string): Promise<boolean>;
}

export interface StorageService {
  savePosts(posts: NewsPost[]): Promise<void>;
  getUnprocessedPosts(hoursBack: number): Promise<NewsPost[]>;
  getPostsByIds(postIds: string[]): Promise<NewsPost[]>;
  saveSummary(summary: ProcessedSummary): Promise<void>;
  getSummaryById(summaryId: string): Promise<ProcessedSummary | null>;
  updateSummary(
    summaryId: string,
    updates: Partial<ProcessedSummary>
  ): Promise<void>;
  markPostsAsProcessed(postIds: string[]): Promise<void>;
  getRecentPublishedSummaries(limit: number): Promise<ProcessedSummary[]>;
}

// Telegraph-specific types
export interface TelegraphNode {
  tag?: string;
  attrs?: Record<string, string>;
  children?: (string | TelegraphNode)[];
}

export interface TelegraphArticle {
  title: string;
  authorName: string;
  content: TelegraphNode[];
}

export interface TelegraphConfig {
  accessToken: string;
  authorName: string;
  authorUrl?: string;
}

export interface ArticlePublishingService {
  publishArticle(article: TelegraphArticle): Promise<string>; // Returns article URL
  getServiceName(): string;
}
