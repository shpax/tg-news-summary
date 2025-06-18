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
      this.promptConfig = JSON.parse(configData) as PromptConfig;
      return this.promptConfig;
    } catch (error) {
      console.error('Error loading prompt config:', error);
      throw new Error('Failed to load prompt configuration');
    }
  }

  reloadConfigs(): void {
    this.channelConfig = null;
    this.promptConfig = null;
  }
}
