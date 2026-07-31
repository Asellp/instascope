import { ApiDataMapper } from './api-data.mapper';
import { ScrapeDataMapper } from './scrape-data.mapper';
import { MockDataMapper } from './mock-data.mapper';

describe('Data Mappers', () => {
  it('should map API raw data correctly to NormalizedPost', () => {
    const rawApiData = {
      id: 'api_123',
      media_type: 'IMAGE',
      caption: 'Hello API',
      timestamp: '2026-07-31T10:00:00.000Z',
      like_count: 50,
      comments_count: 5,
      comments: {
        data: [
          { from: { username: 'user1' }, text: 'Nice!', timestamp: '2026-07-31T10:05:00.000Z' }
        ]
      }
    };

    const result = ApiDataMapper.mapToNormalized(rawApiData);

    expect(result.igMediaId).toEqual('api_123');
    expect(result.type).toEqual('IMAGE');
    expect(result.caption).toEqual('Hello API');
    expect(result.metrics.likes).toEqual(50);
    expect(result.metrics.commentsCount).toEqual(5);
    expect(result.comments?.length).toEqual(1);
    expect(result.comments?.[0].authorHash).toEqual('user1');
  });

  it('should map Scrape raw data correctly to NormalizedPost', () => {
    const rawScrapeData = {
      mediaId: 'scrape_456',
      postType: 'VIDEO',
      text: 'Hello Scrape',
      createdAt: '2026-07-31T11:00:00.000Z',
      likesCount: 120,
      commentsCount: 10,
      comments: [
        { author: 'user2', body: 'Cool video', date: '2026-07-31T11:05:00.000Z' }
      ]
    };

    const result = ScrapeDataMapper.mapToNormalized(rawScrapeData);

    expect(result.igMediaId).toEqual('scrape_456');
    expect(result.type).toEqual('VIDEO');
    expect(result.metrics.likes).toEqual(120);
    expect(result.comments?.length).toEqual(1);
    expect(result.comments?.[0].text).toEqual('Cool video');
  });

  it('should map Mock raw data correctly to NormalizedPost', () => {
    const rawMockData = {
      id: 'mock_789',
      caption: 'Hello Mock',
      likes: 30
    };

    const result = MockDataMapper.mapToNormalized(rawMockData);

    expect(result.igMediaId).toEqual('mock_789');
    expect(result.caption).toEqual('Hello Mock');
    expect(result.metrics.likes).toEqual(30);
  });
});