import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import type { Response } from "express";
import type { ClientIdentity, SecurityRequest } from "./security.types";

const SESSION_COOKIE = "rp_session";
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

@Injectable()
export class ClientIdentityService {
  private readonly sessionSecret: Buffer;
  private readonly isProduction: boolean;

  constructor(private readonly config: ConfigService) {
    this.isProduction = this.config.get<string>("NODE_ENV") === "production";
    const configuredSecret = this.config
      .get<string>("ANONYMOUS_SESSION_SECRET")
      ?.trim();
    if (
      this.isProduction &&
      (!configuredSecret ||
        configuredSecret.length < 32 ||
        configuredSecret.startsWith("replace-with"))
    ) {
      throw new Error(
        "ANONYMOUS_SESSION_SECRET must contain at least 32 non-placeholder characters in production",
      );
    }
    this.sessionSecret = Buffer.from(
      configuredSecret || randomBytes(32).toString("base64url"),
    );
  }

  getOrCreate(req: SecurityRequest, res: Response): ClientIdentity {
    if (req.securityIdentity) return req.securityIdentity;

    const cookies = this.parseCookies(req.headers.cookie);
    const verifiedSessionId = this.verifyCookie(cookies[SESSION_COOKIE]);
    const sessionId = verifiedSessionId || randomUUID();
    if (!verifiedSessionId) this.setSessionCookie(res, sessionId);

    const userId = req.user?.sub || req.user?.id;
    const identity: ClientIdentity = {
      ipHash: this.hash(req.ip || req.socket.remoteAddress || "unknown"),
      sessionId,
      userId: userId ? this.hash(userId) : undefined,
    };
    req.securityIdentity = identity;
    return identity;
  }

  private parseCookies(header?: string): Record<string, string> {
    if (!header) return {};
    return Object.fromEntries(
      header.split(";").flatMap((part) => {
        const separator = part.indexOf("=");
        if (separator < 1) return [];
        const key = part.slice(0, separator).trim();
        const rawValue = part.slice(separator + 1).trim();
        try {
          return [[key, decodeURIComponent(rawValue)]];
        } catch {
          return [];
        }
      }),
    );
  }

  private verifyCookie(value?: string): string | null {
    if (!value) return null;
    const separator = value.lastIndexOf(".");
    if (separator < 1) return null;
    const sessionId = value.slice(0, separator);
    const signature = value.slice(separator + 1);
    if (!/^[0-9a-f-]{36}$/i.test(sessionId)) return null;

    const expected = Buffer.from(this.sign(sessionId));
    const supplied = Buffer.from(signature);
    if (
      expected.length !== supplied.length ||
      !timingSafeEqual(expected, supplied)
    ) {
      return null;
    }
    return sessionId;
  }

  private setSessionCookie(res: Response, sessionId: string): void {
    const sameSite = this.config
      .get<string>("SESSION_COOKIE_SAME_SITE", "lax")
      .toLowerCase();
    const normalizedSameSite = ["lax", "strict", "none"].includes(sameSite)
      ? sameSite
      : "lax";
    const secure = this.isProduction || normalizedSameSite === "none";
    const parts = [
      `${SESSION_COOKIE}=${encodeURIComponent(`${sessionId}.${this.sign(sessionId)}`)}`,
      "Path=/",
      `Max-Age=${SESSION_MAX_AGE_SECONDS}`,
      "HttpOnly",
      `SameSite=${normalizedSameSite[0].toUpperCase()}${normalizedSameSite.slice(1)}`,
    ];
    if (secure) parts.push("Secure");
    res.appendHeader("Set-Cookie", parts.join("; "));
  }

  private sign(value: string): string {
    return createHmac("sha256", this.sessionSecret)
      .update(value)
      .digest("base64url");
  }

  private hash(value: string): string {
    return createHash("sha256").update(value).digest("hex").slice(0, 24);
  }
}
