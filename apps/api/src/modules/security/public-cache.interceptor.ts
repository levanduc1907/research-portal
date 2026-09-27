import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { from, Observable, of } from "rxjs";
import { switchMap, tap } from "rxjs/operators";
import { SecurityStoreService } from "./security-store.service";

const CACHE_TTLS: Record<string, number> = {
  "/v1/institution": 300,
  "/v1/stats": 60,
  "/v1/trends": 300,
  "/v1/topics": 300,
};

@Injectable()
export class PublicCacheInterceptor implements NestInterceptor {
  constructor(private readonly store: SecurityStoreService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== "http") return next.handle();
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const ttl = request.method === "GET" ? CACHE_TTLS[request.path] : undefined;
    if (!ttl) return next.handle();

    const key = `public:${request.path}`;
    return from(this.store.getCachedJson<unknown>(key)).pipe(
      switchMap((cached) => {
        if (cached !== undefined) {
          response.setHeader("X-Cache", "HIT");
          return of(cached);
        }
        response.setHeader("X-Cache", "MISS");
        return next.handle().pipe(
          tap((value) => {
            void this.store.setCachedJson(key, value, ttl);
          }),
        );
      }),
    );
  }
}
