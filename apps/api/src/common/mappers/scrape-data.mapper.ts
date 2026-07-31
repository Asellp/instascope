import { NormalizedPost, NormalizedComment } from './normalized-post.interface';

export class ScrapeDataMapper {
  /**
   * Web scraping sonucunda gelen ham veriyi ortak formata dönüştürür.
   * @param rawData Scraping çıktısı olan ham JSON verisi
   */
  static mapToNormalized(rawData: any): NormalizedPost {
    // Yorumları dönüştür
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

    return {
      igMediaId: rawData.mediaId || rawData.postId || rawData.id,
      type: rawData.postType || rawData.type || 'IMAGE',
      caption: rawData.text || rawData.caption || null,
      postedAt: rawData.createdAt ? new Date(rawData.createdAt) : new Date(),
      permalink: rawData.url || rawData.permalink || null,
      metrics: {
        likes,
        commentsCount,
        views,
        engagementRate: 0, // Scrape verisinde genellikle reach olmadığı için 0 bırakabiliriz
      },
      comments,
    };
  }
}