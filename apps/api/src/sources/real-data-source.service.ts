import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { IDataSource } from './data-source.interface';

@Injectable()
export class RealDataSourceService implements IDataSource {
  private readonly logger = new Logger(RealDataSourceService.name);

  // Exponential backoff ve rate limit (429 / 5xx) yönetimi için yardımcı fonksiyon
  private async fetchWithRetry(url: string, params: any, retries = 3, delay = 1000): Promise<any> {
    try {
      return await axios.get(url, { params });
    } catch (error: any) {
      const status = error.response?.status;
      // Eğer rate limit (429) veya sunucu hatası (5xx) aldıysak ve deneme hakkımız kaldıysa
      if (retries > 0 && (status === 429 || (status >= 500 && status < 600))) {
        this.logger.warn(`Meta API Hatası (${status}). ${delay}ms sonra tekrar denenecek... Kalan hak: ${retries}`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        // Süreyi katlayarak (exponential backoff) tekrar dene
        return this.fetchWithRetry(url, params, retries - 1, delay * 2);
      }
      throw error;
    }
  }

  async fetchProfile(params?: any): Promise<any> {
    const { accessToken, igAccountId } = params;
    if (!accessToken) {
      throw new Error('Erişim tokeni (accessToken) bulunamadı veya boş!');
    }
    
    try {
      const response = await this.fetchWithRetry(`https://graph.facebook.com/v18.0/${igAccountId}`, {
        fields: 'id,username,followers_count,media_count',
        access_token: accessToken,
      });

      return {
        source: 'meta_api',
        type: 'profile',
        data: response.data,
      };
    } catch (error: any) {
      const detailedError = error.response?.data 
        ? JSON.stringify(error.response.data) 
        : error.message;
      
      this.logger.error(`Profil bilgisi çekilemedi DETAY: ${detailedError}`);
      throw new Error(`Meta API Hatası (Profil): ${detailedError}`);
    }
  }

  async fetchPosts(params?: any): Promise<any> {
    const { accessToken, igAccountId } = params;
    if (!accessToken) {
      throw new Error('Erişim tokeni (accessToken) bulunamadı veya boş!');
    }

    try {
      const response = await this.fetchWithRetry(`https://graph.facebook.com/v18.0/${igAccountId}/media`, {
        fields: 'id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count',
        access_token: accessToken,
      });

      const posts = [];
      for (const post of response.data.data) {
        let views = 0;
        let reach = 0;

        // Her post için ayrı ayrı Insights (sadece desteklenen reach) çekmeyi deneyelim
        try {
          const insightsRes = await this.fetchWithRetry(`https://graph.facebook.com/v18.0/${post.id}/insights`, {
            metric: 'reach',
            access_token: accessToken,
          });

          if (insightsRes && insightsRes.data && insightsRes.data.data) {
            for (const metric of insightsRes.data.data) {
              if (metric.name === 'reach') reach = metric.values?.[0]?.value || 0;
            }
          }
        } catch (insightErr: any) {
          // İzin veya medya türü kısıtlamasında akışın patlamaması için sessizce yakalıyoruz
          this.logger.debug(`Post reach bilgisi alınamadı (Media ID: ${post.id})`);
        }

        posts.push({
          id: post.id,
          caption: post.caption || '',
          mediaType: post.media_type,
          mediaUrl: post.media_url,
          permalink: post.permalink,
          timestamp: post.timestamp,
          likesCount: post.like_count || 0,
          commentsCount: post.comments_count || 0,
          views: views,
          reach: reach,
        });
      }

      return {
        source: 'meta_api',
        type: 'posts',
        data: posts,
      };
    } catch (error: any) {
      const detailedError = error.response?.data 
        ? JSON.stringify(error.response.data) 
        : error.message;
      
      this.logger.error(`Gönderiler çekilemedi DETAY: ${detailedError}`);
      throw new Error(`Meta API Hatası (Gönderiler): ${detailedError}`);
    }
  }

  async fetchComments(params?: any): Promise<any> {
    const { accessToken, igMediaId } = params;
    if (!accessToken || !igMediaId) {
      throw new Error('Erişim tokeni veya Medya ID eksik!');
    }

    try {
      // Meta Graph API üzerinden ilgili postun yorumlarını çekiyoruz
      const response = await this.fetchWithRetry(`https://graph.facebook.com/v18.0/${igMediaId}/comments`, {
        fields: 'id,text,timestamp,username',
        access_token: accessToken,
      });

      const comments = response.data.data.map((comment: any) => ({
        id: comment.id,
        text: comment.text || '',
        username: comment.username || 'unknown',
        timestamp: comment.timestamp,
      }));

      return {
        source: 'meta_api',
        type: 'comments',
        data: comments,
      };
    } catch (error: any) {
      const detailedError = error.response?.data 
        ? JSON.stringify(error.response.data) 
        : error.message;
      
      this.logger.error(`Yorumlar çekilemedi (Media ID: ${igMediaId}) DETAY: ${detailedError}`);
      return { source: 'meta_api', type: 'comments', data: [] };
    }
  }
}