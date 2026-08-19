import { NormalizedPost, NormalizedComment } from './normalized-post.interface';

export class ApiDataMapper {
  /**
   * Meta API (veya benzeri) ham JSON verisini ortak formata dönüştürür.
   * @param rawData Dış servisten gelen ham JSON verisi
   */
  static mapToNormalized(rawData: any): NormalizedPost {
    // 1. Yorumları Dönüştür (Farklı olası yapıları destekle: comments.data, comments veya comment listesi)
    const comments: NormalizedComment[] = [];
    const rawComments = rawData.comments?.data || rawData.comments || rawData.commentList;
    
    if (Array.isArray(rawComments)) {
      rawComments.forEach((comment: any) => {
        comments.push({
          authorHash: comment.from?.username || comment.username || comment.authorHash || 'anonymous',
          text: comment.text || comment.message || '',
          commentedAt: comment.timestamp || comment.commentedAt ? new Date(comment.timestamp || comment.commentedAt) : new Date(),
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
    } else {
      // Eğer düz property olarak geldiyse alternatifleri kontrol et
      reach = rawData.reach || rawData.impressions || 0;
      views = rawData.views || rawData.video_views || 0;
    }

    // Hem snake_case hem camelCase alan adlarını destekle
    const likes = rawData.like_count ?? rawData.likesCount ?? rawData.likes ?? 0;
    const commentsCount = rawData.comments_count ?? rawData.commentsCount ?? rawData.comment_count ?? comments.length;

    // Basit bir etkileşim oranı (Engagement Rate) hesaplaması: (Beğeni + Yorum) / Erişim
    const engagementRate = reach > 0 ? ((likes + commentsCount) / reach) * 100 : 0;

    // Medya tipini dinamik olarak belirle
    let normalizedType = rawData.media_type || rawData.postType || rawData.type || 'UNKNOWN';
    if (
      normalizedType === 'CAROUSEL_ALBUM' || 
      normalizedType === 'CAROUSEL' || 
      rawData.children || 
      rawData.carousel_media_count
    ) {
      normalizedType = 'CAROUSEL';
    }

    const imageUrl = rawData.mediaUrl || rawData.displayUrl || rawData.imageUrl || rawData.thumbnailUrl || rawData.image_url || null;
    // 3. Ortak Şemayı Döndür
    return {
      igMediaId: rawData.id || rawData.igMediaId || rawData.mediaId,
      type: normalizedType,
      caption: rawData.caption || rawData.text || null,
      imageUrl: imageUrl,
      postedAt: rawData.timestamp || rawData.postedAt ? new Date(rawData.timestamp || rawData.postedAt) : new Date(),
      permalink: rawData.permalink || rawData.url || null,
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