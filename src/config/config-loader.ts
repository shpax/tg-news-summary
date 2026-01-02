import * as fs from 'fs';
import * as path from 'path';
import {
  ChannelConfig,
  PromptConfig,
  CategoryConfig,
  TelegraphConfig,
} from '../types';

export class ConfigLoader {
  private static instance: ConfigLoader;
  private channelConfig: ChannelConfig | null = null;
  private promptConfig: PromptConfig | null = null;
  private categoryConfig: CategoryConfig | null = null;
  private telegramPostTemplate: string | null = null;

  private constructor() {}

  static getInstance(): ConfigLoader {
    if (!ConfigLoader.instance) {
      ConfigLoader.instance = new ConfigLoader();
    }
    return ConfigLoader.instance;
  }

  loadChannelConfig(): ChannelConfig {
    if (this.channelConfig) {
      return this.channelConfig;
    }

    try {
      const configPath = path.join(process.cwd(), 'config', 'channels.json');
      const configData = fs.readFileSync(configPath, 'utf-8');
      this.channelConfig = JSON.parse(configData) as ChannelConfig;
      return this.channelConfig;
    } catch (error) {
      console.error('Error loading channel config:', error);
      throw new Error('Failed to load channel configuration');
    }
  }

  loadPromptConfig(): PromptConfig {
    if (this.promptConfig) {
      return this.promptConfig;
    }

    try {
      const configPath = path.join(process.cwd(), 'config', 'prompts.json');
      const configData = fs.readFileSync(configPath, 'utf-8');
      const rawConfig = JSON.parse(configData);

      // Load template files and replace paths with actual content
      this.promptConfig = {
        summarization: {
          systemPrompt: this.loadTemplateFile(
            rawConfig.summarization.systemPrompt
          ),
          userPrompt: this.loadTemplateFile(rawConfig.summarization.userPrompt),
        },
        postGeneration: rawConfig.postGeneration
          ? {
              systemPrompt: this.loadTemplateFile(
                rawConfig.postGeneration.systemPrompt
              ),
              userPrompt: this.loadTemplateFile(
                rawConfig.postGeneration.userPrompt
              ),
            }
          : undefined,
      };

      return this.promptConfig;
    } catch (error) {
      console.error('Error loading prompt config:', error);
      throw new Error('Failed to load prompt configuration');
    }
  }

  private loadTemplateFile(templatePath: string): string {
    try {
      const fullPath = path.join(process.cwd(), 'config', templatePath);
      return fs.readFileSync(fullPath, 'utf-8').trim();
    } catch (error) {
      console.error(`Error loading template file ${templatePath}:`, error);
      throw new Error(`Failed to load template file: ${templatePath}`);
    }
  }

  loadCategoryConfig(): CategoryConfig {
    if (this.categoryConfig) {
      return this.categoryConfig;
    }

    try {
      const configPath = path.join(process.cwd(), 'config', 'categories.json');
      const configData = fs.readFileSync(configPath, 'utf-8');
      this.categoryConfig = JSON.parse(configData) as CategoryConfig;
      return this.categoryConfig;
    } catch (error) {
      console.error('Error loading category config:', error);
      throw new Error('Failed to load category configuration');
    }
  }

  loadTelegramPostTemplate(): string {
    if (this.telegramPostTemplate) {
      return this.telegramPostTemplate;
    }

    try {
      const templatePath = path.join(
        process.cwd(),
        'config',
        'templates',
        'telegram-post.hbs'
      );
      this.telegramPostTemplate = fs.readFileSync(templatePath, 'utf-8');
      return this.telegramPostTemplate;
    } catch (error) {
      console.error('Error loading Telegram post template:', error);
      throw new Error('Failed to load Telegram post template');
    }
  }

  loadTelegraphConfig(): TelegraphConfig {
    const accessToken = process.env.TELEGRAPH_ACCESS_TOKEN;
    const authorName = process.env.TELEGRAPH_AUTHOR_NAME || '';
    const authorUrl = process.env.TELEGRAPH_AUTHOR_URL;

    if (!accessToken) {
      throw new Error(
        'TELEGRAPH_ACCESS_TOKEN environment variable is required'
      );
    }

    return {
      accessToken,
      authorName,
      authorUrl,
    };
  }

  reloadConfigs(): void {
    this.channelConfig = null;
    this.promptConfig = null;
    this.categoryConfig = null;
    this.telegramPostTemplate = null;
  }
}
