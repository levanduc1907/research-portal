import { Injectable, NotFoundException } from "@nestjs/common";
import type { AiCredentialDto, AiProvider } from "@repo/contracts";
import type { AiCredential } from "@repo/database";
import { PrismaService } from "../database/prisma.service";
import { AiAdapterRegistry } from "./ai-adapter.registry";
import { CredentialCryptoService } from "./credential-crypto.service";
import type {
  CreateAiCredentialRequest,
  UpdateAiCredentialRequest,
} from "./ai-credential.dto";

@Injectable()
export class AiCredentialsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CredentialCryptoService,
    private readonly adapters: AiAdapterRegistry,
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
      orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
    });
    return items.map((item) => this.toDto(item));
  }

  async create(input: CreateAiCredentialRequest): Promise<AiCredentialDto> {
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
    await this.requireCredential(id);
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
  ): Promise<boolean> {
    const credential = await this.prisma.aiCredential.findFirst({
      where: { isDefault: true, isActive: true },
      orderBy: { updatedAt: "desc" },
    });
    if (!credential) return false;
    await this.adapters.get(credential.provider as AiProvider).streamText(
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
      onToken,
      signal,
    );
    return true;
  }

  private async requireCredential(id: string): Promise<AiCredential> {
    const credential = await this.prisma.aiCredential.findUnique({
      where: { id },
    });
    if (!credential) throw new NotFoundException("AI credential not found");
    return credential;
  }
}
