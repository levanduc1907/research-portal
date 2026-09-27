import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { AiCredentialDto } from "@repo/contracts";
import { AiAdminGuard } from "./ai-admin.guard";
import {
  CreateAiCredentialRequest,
  UpdateAiCredentialRequest,
} from "./ai-credential.dto";
import { AiCredentialsService } from "./ai-credentials.service";

@ApiTags("AI credentials")
@UseGuards(AiAdminGuard)
@Controller("v1/admin/ai-credentials")
export class AiCredentialsController {
  constructor(private readonly credentials: AiCredentialsService) {}

  @Get()
  @ApiOperation({ summary: "List masked AI provider credentials" })
  findAll(): Promise<AiCredentialDto[]> {
    return this.credentials.findAll();
  }

  @Post()
  create(@Body() input: CreateAiCredentialRequest): Promise<AiCredentialDto> {
    return this.credentials.create(input);
  }

  @Patch(":id")
  update(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() input: UpdateAiCredentialRequest,
  ): Promise<AiCredentialDto> {
    return this.credentials.update(id, input);
  }

  @Post(":id/test")
  @HttpCode(200)
  test(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
  ): Promise<AiCredentialDto> {
    return this.credentials.test(id);
  }

  @Delete(":id")
  @HttpCode(204)
  async remove(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
  ): Promise<void> {
    await this.credentials.remove(id);
  }
}
