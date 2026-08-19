export interface NormalizedComment {
  authorHash: string;
  text: string;
  commentedAt: Date;
}

export interface NormalizedPost {
  igMediaId: string;
  type: string;          // Örn: 'IMAGE', 'VIDEO', 'CAROUSEL'
  caption?: string;
  imageUrl?: string | null;
  postedAt?: Date;
  permalink?: string;
  metrics: {
    likes: number;
    commentsCount: number;
    views?: number;
    reach?: number;
    engagementRate?: number;
  };
  comments?: NormalizedComment[];
}