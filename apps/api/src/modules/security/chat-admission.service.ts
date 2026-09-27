import {
  HttpException,
  HttpStatus,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomUUID } from "node:crypto";
import type { Response } from "express";
import { ClientIdentityService } from "./client-identity.service";
import { SecurityStoreService } from "./security-store.service";
import type { ChatLease, SecurityRequest } from "./security.types";

@Injectable()
export class ChatAdmissionService {
  constructor(
    private readonly config: ConfigService,
    private readonly identities: ClientIdentityService,
    private readonly store: SecurityStoreService,
  ) {}

  async acquire(req: SecurityRequest, res: Response): Promise<ChatLease> {
    const identity = this.identities.getOrCreate(req, res);
    const token = randomUUID();
    const timeoutMs = this.positiveInt("CHAT_REQUEST_TIMEOUT_MS", 60_000);
    const leaseMs = timeoutMs + 15_000;
    const globalLimit = this.positiveInt("CHAT_MAX_CONCURRENT_GLOBAL", 20);
    const clientLimit = identity.userId
      ? this.positiveInt("CHAT_MAX_CONCURRENT_AUTH", 2)
      : this.positiveInt("CHAT_MAX_CONCURRENT_ANON", 1);
    const clientKey = identity.userId
      ? `chat:user:${identity.userId}`
      : `chat:session:${identity.sessionId}`;

    const globalAcquired = await this.store.acquireSlot(
      "chat:global",
      token,
      globalLimit,
      leaseMs,
    );
    if (!globalAcquired) {
      res.setHeader("Retry-After", "5");
      throw new ServiceUnavailableException(
        "The research assistant is at capacity. Please retry shortly.",
      );
    }

    const clientAcquired = await this.store.acquireSlot(
      clientKey,
      token,
      clientLimit,
      leaseMs,
    );
    if (!clientAcquired) {
      await this.store.releaseSlot("chat:global", token);
      res.setHeader("Retry-After", "5");
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: "Too Many Requests",
          message: "Another chat request is already running.",
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    let released = false;
    return {
      release: async () => {
        if (released) return;
        released = true;
        await Promise.all([
          this.store.releaseSlot("chat:global", token),
          this.store.releaseSlot(clientKey, token),
        ]);
      },
    };
  }

  requestTimeoutMs(): number {
    return this.positiveInt("CHAT_REQUEST_TIMEOUT_MS", 60_000);
  }

  private positiveInt(name: string, fallback: number): number {
    const configured = Number(this.config.get<string>(name));
    return Number.isSafeInteger(configured) && configured > 0
      ? configured
      : fallback;
  }
}
