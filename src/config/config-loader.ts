import * as fs from 'fs';
import * as path from 'path';
import { ChannelConfig, PromptConfig } from '../types';

export class ConfigLoader {
  private static instance: ConfigLoader;
  private channelConfig: ChannelConfig | null = null;
  private promptConfig: PromptConfig | null = null;

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
        postGeneration: {
          systemPrompt: this.loadTemplateFile(
            rawConfig.postGeneration.systemPrompt
          ),
          userPrompt: this.loadTemplateFile(
            rawConfig.postGeneration.userPrompt
          ),
        },
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

  reloadConfigs(): void {
    this.channelConfig = null;
    this.promptConfig = null;
  }
}
