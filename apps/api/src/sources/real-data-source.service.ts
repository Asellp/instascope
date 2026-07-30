import { Injectable } from '@nestjs/common';
import { IDataSource } from './data-source.interface';

@Injectable()
export class RealDataSourceService implements IDataSource {
  async fetchProfile(params?: any): Promise<any> {
    const accountId = params?.accountId;
    return {
      source: 'real_api',
      type: 'profile',
      accountId,
      data: { username: `real_user_${accountId}`, followersCount: 12500 },
    };
  }

  async fetchPosts(params?: any): Promise<any> {
    const platform = params?.platform || 'social_media';
    return {
      source: 'real_api',
      type: 'posts',
      platform,
      data: [
        { id: 'real_post_1', caption: `Canlı ${platform} gönderisi 🌐`, likesCount: 320 },
      ],
    };
  }

  async fetchComments(params?: any): Promise<any> {
    return {
      source: 'real_api',
      type: 'comments',
      data: [
        { id: 'real_comment_1', text: 'Gerçek API yorumu.' },
      ],
    };
  }
}