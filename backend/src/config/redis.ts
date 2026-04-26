import { config } from './index.js';

let redisClient: any = null;

export async function getRedis() {
  if (redisClient) return redisClient;
  
  try {
    const Redis = (await import('ioredis')).default as any;
    redisClient = new Redis(config.redis.url, {
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      enableReadyCheck: true,
    });
    redisClient.on('error', (err: Error) => {
      console.warn('Redis connection error (continuing without cache):', err.message);
    });
    redisClient.on('connect', () => {
      console.log('Redis connected');
    });
    return redisClient;
  } catch (err) {
    console.warn('Redis not available, continuing without cache');
    return null;
  }
}
