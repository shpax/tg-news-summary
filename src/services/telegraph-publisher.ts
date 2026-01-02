import { ArticlePublishingService, TelegraphArticle, TelegraphConfig } from '../types';

interface TelegraphCreatePageResponse {
  ok: boolean;
  result?: {
    path: string;
    url: string;
    title: string;
    description: string;
    author_name?: string;
    author_url?: string;
  };
  error?: string;
}

export class TelegraphPublisher implements ArticlePublishingService {
  private accessToken: string;
  private authorName: string;
  private authorUrl?: string;
  private baseUrl = 'https://api.telegra.ph';

  constructor(config: TelegraphConfig) {
    if (!config.accessToken) {
      throw new Error('Telegraph access token is required');
    }
    if (!config.authorName) {
      throw new Error('Telegraph author name is required');
    }

    this.accessToken = config.accessToken;
    this.authorName = config.authorName;
    this.authorUrl = config.authorUrl;

    console.log('Telegraph publisher initialized', {
      authorName: this.authorName,
      hasAuthorUrl: !!this.authorUrl,
      hasToken: !!this.accessToken,
    });
  }

  async publishArticle(article: TelegraphArticle): Promise<string> {
    console.log('Publishing article to Telegraph', {
      title: article.title,
      authorName: article.authorName,
      contentNodes: article.content.length,
    });

    try {
      const url = `${this.baseUrl}/createPage`;
      const body = new URLSearchParams({
        access_token: this.accessToken,
        title: article.title,
        author_name: article.authorName,
        content: JSON.stringify(article.content),
        return_content: 'false',
      });

      if (this.authorUrl) {
        body.append('author_url', this.authorUrl);
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Telegraph API request failed with status ${response.status}: ${errorText}`
        );
      }

      const data = await response.json() as TelegraphCreatePageResponse;

      if (!data.ok || !data.result) {
        const errorMessage = data.error || 'Unknown error occurred';
        throw new Error(`Telegraph API returned error: ${errorMessage}`);
      }

      const articleUrl = data.result.url;
      console.log('Successfully published article to Telegraph', {
        url: articleUrl,
        path: data.result.path,
      });

      return articleUrl;
    } catch (error) {
      console.error('Error publishing to Telegraph:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack,
        });
      }
      throw error;
    }
  }

  getServiceName(): string {
    return 'Telegraph';
  }
}
