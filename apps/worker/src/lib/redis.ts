import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

let _redis: Redis | null = null;

export function getRedis(): Redis {
  if (!_redis) {
    _redis = new Redis(REDIS_URL, {
      maxRetriesPerRequest: null, // required for BullMQ
      enableReadyCheck: false,
    });
  }
  return _redis;
}

/** Connection options for BullMQ (expects config, not a Redis instance) */
export function getRedisOptions() {
  return {
    url: REDIS_URL,
    maxRetriesPerRequest: null as null,
    enableReadyCheck: false,
  };
}
