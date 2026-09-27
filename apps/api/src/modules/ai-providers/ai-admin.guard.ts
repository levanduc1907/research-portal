import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { timingSafeEqual } from "node:crypto";
import type { Request } from "express";

@Injectable()
export class AiAdminGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.config.get<string>("AI_CREDENTIALS_ADMIN_TOKEN");
    const isProduction = this.config.get<string>("NODE_ENV") === "production";
    if (
      !expected ||
      (isProduction &&
        (expected.length < 32 || expected.startsWith("replace-with")))
    )
      throw new ServiceUnavailableException(
        "AI credential administration is not configured",
      );
    const request = context.switchToHttp().getRequest<Request>();
    const allowedIps = new Set(
      (this.config.get<string>("ADMIN_ALLOWED_IPS") || "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    );
    const requestIp = request.ip || request.socket.remoteAddress || "unknown";
    if (allowedIps.size > 0 && !allowedIps.has(requestIp)) {
      throw new ForbiddenException(
        "Administration is not allowed from this IP",
      );
    }
    const supplied = request.header("x-ai-admin-token") || "";
    const expectedBuffer = Buffer.from(expected);
    const suppliedBuffer = Buffer.from(supplied);
    if (
      expectedBuffer.length !== suppliedBuffer.length ||
      !timingSafeEqual(expectedBuffer, suppliedBuffer)
    ) {
      throw new UnauthorizedException("Invalid AI administration token");
    }
    return true;
  }
}
