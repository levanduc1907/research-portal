import { Global, Module } from "@nestjs/common";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ChatAdmissionService } from "./chat-admission.service";
import { ClientIdentityService } from "./client-identity.service";
import { RateLimitGuard } from "./rate-limit.guard";
import { PublicCacheInterceptor } from "./public-cache.interceptor";
import { SecurityStoreService } from "./security-store.service";

@Global()
@Module({
  providers: [
    SecurityStoreService,
    ClientIdentityService,
    ChatAdmissionService,
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: PublicCacheInterceptor,
    },
  ],
  exports: [SecurityStoreService, ClientIdentityService, ChatAdmissionService],
})
export class SecurityModule {}
