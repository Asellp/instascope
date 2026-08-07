import { Test, TestingModule } from '@nestjs/testing';
import axios from 'axios';
import { RealDataSourceService } from '../src/sources/real-data-source.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('RealDataSourceService', () => {
  let service: RealDataSourceService;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useRealTimers();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [RealDataSourceService],
    }).compile();

    service = moduleFixture.get(RealDataSourceService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('fetchProfile', () => {
    it('accessToken eksikse hata fırlatmalı', async () => {
      await expect(service.fetchProfile({ igAccountId: 'acc1' })).rejects.toThrow(
        'Erişim tokeni (accessToken) bulunamadı veya boş!',
      );
    });

    it('başarılı yanıtta profil verisini dönmeli', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { id: 'acc1', username: 'testuser', followers_count: 100, media_count: 5 },
      });

      const result = await service.fetchProfile({ accessToken: 'tok', igAccountId: 'acc1' });

      expect(result.source).toBe('meta_api');
      expect(result.type).toBe('profile');
      expect(result.data.username).toBe('testuser');
    });

    it('API hatasında detaylı mesajla sarmalanmış hata fırlatmalı', async () => {
      mockedAxios.get.mockRejectedValue({
        response: { status: 400, data: { error: { message: 'Invalid token' } } },
      });

      await expect(
        service.fetchProfile({ accessToken: 'bad-tok', igAccountId: 'acc1' }),
      ).rejects.toThrow(/Meta API Hatası \(Profil\)/);
    });
  });

  describe('fetchPosts', () => {
    it('accessToken eksikse hata fırlatmalı', async () => {
      await expect(service.fetchPosts({ igAccountId: 'acc1' })).rejects.toThrow(
        'Erişim tokeni (accessToken) bulunamadı veya boş!',
      );
    });

    it('postları ve reach bilgisini başarıyla dönmeli', async () => {
      mockedAxios.get
        .mockResolvedValueOnce({
          data: {
            data: [
              {
                id: 'media1',
                caption: 'Test caption',
                media_type: 'IMAGE',
                media_url: 'https://example.com/img.jpg',
                permalink: 'https://instagram.com/p/media1',
                timestamp: '2026-08-01T00:00:00Z',
                like_count: 10,
                comments_count: 3,
              },
            ],
          },
        })
        .mockResolvedValueOnce({
          data: { data: [{ name: 'reach', values: [{ value: 42 }] }] },
        });

      const result = await service.fetchPosts({ accessToken: 'tok', igAccountId: 'acc1' });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('media1');
      expect(result.data[0].likesCount).toBe(10);
      expect(result.data[0].reach).toBe(42);
    });

    it('insights (reach) çekilemezse sessizce 0 ile devam etmeli', async () => {
      mockedAxios.get
        .mockResolvedValueOnce({
          data: {
            data: [
              {
                id: 'media2',
                caption: '',
                media_type: 'VIDEO',
                media_url: 'https://example.com/vid.mp4',
                permalink: 'https://instagram.com/p/media2',
                timestamp: '2026-08-01T00:00:00Z',
                like_count: 5,
                comments_count: 1,
              },
            ],
          },
        })
        .mockRejectedValueOnce({ response: { status: 403 } });

      const result = await service.fetchPosts({ accessToken: 'tok', igAccountId: 'acc1' });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].reach).toBe(0);
      expect(result.data[0].views).toBe(0);
    });

    it('ana media isteği başarısız olursa sarmalanmış hata fırlatmalı', async () => {
      mockedAxios.get.mockRejectedValue({
        response: { status: 400, data: { error: 'bad request' } },
      });

      await expect(
        service.fetchPosts({ accessToken: 'tok', igAccountId: 'acc1' }),
      ).rejects.toThrow(/Meta API Hatası \(Gönderiler\)/);
    });
  });

  describe('fetchComments', () => {
    it('accessToken veya igMediaId eksikse hata fırlatmalı', async () => {
      await expect(service.fetchComments({ igMediaId: 'media1' })).rejects.toThrow(
        'Erişim tokeni veya Medya ID eksik!',
      );
      await expect(service.fetchComments({ accessToken: 'tok' })).rejects.toThrow(
        'Erişim tokeni veya Medya ID eksik!',
      );
    });

    it('yorumları başarıyla dönmeli', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          data: [
            { id: 'c1', text: 'Harika!', username: 'user1', timestamp: '2026-08-01T00:00:00Z' },
          ],
        },
      });

      const result = await service.fetchComments({ accessToken: 'tok', igMediaId: 'media1' });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].text).toBe('Harika!');
    });

    it('API hatasında hata fırlatmak yerine boş dizi dönmeli (diğer metodlardan farklı davranış)', async () => {
      jest.useFakeTimers();

      mockedAxios.get.mockRejectedValue({
        response: { status: 500, data: 'Server error' },
      });

      const promise = service.fetchComments({ accessToken: 'tok', igMediaId: 'media1' });

      // fetchWithRetry 500'de 3 kez retry deniyor: 1s + 2s + 4s backoff
      await jest.advanceTimersByTimeAsync(1000);
      await jest.advanceTimersByTimeAsync(2000);
      await jest.advanceTimersByTimeAsync(4000);

      const result = await promise;

      expect(result.data).toEqual([]);
      expect(result.type).toBe('comments');

      jest.useRealTimers();
    });
  });

  describe('retry / backoff davranışı', () => {
    it('429 alındığında tekrar deneyip sonunda başarılı olmalı', async () => {
      jest.useFakeTimers();

      mockedAxios.get
        .mockRejectedValueOnce({ response: { status: 429 } })
        .mockResolvedValueOnce({
          data: { id: 'acc1', username: 'retried_user', followers_count: 1, media_count: 1 },
        });

      const promise = service.fetchProfile({ accessToken: 'tok', igAccountId: 'acc1' });

      await jest.advanceTimersByTimeAsync(1000);

      const result = await promise;
      expect(result.data.username).toBe('retried_user');
      expect(mockedAxios.get).toHaveBeenCalledTimes(2);

      jest.useRealTimers();
    });

    it('deneme hakları tükenirse son hatayı fırlatmalı', async () => {
      jest.useFakeTimers();
      mockedAxios.get.mockRejectedValue({ response: { status: 503 } });

      const promise = service.fetchProfile({ accessToken: 'tok', igAccountId: 'acc1' });
      const assertion = expect(promise).rejects.toThrow(/Meta API Hatası \(Profil\)/);

      await jest.advanceTimersByTimeAsync(1000);
      await jest.advanceTimersByTimeAsync(2000);
      await jest.advanceTimersByTimeAsync(4000);

      await assertion;
      expect(mockedAxios.get).toHaveBeenCalledTimes(4);

      jest.useRealTimers();
    });
  });
});