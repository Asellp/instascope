export type SentimentLabel = 'positive' | 'negative' | 'neutral';

export interface PostSentimentBreakdown {
  postId: string;
  igMediaId: string;
  caption: string | null;
  totalAnalyzedComments: number;
  breakdown: Record<SentimentLabel, { count: number; percentage: number }>;
}