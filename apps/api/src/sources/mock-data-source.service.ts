import { Injectable } from '@nestjs/common';
import { IDataSource } from './data-source.interface';

@Injectable()
export class MockDataSourceService implements IDataSource {
  async fetchProfile(params?: any): Promise<any> {
    const accountId = params?.accountId || 'mock_user';
    return {
      source: 'mock',
      type: 'profile',
      accountId,
      data: { username: `${accountId}_mock`, followersCount: 1500 },
    };
  }

  async fetchPosts(params?: any): Promise<any> {
    const platform = params?.platform || 'social_media';
    return {
      source: 'mock',
      type: 'posts',
      platform,
      data: [
        { id: 'mock_post_1', caption: `Mock ${platform} gönderisi 🚀`, likesCount: 145 },
      ],
    };
  }

  async fetchComments(params?: any): Promise<any> {
    return {
      source: 'mock',
      type: 'comments',
      data: [
        { id: 'mock_comment_1', text: 'Harika bir paylaşım!' },
      ],
    };
  }
}