import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class CacheService {
  private hits = 0;
  private misses = 0;

  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    if (value) {
      this.hits++;
      this.logHitRate();
      return JSON.parse(value);
    }
    this.misses++;
    this.logHitRate();
    return null;
  }

  async set(key: string, value: unknown, ttlSeconds: number) {
    await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  }

  async invalidatePattern(pattern: string) {
    const keys = await this.redis.keys(pattern);
    if (keys.length) await this.redis.del(...keys);
  }

  private logHitRate() {
    const total = this.hits + this.misses;
    const rate = ((this.hits / total) * 100).toFixed(1);
    console.log(`[Cache] hit rate: ${rate}% (${this.hits}/${total})`);
  }
}