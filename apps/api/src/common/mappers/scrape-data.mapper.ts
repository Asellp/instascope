import { NormalizedPost, NormalizedComment } from './normalized-post.interface';

export class ScrapeDataMapper {
  /**
   * Web scraping sonucunda gelen ham veriyi ortak formata dönüştürür.
   * @param rawData Scraping çıktısı olan ham JSON verisi
   */
  
  static mapToNormalized(rawData: any, followers?: number): NormalizedPost {
    // Yorumları dönüştür
    console.log('--- HAM POST VERİSİ ---', JSON.stringify(rawData, null, 2));
    const comments: NormalizedComment[] = [];
    if (rawData.comments && Array.isArray(rawData.comments)) {
      rawData.comments.forEach((comment: any) => {
        comments.push({
          authorHash: comment.author || comment.userHash || 'unknown',
          text: comment.body || comment.text || '',
          commentedAt: comment.date ? new Date(comment.date) : new Date(),
        });
      });
    }

    const likes = rawData.likesCount || rawData.like_count || 0;
    const commentsCount = rawData.commentsCount || rawData.comment_count || comments.length;
    const views = rawData.viewsCount || rawData.video_views || 0;
    const reach = rawData.reachCount || rawData.reach || 0;

    // Engagement Rate (Etkileşim Oranı) Hesaplama / Fallback Mantığı
    let engagementRate = 0;
    const totalInteractions = likes + commentsCount;

    if (reach > 0) {
      engagementRate = (totalInteractions / reach) * 100;
    } else if (views > 0) {
      engagementRate = (totalInteractions / views) * 100;
    } else if (followers && followers > 0) {
      // Reach/views yoksa takipçi sayısına bölerek gerçek bir yüzde üretiyoruz
      engagementRate = (totalInteractions / followers) * 100;
    } else {
      engagementRate = 0;
    }
    const imageUrl = rawData.displayUrl || rawData.imageUrl || rawData.thumbnailUrl || rawData.image_url || null;

    return {
      igMediaId: rawData.mediaId || rawData.postId || rawData.id,
      type: rawData.postType || rawData.type || 'IMAGE',
      caption: rawData.text || rawData.caption || null,
      imageUrl: imageUrl,
      postedAt: rawData.createdAt ? new Date(rawData.createdAt) : new Date(),
      permalink: rawData.url || rawData.permalink || null,
      metrics: {
        likes,
        commentsCount,
        views,
        engagementRate, // Artık sıfır kalmıyor, akıllı fallback ile doluyor
      },
      comments,
    };
  }
}