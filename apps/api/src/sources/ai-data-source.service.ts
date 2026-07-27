import { Injectable } from '@nestjs/common';
import { IDataSource } from './data-source.interface';

@Injectable()
export class AiDataSourceService implements IDataSource {
  async fetchProfile(params?: any): Promise<any> {
    return {
      source: 'ai_generated',
      type: 'profile',
      data: { description: 'AI tarafından sentezlenmiş profil analizi 🤖' },
    };
  }

  async fetchPosts(params?: any): Promise<any> {
    const platform = params?.platform || 'social_media';
    return {
      source: 'ai_generated',
      type: 'posts',
      platform,
      data: [
        { id: 'ai_post_1', caption: `AI üretimi ${platform} metni 🧠`, likesCount: 512 },
      ],
    };
  }

  async fetchComments(params?: any): Promise<any> {
    return {
      source: 'ai_generated',
      type: 'comments',
      data: [
        { id: 'ai_comment_1', text: 'AI sentiment analizi olumlu.' },
      ],
    };
  }
}