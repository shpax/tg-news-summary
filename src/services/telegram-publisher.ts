import TelegramBot from 'node-telegram-bot-api';
import { PublishingService } from '../types';

export class TelegramPublisher implements PublishingService {
  private bot: TelegramBot;

  constructor() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      throw new Error('TELEGRAM_BOT_TOKEN environment variable is required');
    }

    this.bot = new TelegramBot(token);
  }

  async publishPost(content: string, channelId: string): Promise<boolean> {
    try {
      await this.bot.sendMessage(channelId, content, {
        parse_mode: 'Markdown',
        disable_web_page_preview: false,
      });

      console.log(`Successfully published post to channel ${channelId}`);
      return true;
    } catch (error) {
      console.error(`Error publishing to channel ${channelId}:`, error);
      return false;
    }
  }
}
