import { Module } from "@nestjs/common";
import { AiAdapterRegistry } from "./ai-adapter.registry";
import { AiAdminGuard } from "./ai-admin.guard";
import { AiCredentialsController } from "./ai-credentials.controller";
import { AiCredentialsService } from "./ai-credentials.service";
import { CredentialCryptoService } from "./credential-crypto.service";
import { GeminiAdapter } from "./gemini.adapter";
import { OpenAiAdapter } from "./openai.adapter";
import { OpenAiCompatibleAdapter } from "./openai-compatible.adapter";

@Module({
  controllers: [AiCredentialsController],
  providers: [
    AiAdminGuard,
    AiCredentialsService,
    CredentialCryptoService,
    AiAdapterRegistry,
    OpenAiAdapter,
    GeminiAdapter,
    OpenAiCompatibleAdapter,
  ],
  exports: [AiCredentialsService],
})
export class AiProvidersModule {}
