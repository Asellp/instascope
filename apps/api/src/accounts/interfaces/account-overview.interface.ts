export interface AccountOverviewResponse {
  accountId: string;
  range: '7d' | '30d' | '90d';
  followerGrowth: {
    start: number;
    end: number;
    absoluteChange: number;
    percentChange: number;
  };
  averageEngagementRate: number;
  postFrequency: {
    totalPosts: number;
    postsPerWeek: number;
  };
}