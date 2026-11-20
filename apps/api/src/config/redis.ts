import Redis from 'ioredis';
import { env } from './env';

type RedisStore = {
  set(key: string, value: string, ...options: (string | number)[]): Promise<'OK' | null>;
  get(key: string): Promise<string | null>;
  del(...keys: string[]): Promise<number>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
};

function createMemoryStore(): RedisStore {
  const entries = new Map<string, { value: string; expiresAt?: number }>();

  function getEntry(key: string) {
    const entry = entries.get(key);
    if (entry?.expiresAt !== undefined && entry.expiresAt <= Date.now()) {
      entries.delete(key);
      return undefined;
    }
    return entry;
  }

  return {
    async set(key, value, ...options) {
      const current = getEntry(key);
      if (options.includes('NX') && current) return null;

      const expiryIndex = options.indexOf('EX');
      const expiresAt =
        expiryIndex >= 0 ? Date.now() + Number(options[expiryIndex + 1]) * 1000 : undefined;
      entries.set(key, { value, expiresAt });
      return 'OK';
    },
    async get(key) {
      return getEntry(key)?.value ?? null;
    },
    async del(...keys) {
      return keys.reduce((deleted, key) => {
        getEntry(key);
        return deleted + (entries.delete(key) ? 1 : 0);
      }, 0);
    },
    async incr(key) {
      const entry = getEntry(key);
      const value = Number(entry?.value ?? 0) + 1;
      entries.set(key, { value: String(value), expiresAt: entry?.expiresAt });
      return value;
    },
    async expire(key, seconds) {
      const entry = getEntry(key);
      if (!entry) return 0;
      entries.set(key, { ...entry, expiresAt: Date.now() + seconds * 1000 });
      return 1;
    },
  };
}

const redisClient = env.REDIS_URL
  ? new Redis(env.REDIS_URL, { maxRetriesPerRequest: 3 })
  : undefined;

redisClient?.on('error', (err) => {
  console.error('[Redis Error]', err.message);
});

export const redis: RedisStore = redisClient
  ? {
      set: async (key, value, ...options) => {
        const result = await redisClient.call('set', key, value, ...options.map(String));
        return result === 'OK' ? 'OK' : null;
      },
      get: (key) => redisClient.get(key),
      del: (...keys) => redisClient.del(...keys),
      incr: (key) => redisClient.incr(key),
      expire: (key, seconds) => redisClient.expire(key, seconds),
    }
  : createMemoryStore();