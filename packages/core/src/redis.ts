import Redis from 'ioredis';
import { logger } from './logger.js';

let redisInstance: Redis | null = null;

export function getRedis(): Redis {
  if (!redisInstance) {
    const url = process.env.REDIS_URL || 'redis://localhost:6381';
    redisInstance = new Redis(url, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) return null;
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
    });

    redisInstance.on('connect', () => logger.info('Redis connected'));
    redisInstance.on('error', (err) => logger.error({ err }, 'Redis error'));
  }

  return redisInstance;
}

export async function closeRedis(): Promise<void> {
  if (redisInstance) {
    await redisInstance.quit();
    redisInstance = null;
  }
}
