import { Injectable, Logger } from '@nestjs/common';
import { IDataSource } from './data-source.interface';

@Injectable()
export class ScrapeDataSourceService implements IDataSource {
  private readonly logger = new Logger(ScrapeDataSourceService.name);
  private readonly scraperServiceUrl = process.env.SCRAPER_SERVICE_URL || 'http://localhost:8001';

  async fetchProfile(params?: any): Promise<any> {
    this.logger.log(`Scrape profili getiriliyor: ${params?.platform}`);
    return {
      source: 'scrape',
      type: 'profile',
      data: { username: params?.platform },
    };
  }

  async fetchPosts(params?: any): Promise<any> {
    const platform = params?.platform || params?.igUsername;
    this.logger.log(`Scrape üzerinden postlar çekiliyor. Platform/Username: ${platform}`);

    try {
      const response = await fetch(`${this.scraperServiceUrl}/internal/scrape-posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform }),
      });

      if (!response.ok) {
        throw new Error(`Scraper servisinden hata döndü (${response.status}): ${response.statusText}`);
      }

      const result = await response.json();
      return result; 
    } catch (error: unknown) {
      const errMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Scrape posts isteği başarısız oldu: ${errMessage}`);
      
      // Hata yutulmuyor; dış katmanın yakalayıp işi FAILED yapabilmesi için fırlatılıyor
      throw error;
    }
  }

  async fetchComments(params?: any): Promise<any> {
    this.logger.log(`Scrape üzerinden yorumlar getiriliyor, Medya ID: ${params?.igMediaId}`);
    return {
      source: 'scrape',
      type: 'comments',
      data: [],
    };
  }
}