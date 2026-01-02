import { v4 as uuidv4 } from 'uuid';
import { ClaudeAIService } from '../services/claude-ai-service';
import { MongoDBStorage } from '../services/mongodb-storage';
import { ConfigLoader } from '../config/config-loader';
import { ProcessedSummary } from '../types';
import { SummarizeNewsInput, SummarizeNewsOutput } from '../types/step-functions-state';

export const handler = async (event: SummarizeNewsInput): Promise<SummarizeNewsOutput> => {
  console.log('SummarizeNews Lambda started', { event });

  const storage = new MongoDBStorage();

  try {
    await storage.connect();
    console.log('Connected to MongoDB');

    // Retrieve posts from MongoDB by IDs
    const posts = await storage.getPostsByIds(event.postIds);

    if (posts.length === 0) {
      throw new Error('No posts found for provided IDs');
    }

    console.log(`Retrieved ${posts.length} posts from MongoDB`);

    // Load configurations
    const configLoader = ConfigLoader.getInstance();
    const promptConfig = configLoader.loadPromptConfig();
    const categoryConfig = configLoader.loadCategoryConfig();

    // Get previous summaries for context (3 most recent)
    const previousSummaries = await storage.getRecentPublishedSummaries(3);
    const previousStructured = previousSummaries.map((s) => s.structuredSummary);

    console.log(`Retrieved ${previousStructured.length} previous summaries for context`);

    // Generate structured summary with Claude AI (SINGLE API CALL)
    const aiService = new ClaudeAIService();
    console.log('Generating categorized summary with Claude AI...');

    const structuredSummary = await aiService.generateCategorizedSummary(
      posts,
      categoryConfig.categories,
      promptConfig.summarization.userPrompt,
      promptConfig.summarization.systemPrompt,
      previousStructured
    );

    console.log(`Generated summary with ${structuredSummary.categories.length} categories`);

    // Create processed summary record (Telegram post will be rendered at publish time)
    const processedSummary: ProcessedSummary = {
      id: uuidv4(),
      structuredSummary,
      sourcePostIds: posts.map((p) => p.id),
      createdAt: new Date(),
      published: false,
    };

    // Save summary to MongoDB
    await storage.saveSummary(processedSummary);
    console.log(`Saved summary ${processedSummary.id} to database`);

    return {
      executionId: event.executionId,
      summaryId: processedSummary.id,
      postCount: posts.length,
      timestamp: new Date().toISOString(),
      status: 'success',
    };
  } catch (error) {
    console.error('Error in SummarizeNews Lambda:', error);
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
