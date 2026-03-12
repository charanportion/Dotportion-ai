import Redis from "ioredis";
import { env } from "../env";

let _redis: Redis | null = null;

export function getRedis(): Redis {
  if (!_redis) {
    _redis = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null, // required for BullMQ
    });
  }
  return _redis;
}

/** Connection options for BullMQ (expects config, not a Redis instance) */
export function getRedisOptions() {
  return {
    url: env.REDIS_URL,
    maxRetriesPerRequest: null as null,
  };
}
