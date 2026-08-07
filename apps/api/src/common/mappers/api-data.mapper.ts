import { NormalizedPost, NormalizedComment } from './normalized-post.interface';

export class ApiDataMapper {
  /**
   * Meta API (veya benzeri) ham JSON verisini ortak formata dönüştürür.
   * @param rawData Dış servisten gelen ham JSON verisi
   */
  static mapToNormalized(rawData: any): NormalizedPost {
    // 1. Yorumları Dönüştür
    const comments: NormalizedComment[] = [];
    if (rawData.comments && Array.isArray(rawData.comments.data)) {
      rawData.comments.data.forEach((comment: any) => {
        comments.push({
          authorHash: comment.from?.username || comment.username || 'unknown',
          text: comment.text || '',
          commentedAt: comment.timestamp ? new Date(comment.timestamp) : new Date(),
        });
      });
    }

    // 2. Metrikleri ve İçgörüleri (Insights) Topla
    let reach = 0;
    let views = 0;
    
    // API'den "insights" (örneğin reach, impressions) geliyorsa onları yakala
    if (rawData.insights && Array.isArray(rawData.insights.data)) {
      const reachData = rawData.insights.data.find((i: any) => i.name === 'reach');
      if (reachData && reachData.values?.length > 0) reach = reachData.values[0].value;

      const viewsData = rawData.insights.data.find((i: any) => i.name === 'impressions');
      if (viewsData && viewsData.values?.length > 0) views = viewsData.values[0].value;
    }

    const likes = rawData.like_count || 0;
    const commentsCount = rawData.comments_count || 0;

    // Basit bir etkileşim oranı (Engagement Rate) hesaplaması: (Beğeni + Yorum) / Erişim
    const engagementRate = reach > 0 ? (likes + commentsCount) / reach : 0;

    // Medya tipini dinamik olarak belirle
    let normalizedType = rawData.media_type || rawData.postType || 'UNKNOWN';
    if (
      normalizedType === 'CAROUSEL_ALBUM' || 
      normalizedType === 'CAROUSEL' || 
      rawData.children || 
      rawData.carousel_media_count
    ) {
      normalizedType = 'CAROUSEL';
    }

    // 3. Ortak Şemayı Döndür
    return {
      igMediaId: rawData.id,
      type: normalizedType,
      caption: rawData.caption || null,
      postedAt: rawData.timestamp ? new Date(rawData.timestamp) : new Date(),
      permalink: rawData.permalink || null,
      metrics: {
        likes,
        commentsCount,
        views,
        reach,
        engagementRate: Number(engagementRate.toFixed(4)), // Virgülden sonra 4 basamak yuvarla
      },
      comments,
    };
  }
}