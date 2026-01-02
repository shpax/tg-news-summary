import Anthropic from '@anthropic-ai/sdk';
import Handlebars from 'handlebars';
import { AIService, NewsPost, Category, StructuredSummary } from '../types';

export class ClaudeAIService implements AIService {
  private client: Anthropic;

  constructor() {
    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey) {
      throw new Error('CLAUDE_API_KEY environment variable is required');
    }

    this.client = new Anthropic({
      apiKey: apiKey,
    });
  }

  async generateCategorizedSummary(
    posts: NewsPost[],
    categories: Category[],
    userPromptTemplate: string,
    systemPrompt: string,
    previousSummaries: StructuredSummary[] = []
  ): Promise<StructuredSummary> {
    // Format posts
    const newsContent = posts
      .map((post) => `[${post.channelName}] ${post.content}`)
      .join('\n\n---\n\n');

    // Format categories for prompt
    const categoriesInfo = categories
      .map((c) => `- ${c.id}: ${c.title_uk} (${c.description})`)
      .join('\n');

    // Format previous summaries for context
    const previousContext =
      previousSummaries.length > 0
        ? previousSummaries
            .map(
              (s, i) =>
                `--- Previous Summary ${i + 1}:\n${JSON.stringify(s, null, 2)}`
            )
            .join('\n\n')
        : '';

    // Render prompt with Handlebars
    const template = Handlebars.compile(userPromptTemplate);
    const userPrompt = template({
      newsContent,
      categoriesInfo,
      previousSummaries: previousContext,
      hoursBack: 24,
    });

    try {
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 8000,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response format from Claude');
      }

      // Parse JSON from response (Claude might wrap it in markdown code blocks)
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('Claude response:', content.text);
        throw new Error('Claude did not return valid JSON');
      }

      const structured: StructuredSummary = JSON.parse(jsonMatch[0]);

      // Validate structure
      if (!structured.summary || !Array.isArray(structured.categories)) {
        throw new Error('Invalid structured summary format from Claude');
      }

      console.log(
        `Generated structured summary with ${structured.categories.length} categories`
      );

      return structured;
    } catch (error) {
      console.error('Error generating categorized summary:', error);
      throw new Error('Failed to generate categorized summary');
    }
  }
}
