import { Injectable, Logger } from '@nestjs/common';
import { IDataSource } from './data-source.interface';

@Injectable()
export class ScrapeDataSourceService implements IDataSource {
  private readonly logger = new Logger(ScrapeDataSourceService.name);
  private readonly scraperServiceUrl = process.env.SCRAPER_SERVICE_URL || 'http://localhost:8001';

  async fetchProfile(params?: any): Promise<any> {
    const platform = params?.platform || params?.igUsername;
    this.logger.log(`Scrape üzerinden profil getiriliyor. Platform/Username: ${platform}`);

    // --- TIMEOUT MEKANİZMASI ---
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 900000); // 15 dk
    try {
      const response = await fetch(`${this.scraperServiceUrl}/internal/scrape-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Scraper servisinden profil hatası döndü (${response.status}): ${response.statusText}`);
      }

      const result = await response.json();
      return result; // Gelen verinin içinde followersCount / followingCount olduğunu varsayıyoruz
    } catch (error: unknown) {
      const errMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Scrape profile isteği başarısız oldu: ${errMessage}`);

      if (error instanceof Error && error.name === 'AbortError') {
        this.logger.error(`Scraper servisi zaman aşımına uğradı (3 dakika aşıldı).`);
      }
      throw error;
    }finally {
      // --- TIMER TEMİZLİĞİ ---
      // İstek ister başarılı ister hatalı sonuçlansın timer mutlaka temizlenir
      clearTimeout(timeoutId);
    }
  }

  async fetchPosts(params?: any): Promise<any> {
    const platform = params?.platform || params?.igUsername;
    this.logger.log(`Scrape üzerinden postlar çekiliyor. Platform/Username: ${platform}`);

    // ---  TIMEOUT MEKANİZMASI  ---
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 900000); // 15 dk
    
    try {
      // YENİ: since / maxPosts / maxComments artık scraper'a gerçekten iletiliyor
      const body: any = { platform };
      if (params?.since) body.since = params.since;
      if (params?.maxPosts) body.maxPosts = params.maxPosts;
      if (params?.maxComments) body.maxComments = params.maxComments;
      if (params?.commentsPerPost) body.commentsPerPost = params.commentsPerPost;

      const response = await fetch(`${this.scraperServiceUrl}/internal/scrape-posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(`Scraper servisinden hata döndü (${response.status}): ${errorBody?.detail || response.statusText}`);
      }

      const result = await response.json();
      return result; 
    } catch (error: unknown) {
      const errMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Scrape posts isteği başarısız oldu: ${errMessage}`);
      
      if (error instanceof Error && error.name === 'AbortError') {
        this.logger.error(`Scraper servisi zaman aşımına uğradı (3 dakika aşıldı).`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
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