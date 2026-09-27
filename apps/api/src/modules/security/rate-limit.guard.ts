import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Request, Response } from "express";
import { ClientIdentityService } from "./client-identity.service";
import { SecurityStoreService } from "./security-store.service";
import type {
  ClientIdentity,
  RateLimitResult,
  SecurityRequest,
} from "./security.types";

type RatePolicy = {
  name: string;
  limit: number;
  windowMs: number;
};

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly config: ConfigService,
    private readonly identities: ClientIdentityService,
    private readonly store: SecurityStoreService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== "http") return true;
    const request = context.switchToHttp().getRequest<SecurityRequest>();
    const response = context.switchToHttp().getResponse<Response>();
    if (
      request.method === "OPTIONS" ||
      this.config.get<string>("SECURITY_RATE_LIMIT_ENABLED", "true") === "false"
    ) {
      return true;
    }

    const identity = this.identities.getOrCreate(request, response);
    const policies = this.resolvePolicies(request, identity);
    const trackers = identity.userId
      ? [`user:${identity.userId}`, `ip:${identity.ipHash}`]
      : [`session:${identity.sessionId}`, `ip:${identity.ipHash}`];

    let strictest: RateLimitResult | null = null;
    for (const policy of policies) {
      for (const tracker of trackers) {
        const result = await this.store.consumeRateLimit(
          `${policy.name}:${tracker}`,
          policy.limit,
          policy.windowMs,
        );
        if (
          !strictest ||
          result.remaining / result.limit <
            strictest.remaining / strictest.limit
        ) {
          strictest = result;
        }
        if (!result.allowed) {
          this.setHeaders(response, result);
          throw new HttpException(
            {
              statusCode: HttpStatus.TOO_MANY_REQUESTS,
              error: "Too Many Requests",
              message: "Request quota exceeded. Please retry later.",
            },
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }
      }
    }

    if (strictest) this.setHeaders(response, strictest);
    return true;
  }

  private resolvePolicies(
    request: Request,
    identity: ClientIdentity,
  ): RatePolicy[] {
    const path = request.path;
    if (path.startsWith("/v1/admin/")) {
      return [
        this.policy("admin-minute", "RATE_LIMIT_ADMIN_PER_MINUTE", 10, 60_000),
      ];
    }
    if (path === "/v1/chat" || path === "/v1/chat/stream") {
      const authenticated = Boolean(identity.userId);
      return [
        this.policy(
          authenticated ? "chat-auth-minute" : "chat-anon-minute",
          authenticated
            ? "RATE_LIMIT_CHAT_AUTH_PER_MINUTE"
            : "RATE_LIMIT_CHAT_ANON_PER_MINUTE",
          authenticated ? 10 : 5,
          60_000,
        ),
        this.policy(
          authenticated ? "chat-auth-day" : "chat-anon-day",
          authenticated
            ? "RATE_LIMIT_CHAT_AUTH_PER_DAY"
            : "RATE_LIMIT_CHAT_ANON_PER_DAY",
          authenticated ? 200 : 30,
          24 * 60 * 60 * 1_000,
        ),
      ];
    }
    if (path === "/v1/researchers/departments") {
      return [
        this.policy(
          "departments-minute",
          "RATE_LIMIT_DEPARTMENT_PER_MINUTE",
          30,
          60_000,
        ),
      ];
    }
    return [
      this.policy("public-minute", "RATE_LIMIT_PUBLIC_PER_MINUTE", 120, 60_000),
    ];
  }

  private policy(
    name: string,
    envName: string,
    fallback: number,
    windowMs: number,
  ): RatePolicy {
    const configured = Number(this.config.get<string>(envName));
    return {
      name,
      limit:
        Number.isSafeInteger(configured) && configured > 0
          ? configured
          : fallback,
      windowMs,
    };
  }

  private setHeaders(response: Response, result: RateLimitResult): void {
    response.setHeader("RateLimit-Limit", String(result.limit));
    response.setHeader("RateLimit-Remaining", String(result.remaining));
    response.setHeader("RateLimit-Reset", String(result.retryAfterSeconds));
    if (!result.allowed) {
      response.setHeader("Retry-After", String(result.retryAfterSeconds));
    }
  }
}
