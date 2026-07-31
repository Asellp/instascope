import { NormalizedPost, NormalizedComment } from './normalized-post.interface';

export class MockDataMapper {
  /**
   * Mock / Test verilerini ortak formata dönüştürür.
   * @param rawData Test ortamından gelen ham JSON verisi
   */
  static mapToNormalized(rawData: any): NormalizedPost {
    const comments: NormalizedComment[] = [];
    if (rawData.comments && Array.isArray(rawData.comments)) {
      rawData.comments.forEach((comment: any) => {
        comments.push({
          authorHash: comment.authorHash || comment.user || 'mock_user',
          text: comment.text || '',
          commentedAt: comment.commentedAt ? new Date(comment.commentedAt) : new Date(),
        });
      });
    }

    return {
      igMediaId: rawData.igMediaId || rawData.id || 'mock_media_id_123',
      type: rawData.type || 'IMAGE',
      caption: rawData.caption || 'Mock post caption',
      postedAt: rawData.postedAt ? new Date(rawData.postedAt) : new Date(),
      permalink: rawData.permalink || 'https://instagram.com/mock',
      metrics: {
        likes: rawData.likes || 100,
        commentsCount: rawData.commentsCount || comments.length,
        views: rawData.views || 500,
        reach: rawData.reach || 400,
        engagementRate: rawData.engagementRate || 0.05,
      },
      comments,
    };
  }
}