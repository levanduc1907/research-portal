import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";
import type { RateLimitResult } from "./security.types";

type LocalRateEntry = { count: number; expiresAt: number };
type LocalCacheEntry = { value: unknown; expiresAt: number };

const RATE_LIMIT_SCRIPT = `
local current = redis.call("INCR", KEYS[1])
if current == 1 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
end
local ttl = redis.call("PTTL", KEYS[1])
return { current, ttl }
`;

const ACQUIRE_SLOT_SCRIPT = `
redis.call("ZREMRANGEBYSCORE", KEYS[1], "-inf", ARGV[1])
local current = redis.call("ZCARD", KEYS[1])
if current >= tonumber(ARGV[2]) then
  return { 0, current }
end
redis.call("ZADD", KEYS[1], ARGV[3], ARGV[4])
redis.call("PEXPIRE", KEYS[1], ARGV[5])
return { 1, current + 1 }
`;

@Injectable()
export class SecurityStoreService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SecurityStoreService.name);
  private readonly redis?: Redis;
  private readonly requireRedis: boolean;
  private redisReady = false;
  private readonly localRates = new Map<string, LocalRateEntry>();
  private readonly localSlots = new Map<string, Map<string, number>>();
  private readonly localCache = new Map<string, LocalCacheEntry>();

  constructor(private readonly config: ConfigService) {
    const redisUrl = this.config.get<string>("REDIS_URL")?.trim();
    this.requireRedis =
      this.config.get<string>("SECURITY_REQUIRE_REDIS") === "true" ||
      this.config.get<string>("NODE_ENV") === "production";

    if (redisUrl) {
      this.redis = new Redis(redisUrl, {
        lazyConnect: true,
        connectTimeout: 2_000,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        retryStrategy: (attempt) => Math.min(attempt * 250, 2_000),
      });
      this.redis.on("ready", () => {
        this.redisReady = true;
      });
      this.redis.on("close", () => {
        this.redisReady = false;
      });
      this.redis.on("error", (error) => {
        this.redisReady = false;
        this.logger.warn(`Redis security store unavailable: ${error.message}`);
      });
    }
  }

  async onModuleInit(): Promise<void> {
    if (!this.redis) {
      if (this.requireRedis) {
        throw new Error(
          "REDIS_URL is required for production traffic protection",
        );
      }
      this.logger.warn(
        "REDIS_URL is not configured; using a single-process development limiter",
      );
      return;
    }

    try {
      await this.redis.connect();
      await this.redis.ping();
      this.redisReady = true;
      this.logger.log("Redis-backed traffic protection is ready");
    } catch (error) {
      this.redisReady = false;
      if (this.requireRedis) throw error;
      this.logger.warn(
        `Redis unavailable; using a single-process development limiter: ${error instanceof Error ? error.message : "connection failed"}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redis) await this.redis.quit().catch(() => undefined);
  }

  async consumeRateLimit(
    key: string,
    limit: number,
    windowMs: number,
  ): Promise<RateLimitResult> {
    if (this.redis && this.redisReady) {
      try {
        const raw = (await this.redis.eval(
          RATE_LIMIT_SCRIPT,
          1,
          `security:rate:${key}`,
          String(windowMs),
        )) as [number, number];
        return this.toRateLimitResult(raw[0], raw[1], limit);
      } catch (error) {
        this.redisReady = false;
        this.logger.error(
          `Redis rate-limit operation failed: ${error instanceof Error ? error.message : "unknown error"}`,
        );
      }
    }

    this.assertFallbackAllowed();
    return this.consumeLocalRateLimit(key, limit, windowMs);
  }

  async acquireSlot(
    key: string,
    token: string,
    limit: number,
    leaseMs: number,
  ): Promise<boolean> {
    const now = Date.now();
    const expiresAt = now + leaseMs;
    if (this.redis && this.redisReady) {
      try {
        const raw = (await this.redis.eval(
          ACQUIRE_SLOT_SCRIPT,
          1,
          `security:slots:${key}`,
          String(now),
          String(limit),
          String(expiresAt),
          token,
          String(leaseMs + 5_000),
        )) as [number, number];
        return raw[0] === 1;
      } catch (error) {
        this.redisReady = false;
        this.logger.error(
          `Redis concurrency operation failed: ${error instanceof Error ? error.message : "unknown error"}`,
        );
      }
    }

    this.assertFallbackAllowed();
    const slots = this.localSlots.get(key) ?? new Map<string, number>();
    for (const [slotToken, expiry] of slots) {
      if (expiry <= now) slots.delete(slotToken);
    }
    if (slots.size >= limit) return false;
    slots.set(token, expiresAt);
    this.localSlots.set(key, slots);
    return true;
  }

  async releaseSlot(key: string, token: string): Promise<void> {
    if (this.redis && this.redisReady) {
      try {
        await this.redis.zrem(`security:slots:${key}`, token);
        return;
      } catch (error) {
        this.redisReady = false;
        this.logger.error(
          `Redis concurrency release failed: ${error instanceof Error ? error.message : "unknown error"}`,
        );
      }
    }
    this.localSlots.get(key)?.delete(token);
  }

  async getCachedJson<T>(key: string): Promise<T | undefined> {
    if (this.redis && this.redisReady) {
      try {
        const value = await this.redis.get(`security:cache:${key}`);
        return value === null ? undefined : (JSON.parse(value) as T);
      } catch (error) {
        this.logger.warn(
          `Redis cache read failed: ${error instanceof Error ? error.message : "unknown error"}`,
        );
      }
    }

    const entry = this.localCache.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.localCache.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  async setCachedJson(
    key: string,
    value: unknown,
    ttlSeconds: number,
  ): Promise<void> {
    if (this.redis && this.redisReady) {
      try {
        await this.redis.set(
          `security:cache:${key}`,
          JSON.stringify(value),
          "EX",
          ttlSeconds,
        );
        return;
      } catch (error) {
        this.logger.warn(
          `Redis cache write failed: ${error instanceof Error ? error.message : "unknown error"}`,
        );
      }
    }

    if (!this.requireRedis) {
      this.localCache.set(key, {
        value,
        expiresAt: Date.now() + ttlSeconds * 1_000,
      });
    }
  }

  private assertFallbackAllowed(): void {
    if (this.requireRedis) {
      throw new ServiceUnavailableException(
        "Traffic protection is temporarily unavailable",
      );
    }
  }

  private consumeLocalRateLimit(
    key: string,
    limit: number,
    windowMs: number,
  ): RateLimitResult {
    const now = Date.now();
    const existing = this.localRates.get(key);
    const entry =
      !existing || existing.expiresAt <= now
        ? { count: 0, expiresAt: now + windowMs }
        : existing;
    entry.count += 1;
    this.localRates.set(key, entry);

    if (this.localRates.size > 10_000) {
      for (const [entryKey, value] of this.localRates) {
        if (value.expiresAt <= now) this.localRates.delete(entryKey);
      }
    }

    return this.toRateLimitResult(entry.count, entry.expiresAt - now, limit);
  }

  private toRateLimitResult(
    count: number,
    ttlMs: number,
    limit: number,
  ): RateLimitResult {
    return {
      allowed: count <= limit,
      limit,
      remaining: Math.max(0, limit - count),
      retryAfterSeconds: Math.max(1, Math.ceil(Math.max(0, ttlMs) / 1_000)),
    };
  }
}
