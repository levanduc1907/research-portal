import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { AiCredentialDto, AiProvider } from "@repo/contracts";
import type { AiCredential } from "@repo/database";
import { PrismaService } from "../database/prisma.service";
import { AiAdapterRegistry } from "./ai-adapter.registry";
import { CredentialCryptoService } from "./credential-crypto.service";
import type { AiProviderAdapter } from "./ai-provider.types";
import type {
  CreateAiCredentialRequest,
  UpdateAiCredentialRequest,
} from "./ai-credential.dto";

interface AiTraceContext {
  requestId: string;
  purpose: "classification" | "answer";
}

@Injectable()
export class AiCredentialsService {
  private readonly logger = new Logger(AiCredentialsService.name);
  private consecutiveTransientFailures = 0;
  private circuitOpenUntil = 0;
  private readonly credentialCooldowns = new Map<string, number>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CredentialCryptoService,
    private readonly adapters: AiAdapterRegistry,
    private readonly config: ConfigService,
  ) {}

  private toDto(item: AiCredential): AiCredentialDto {
    return {
      id: item.id,
      name: item.name,
      provider: item.provider as AiProvider,
      keyHint: item.keyHint,
      baseUrl: item.baseUrl,
      defaultModel: item.defaultModel,
      isActive: item.isActive,
      isDefault: item.isDefault,
      lastTestedAt: item.lastTestedAt?.toISOString() ?? null,
      lastTestStatus: item.lastTestStatus as "success" | "failed" | null,
      lastError: item.lastError,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }

  async findAll(): Promise<AiCredentialDto[]> {
    const items = await this.prisma.aiCredential.findMany({
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });
    return items.map((item) => this.toDto(item));
  }

  async create(input: CreateAiCredentialRequest): Promise<AiCredentialDto> {
    this.assertAllowedBaseUrl(input.baseUrl);
    const encrypted = this.crypto.encrypt(input.apiKey);
    const item = await this.prisma.$transaction(async (tx) => {
      if (input.isDefault)
        await tx.aiCredential.updateMany({ data: { isDefault: false } });
      return tx.aiCredential.create({
        data: {
          name: input.name.trim(),
          provider: input.provider,
          encryptedApiKey: encrypted.encrypted,
          encryptionIv: encrypted.iv,
          encryptionTag: encrypted.tag,
          keyHint: `••••${input.apiKey.slice(-4)}`,
          baseUrl: input.baseUrl?.replace(/\/$/, "") || null,
          defaultModel: input.defaultModel.trim(),
          isActive: input.isActive ?? true,
          isDefault: input.isDefault ?? false,
        },
      });
    });
    return this.toDto(item);
  }

  async update(
    id: string,
    input: UpdateAiCredentialRequest,
  ): Promise<AiCredentialDto> {
    const existing = await this.requireCredential(id);
    this.assertAllowedBaseUrl(
      input.baseUrl === undefined ? existing.baseUrl : input.baseUrl,
    );
    const encrypted = input.apiKey ? this.crypto.encrypt(input.apiKey) : null;
    const item = await this.prisma.$transaction(async (tx) => {
      if (input.isDefault)
        await tx.aiCredential.updateMany({
          where: { id: { not: id } },
          data: { isDefault: false },
        });
      return tx.aiCredential.update({
        where: { id },
        data: {
          name: input.name?.trim(),
          baseUrl:
            input.baseUrl === undefined
              ? undefined
              : input.baseUrl?.replace(/\/$/, "") || null,
          defaultModel: input.defaultModel?.trim(),
          isActive: input.isActive,
          isDefault: input.isDefault,
          ...(encrypted && {
            encryptedApiKey: encrypted.encrypted,
            encryptionIv: encrypted.iv,
            encryptionTag: encrypted.tag,
            keyHint: `••••${input.apiKey!.slice(-4)}`,
          }),
        },
      });
    });
    return this.toDto(item);
  }

  async remove(id: string): Promise<void> {
    await this.requireCredential(id);
    await this.prisma.aiCredential.delete({ where: { id } });
  }

  async test(id: string): Promise<AiCredentialDto> {
    const credential = await this.requireCredential(id);
    this.assertAllowedBaseUrl(credential.baseUrl);
    const result = await this.adapters
      .get(credential.provider as AiProvider)
      .test({
        apiKey: this.crypto.decrypt(
          credential.encryptedApiKey,
          credential.encryptionIv,
          credential.encryptionTag,
        ),
        baseUrl: credential.baseUrl,
        model: credential.defaultModel,
      });
    const updated = await this.prisma.aiCredential.update({
      where: { id },
      data: {
        lastTestedAt: new Date(),
        lastTestStatus: result.ok ? "success" : "failed",
        lastError: result.error ?? null,
      },
    });
    return this.toDto(updated);
  }

  async streamDefault(
    prompt: string,
    onToken: (token: string) => void,
    signal?: AbortSignal,
    _traceContext?: AiTraceContext,
  ): Promise<boolean> {
    if (this.circuitOpenUntil > Date.now()) {
      throw new ServiceUnavailableException(
        "AI provider circuit breaker is open. Please retry later.",
      );
    }
    const credentials = await this.prisma.aiCredential.findMany({
      where: { isActive: true },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });
    let lastError: Error | null = null;
    for (const credential of credentials) {
      if (this.isCredentialCoolingDown(credential.id)) {
        continue;
      }

      let emittedToken = false;
      try {
        await this.streamWithProtection(
          this.adapters.get(credential.provider as AiProvider),
          {
            apiKey: this.crypto.decrypt(
              credential.encryptedApiKey,
              credential.encryptionIv,
              credential.encryptionTag,
            ),
            baseUrl: credential.baseUrl,
            model: credential.defaultModel,
          },
          prompt,
          (token) => {
            emittedToken = true;
            onToken(token);
          },
          signal,
        );
        this.credentialCooldowns.delete(credential.id);
        return true;
      } catch (reason) {
        const error =
          reason instanceof Error ? reason : new Error("Unknown AI error");
        if (signal?.aborted) throw error;

        const canFallback = this.isCredentialFallbackFailure(error.message);
        if (canFallback) {
          const cooldownMs = this.cooldownCredential(
            credential.id,
            error.message,
          );
          this.logger.warn(
            `AI credential ${this.safeCredentialName(credential.name)} is temporarily unavailable; cooldownMs=${cooldownMs}; emittedToken=${emittedToken}; tryingFallback=${!emittedToken}; reason=${this.safeErrorMessage(error.message)}`,
          );
        }

        if (emittedToken || !canFallback) throw error;
        lastError = error;
      }
    }

    const geminiKey = this.config.get<string>("GEMINI_API_KEY");
    const geminiKeyAlreadyConfigured =
      geminiKey &&
      credentials.some((credential) =>
        this.credentialMatchesApiKey(credential, geminiKey),
      );
    if (geminiKey && !geminiKeyAlreadyConfigured) {
      await this.streamWithProtection(
        this.adapters.get("GEMINI"),
        {
          apiKey: geminiKey,
          baseUrl: "https://generativelanguage.googleapis.com/v1beta",
          model: this.config.get("GEMINI_CHAT_MODEL", "gemini-flash-latest"),
        },
        prompt,
        onToken,
        signal,
      );
      return true;
    }

    if (lastError) throw lastError;
    if (credentials.length > 0) {
      throw new ServiceUnavailableException(
        "All active AI credentials are temporarily cooling down.",
      );
    }
    return false;
  }

  async completeDefault(
    prompt: string,
    signal?: AbortSignal,
    traceContext?: AiTraceContext,
  ): Promise<string | null> {
    let output = "";
    const usedProvider = await this.streamDefault(
      prompt,
      (token) => {
        output += token;
      },
      signal,
      traceContext,
    );
    return usedProvider ? output.trim() : null;
  }

  private credentialMatchesApiKey(
    credential: AiCredential,
    apiKey: string,
  ): boolean {
    try {
      return (
        this.crypto.decrypt(
          credential.encryptedApiKey,
          credential.encryptionIv,
          credential.encryptionTag,
        ) === apiKey
      );
    } catch {
      return false;
    }
  }

  private isCredentialCoolingDown(id: string): boolean {
    const unavailableUntil = this.credentialCooldowns.get(id);
    if (!unavailableUntil) return false;
    if (unavailableUntil > Date.now()) return true;
    this.credentialCooldowns.delete(id);
    return false;
  }

  private cooldownCredential(id: string, message: string): number {
    const authOrQuotaFailure =
      /provider returned (401|402|403|429)/i.test(message) ||
      /api key|unauthorized|permission denied|quota|rate limit|resource_exhausted|insufficient balance/i.test(
        message,
      );
    const cooldownMs = authOrQuotaFailure
      ? this.positiveInt("AI_CREDENTIAL_FAILURE_COOLDOWN_MS", 10 * 60_000)
      : this.positiveInt("AI_CREDENTIAL_TRANSIENT_COOLDOWN_MS", 30_000);
    this.credentialCooldowns.set(id, Date.now() + cooldownMs);
    return cooldownMs;
  }

  private isCredentialFallbackFailure(message: string): boolean {
    return (
      /provider returned (401|402|403|404|429|5\d\d)/i.test(message) ||
      /api key|unauthorized|permission denied|quota|rate limit|resource_exhausted|insufficient balance|fetch failed|timed?\s*out|unavailable/i.test(
        message,
      )
    );
  }

  private safeCredentialName(name: string): string {
    return JSON.stringify(name.replace(/[\r\n]/g, " ").slice(0, 80));
  }

  private safeErrorMessage(message: string): string {
    return message
      .replace(/Bearer\s+\S+/gi, "Bearer [REDACTED]")
      .replace(/sk-(?:proj-)?[A-Za-z0-9_-]{12,}/g, "[REDACTED_OPENAI_KEY]")
      .replace(/AQ\.[A-Za-z0-9_-]{12,}/g, "[REDACTED_GEMINI_KEY]")
      .replace(/[\r\n]/g, " ")
      .slice(0, 160);
  }

  private async streamWithProtection(
    adapter: AiProviderAdapter,
    providerConfig: {
      apiKey: string;
      baseUrl?: string | null;
      model: string;
    },
    prompt: string,
    onToken: (token: string) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    const configuredTimeout = Number(
      this.config.get<string>("AI_PROVIDER_TIMEOUT_MS"),
    );
    const timeoutMs =
      Number.isSafeInteger(configuredTimeout) && configuredTimeout > 0
        ? configuredTimeout
        : 55_000;
    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    const combinedSignal = signal
      ? AbortSignal.any([signal, timeoutSignal])
      : timeoutSignal;

    try {
      await adapter.streamText(providerConfig, prompt, onToken, combinedSignal);
      this.consecutiveTransientFailures = 0;
      this.circuitOpenUntil = 0;
    } catch (error) {
      if (timeoutSignal.aborted && !signal?.aborted) {
        this.recordTransientFailure("provider timeout");
        throw new Error(`AI provider timed out after ${timeoutMs}ms`);
      }
      const message = error instanceof Error ? error.message : "unknown error";
      if (!signal?.aborted && this.isTransientProviderFailure(message)) {
        this.recordTransientFailure(message);
      }
      throw error;
    }
  }

  private recordTransientFailure(reason: string): void {
    this.consecutiveTransientFailures += 1;
    const threshold = this.positiveInt(
      "AI_CIRCUIT_BREAKER_FAILURE_THRESHOLD",
      5,
    );
    if (this.consecutiveTransientFailures < threshold) return;

    const cooldownMs = this.positiveInt(
      "AI_CIRCUIT_BREAKER_COOLDOWN_MS",
      30_000,
    );
    this.circuitOpenUntil = Date.now() + cooldownMs;
    this.logger.warn(
      `AI provider circuit opened for ${cooldownMs}ms after ${this.consecutiveTransientFailures} transient failures; lastError=${reason.slice(0, 160)}`,
    );
  }

  private isTransientProviderFailure(message: string): boolean {
    return (
      /provider returned (429|5\d\d)/i.test(message) ||
      /quota|rate limit|resource_exhausted|fetch failed|timed?\s*out|unavailable/i.test(
        message,
      )
    );
  }

  private positiveInt(name: string, fallback: number): number {
    const configured = Number(this.config.get<string>(name));
    return Number.isSafeInteger(configured) && configured > 0
      ? configured
      : fallback;
  }

  private assertAllowedBaseUrl(baseUrl?: string | null): void {
    if (!baseUrl) return;
    let parsed: URL;
    try {
      parsed = new URL(baseUrl);
    } catch {
      throw new BadRequestException("AI provider base URL is invalid");
    }

    const isProduction = this.config.get<string>("NODE_ENV") === "production";
    if (isProduction && parsed.protocol !== "https:") {
      throw new BadRequestException(
        "AI provider base URL must use HTTPS in production",
      );
    }

    const configuredHosts = (
      this.config.get<string>("AI_PROVIDER_ALLOWED_HOSTS") || ""
    )
      .split(",")
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean);
    const allowedHosts = new Set([
      "api.openai.com",
      "generativelanguage.googleapis.com",
      ...configuredHosts,
    ]);
    const isLocalDevelopment =
      !isProduction &&
      ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname.toLowerCase());
    if (
      !allowedHosts.has(parsed.hostname.toLowerCase()) &&
      !isLocalDevelopment
    ) {
      throw new BadRequestException(
        "AI provider host is not present in AI_PROVIDER_ALLOWED_HOSTS",
      );
    }
  }

  private async requireCredential(id: string): Promise<AiCredential> {
    const credential = await this.prisma.aiCredential.findUnique({
      where: { id },
    });
    if (!credential) throw new NotFoundException("AI credential not found");
    return credential;
  }
}
