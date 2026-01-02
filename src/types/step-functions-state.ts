// Input/Output types for Step Functions state machine

export interface CollectNewsInput {
  executionId: string;
  triggeredAt: string;
  channelConfigOverride?: {
    hoursBack?: number;
  };
}

export interface CollectNewsOutput {
  executionId: string;
  collectedPostsCount: number;
  filteredPostsCount: number;
  postIds: string[];
  hoursBack: number;
  minPostLength: number;
  timestamp: string;
  status: 'success' | 'no_posts' | 'failed';
}

export interface SummarizeNewsInput {
  executionId: string;
  postIds: string[];
  hoursBack: number;
  timestamp: string;
}

export interface SummarizeNewsOutput {
  executionId: string;
  summaryId: string;
  postCount: number;
  timestamp: string;
  status: 'success';
}

export interface PublishNewsInput {
  executionId: string;
  summaryId: string;
  timestamp: string;
}

export interface PublishNewsOutput {
  executionId: string;
  summaryId: string;
  published: boolean;
  publishedAt: string;
  telegraphUrl: string;  // Telegraph article URL
  timestamp: string;
  status: 'success';
}
