import type { Request } from "express";

export interface ClientIdentity {
  ipHash: string;
  sessionId: string;
  userId?: string;
}

export type SecurityRequest = Request & {
  securityIdentity?: ClientIdentity;
  user?: { sub?: string; id?: string };
};

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
}

export interface ChatLease {
  release(): Promise<void>;
}
