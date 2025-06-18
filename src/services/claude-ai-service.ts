import Anthropic from '@anthropic-ai/sdk';
import Handlebars from 'handlebars';
import { AIService, NewsPost } from '../types';

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

  async generateSummary(
    posts: NewsPost[],
    promptTemplate: string
  ): Promise<string> {
    const newsContent = posts
      .map((post) => `[${post.channelName}] ${post.content}`)
      .join('\n\n---\n\n');

    const template = Handlebars.compile(promptTemplate);
    const prompt = template({
      newsContent,
      hoursBack: 24,
      maxLength: 3000,
    });

    try {
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const content = response.content[0];
      if (content.type === 'text') {
        return content.text;
      }

      throw new Error('Unexpected response format from Claude');
    } catch (error) {
      console.error('Error generating summary:', error);
      throw new Error('Failed to generate summary');
    }
  }

  async generateTelegramPost(
    summary: string,
    promptTemplate: string,
    previousPosts?: string[]
  ): Promise<string> {
    const template = Handlebars.compile(promptTemplate);
    const prompt = template({
      summary,
      maxPostLength: 2500,
      previousPosts: previousPosts || [],
    });

    try {
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const content = response.content[0];
      if (content.type === 'text') {
        return content.text;
      }

      throw new Error('Unexpected response format from Claude');
    } catch (error) {
      console.error('Error generating Telegram post:', error);
      throw new Error('Failed to generate Telegram post');
    }
  }
}
