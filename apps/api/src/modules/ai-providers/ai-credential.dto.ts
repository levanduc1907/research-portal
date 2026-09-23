import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MinLength,
} from "class-validator";

const PROVIDERS = ["OPENAI", "GEMINI", "OPENAI_COMPATIBLE"] as const;

export class CreateAiCredentialRequest {
  @IsString() @IsNotEmpty() name!: string;
  @IsIn(PROVIDERS) provider!: (typeof PROVIDERS)[number];
  @IsString() @MinLength(8) apiKey!: string;
  @IsOptional() @IsUrl({ require_tld: false }) baseUrl?: string;
  @IsString() @IsNotEmpty() defaultModel!: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsBoolean() isDefault?: boolean;
}

export class UpdateAiCredentialRequest {
  @IsOptional() @IsString() @IsNotEmpty() name?: string;
  @IsOptional() @IsString() @MinLength(8) apiKey?: string;
  @IsOptional() @IsUrl({ require_tld: false }) baseUrl?: string | null;
  @IsOptional() @IsString() @IsNotEmpty() defaultModel?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsBoolean() isDefault?: boolean;
}
